import type { Student } from '../types';
import {
  DEFAULT_GRADING_BANDS,
  percentFromGradeLabel,
  type GradingBand,
} from './gradingEngine';
import { computeTotals, resolveExcelGrades } from './calculationEngine';

/**
 * Assessment / stars engine.
 *
 * Stars are NEVER fixed to "5 for everyone" and they are never random. They are
 * derived from what the workbook actually says:
 *
 *   1. an assessment value supplied in Excel (star row, number, letter grade)
 *      is preserved as-is;
 *   2. otherwise the star rating is computed from the student's real
 *      performance — overall percentage, per-subject percentages (which may be
 *      out of 25 / 50 / 80 / 100), consistency across subjects and any
 *      Excel-provided grades.
 *
 * The computation is deterministic: the same student always receives the same
 * stars, while different students receive different stars. The per-skill weight
 * offsets are derived from a stable hash of the skill name, so two students
 * with the same overall percentage still see sensible variation between
 * (never within) their skill rows.
 *
 * Every knob lives in AssessmentConfig, so a school can plug in its own
 * assessment scale later without touching the report card code.
 */

export interface AssessmentConfig {
  /** Stars printed per skill row. */
  maxStars: number;
  /** Lowest star count for a student that has some academic data. */
  minStars: number;
  /** How far a single skill may deviate from the student's overall index. */
  weightSpread: number;
  /** Star rating awarded when a skill row carries no data at all. */
  emptyStars: number;
}

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  maxStars: 5,
  minStars: 1,
  weightSpread: 0.28,
  emptyStars: 0,
};

export interface PerformanceProfile {
  /** Overall percentage (0-100) or null when nothing is known. */
  percentage: number | null;
  /** Per-subject percentages, one per academic subject. */
  subjectPercentages: number[];
  /** Letter grades supplied by the workbook (used when marks are missing). */
  gradeLabels: string[];
  /** 0..1 — how evenly the student performs across subjects. */
  consistency: number;
  /** 0..1 — normalised performance used as the basis for every star row. */
  index: number | null;
}

export type SkillSource = 'excel' | 'computed' | 'none';

export interface SkillRating {
  name: string;
  /** Raw value from Excel, if the workbook provided one. */
  value?: string;
  stars: number;
  source: SkillSource;
}

/** Deterministic 32-bit string hash (FNV-1a). */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Stable weight for a skill name in [1 - spread, 1 + spread]. */
function skillWeight(skillName: string, spread: number): number {
  const bucket = hashString(skillName.trim().toLowerCase()) % 1000;
  const ratio = bucket / 999; // 0..1
  return 1 - spread + ratio * spread * 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Parse an Excel assessment value ("4", "4/5", "A", "★★★☆☆") into stars. */
export function starsFromAssessmentValue(
  value: unknown,
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  /* Star glyphs: filled vs total (★ / ☆). */
  const filled = (raw.match(/[★⭐]/g) ?? []).length;
  const hollow = (raw.match(/[☆]/g) ?? []).length;
  if (filled + hollow > 0) {
    const total = config.maxStars;
    if (filled === 0 && hollow > 0) return 0;
    const scaled = clamp(Math.round((filled / Math.max(filled + hollow, 1)) * total), 0, total);
    return scaled;
  }

  const numeric = raw.match(/^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?$/);
  if (numeric) {
    const obtained = Number(numeric[1]);
    const outOf = numeric[2] ? Number(numeric[2]) : null;
    if (!Number.isFinite(obtained)) return null;
    if (outOf && outOf > 0) {
      return clamp(Math.round((obtained / outOf) * config.maxStars), 0, config.maxStars);
    }
    if (obtained <= config.maxStars) return clamp(Math.round(obtained), 0, config.maxStars);
    if (obtained <= 100) {
      return clamp(Math.round((obtained / 100) * config.maxStars), 1, config.maxStars);
    }
    return null;
  }

  /* Anything else (A/A+/B/Good/Excellent) is treated as a letter rating. */
  const pct = percentFromGradeLabel(raw);
  if (pct === null) return null;
  return clamp(
    Math.round((pct / 100) * config.maxStars),
    1,
    config.maxStars,
  );
}

/** Build the performance profile used by every star row. */
export function buildPerformanceProfile(
  student: Student,
  bands?: GradingBand[] | null,
): PerformanceProfile {
  const totals = computeTotals(student, { bands });
  const subjectPercentages: number[] = [];
  const gradeLabels: string[] = [];

  for (const subject of totals.gradedSubjects) {
    if (subject.maxMarks === 0) continue;
    if (subject.percentage !== null && subject.status === 'present') {
      subjectPercentages.push(subject.percentage);
    } else if (subject.gradeFromExcel) {
      gradeLabels.push(subject.grade);
    }
  }

  const excelGrades = resolveExcelGrades(student);
  for (const grade of excelGrades.values()) {
    if (grade) gradeLabels.push(grade);
  }
  for (const field of student.gradeFields ?? []) {
    if (field.value) gradeLabels.push(field.value);
  }

  /* Overall percentage: Excel figure wins, else computed. */
  const percentage =
    totals.percentage ??
    (typeof student.overall?.percentage !== 'undefined'
      ? Number(student.overall.percentage)
      : null);

  let index: number | null = null;
  if (percentage !== null && Number.isFinite(percentage)) {
    index = clamp(percentage / 100, 0, 1);
  } else if (subjectPercentages.length > 0) {
    const mean =
      subjectPercentages.reduce((sum, value) => sum + value, 0) /
      subjectPercentages.length;
    index = clamp(mean / 100, 0, 1);
  } else if (gradeLabels.length > 0) {
    const pcts = gradeLabels
      .map((label) => percentFromGradeLabel(label))
      .filter((value): value is number => value !== null);
    if (pcts.length > 0) {
      index = clamp(
        pcts.reduce((sum, value) => sum + value, 0) / pcts.length / 100,
        0,
        1,
      );
    }
  }

  /* Consistency: low spread → close to 1, wide spread → close to 0.5. */
  let consistency = 1;
  if (subjectPercentages.length >= 3) {
    const mean =
      subjectPercentages.reduce((sum, value) => sum + value, 0) /
      subjectPercentages.length;
    const variance =
      subjectPercentages.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      subjectPercentages.length;
    const stdev = Math.sqrt(variance);
    consistency = clamp(1 - stdev / 60, 0.55, 1);
  }

  return {
    percentage: Number.isFinite(percentage as number) ? (percentage as number) : null,
    subjectPercentages,
    gradeLabels,
    consistency,
    index,
  };
}

/**
 * Star rating for one skill row.
 *
 * `excelValue` (when present) is authoritative — the workbook's own assessment
 * or grade is preserved instead of being replaced by a computed value.
 */
export function rateSkill(
  skillName: string,
  profile: PerformanceProfile,
  excelValue?: string,
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): SkillRating {
  const trimmedExcel = String(excelValue ?? '').trim();
  if (trimmedExcel) {
    const fromExcel = starsFromAssessmentValue(trimmedExcel, config);
    if (fromExcel !== null) {
      return {
        name: skillName,
        value: trimmedExcel,
        stars: fromExcel,
        source: 'excel',
      };
    }
    return { name: skillName, value: trimmedExcel, stars: config.emptyStars, source: 'excel' };
  }

  if (profile.index === null) {
    return { name: skillName, stars: config.emptyStars, source: 'none' };
  }

  const weight = skillWeight(skillName, config.weightSpread);
  const shaped = Math.pow(profile.index, 1.08) * weight * (0.9 + 0.1 * profile.consistency);
  const span = config.maxStars - config.minStars;
  const stars = clamp(
    config.minStars + Math.round(clamp(shaped, 0, 1) * span),
    config.minStars,
    config.maxStars,
  );

  return { name: skillName, stars, source: 'computed' };
}

/** Grade label for a computed star rating (keeps the co-scholastic legend honest). */
export function gradeLabelForStars(
  stars: number,
  bands?: GradingBand[] | null,
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): string {
  const scale = bands && bands.length > 0 ? bands : DEFAULT_GRADING_BANDS;
  const ratio = clamp(stars / config.maxStars, 0, 1);
  /* High stars → top band, low stars → bottom band. */
  const index = Math.min(scale.length - 1, Math.round((1 - ratio) * scale.length));
  return scale[clamp(index, 0, scale.length - 1)].grade;
}

export function rateSkills(
  rows: { name: string; value?: string }[],
  profile: PerformanceProfile,
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): SkillRating[] {
  return rows.map((row) => rateSkill(row.name, profile, row.value, config));
}
