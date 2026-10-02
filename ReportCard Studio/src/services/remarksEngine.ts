import type { Student } from '../types';
import { computeTotals } from './calculationEngine';
import type { GradingBand } from './gradingEngine';

/**
 * Remarks engine.
 *
 * Remarks are generated from the student's real performance, never from a fixed
 * string printed on every report card:
 *
 *   - the wording varies by performance band (excellent → needs improvement);
 *   - inside a band the sentence template is picked with a deterministic hash
 *     of the student id, so two students with the same marks do not receive a
 *     byte-identical remark;
 *   - the strength / focus subjects and the attendance note are read from the
 *     student's own row, so nothing is invented.
 *
 * Teacher remarks already present in the workbook always take priority — this
 * module is only used as a fallback.
 */

export interface RemarkContext {
  /** Used to vary the wording between students deterministically. */
  seedKey: string;
  /** Overall percentage (0-100) or null. */
  percentage: number | null;
  /** Per-subject performance used for the strength / focus clauses. */
  subjects: { name: string; percentage: number | null }[];
  /** Attendance percentage (0-100) or null when the workbook has none. */
  attendancePercentage: number | null;
}

export interface RemarksConfig {
  /** Longest remark that will be produced (report card space guard). */
  maxLength: number;
}

export const DEFAULT_REMARKS_CONFIG: RemarksConfig = { maxLength: 320 };

type Band = 'outstanding' | 'veryGood' | 'good' | 'satisfactory' | 'needsImprovement' | 'unknown';

function bandFor(percentage: number | null): Band {
  if (percentage === null || !Number.isFinite(percentage)) return 'unknown';
  if (percentage >= 91) return 'outstanding';
  if (percentage >= 81) return 'veryGood';
  if (percentage >= 71) return 'good';
  if (percentage >= 55) return 'satisfactory';
  return 'needsImprovement';
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** One opening sentence per band — several choices so wording varies. */
const OPENERS: Record<Band, string[]> = {
  outstanding: [
    'An outstanding performance in this examination.',
    'The result is excellent and reflects genuine dedication.',
    'A remarkable academic performance with consistently high scores.',
    'Excellent work throughout the term.',
  ],
  veryGood: [
    'A very good performance in this examination.',
    'The result is strong and clearly above the class average.',
    'A confident, well-rounded academic performance.',
    'Good, sustained effort has produced a very good result.',
  ],
  good: [
    'A good performance overall.',
    'The result is steady and shows regular progress.',
    'A satisfactory-to-good performance this term.',
    'The student has worked steadily and the result is encouraging.',
  ],
  satisfactory: [
    'A satisfactory performance overall.',
    'The result is average and can be improved with more practice.',
    'The student shows potential but needs to work more consistently.',
    'A fair performance that has scope for improvement.',
  ],
  needsImprovement: [
    'The performance is below the expected level.',
    'This result needs focused improvement.',
    'The student requires additional support and regular practice.',
    'The performance can improve considerably with consistent effort.',
  ],
  unknown: [
    'Assessment will be shared once the marks are complete.',
    'Remarks will be updated after the marks are finalised.',
  ],
};

const STRENGTH_CLAUSES = [
  'Performance in {subject} ({pct}%) stands out.',
  '{subject} is a clear strength ({pct}%).',
  'The student shows particular strength in {subject} ({pct}%).',
];

const FOCUS_CLAUSES = [
  'More practice is needed in {subject} ({pct}%).',
  'Special attention to {subject} ({pct}%) will help improve the result.',
  '{subject} ({pct}%) needs regular revision.',
];

const ATTENDANCE_GOOD = [
  'Attendance of {pct}% has supported this result.',
  'Regular attendance ({pct}%) is appreciated.',
];

const ATTENDANCE_LOW = [
  'Improved attendance (currently {pct}%) will help.',
  'Regular attendance (currently {pct}%) is strongly advised.',
];

const CLOSERS: Record<Band, string[]> = {
  outstanding: [
    'Keep up this excellent standard.',
    'Maintain the same focus in the coming terms.',
    'Continue to aim this high.',
  ],
  veryGood: [
    'With a little more effort, the top band is within reach.',
    'Keep building on this strong foundation.',
    'Sustained effort will push the result higher.',
  ],
  good: [
    'Regular revision will help reach the next band.',
    'A little more consistency will lift the score further.',
  ],
  satisfactory: [
    'Daily practice and timely revision are recommended.',
    'Setting weekly targets will improve the result.',
  ],
  needsImprovement: [
    'Parents are requested to support a regular study routine.',
    'Extra practice and doubt-clearing sessions are advised.',
  ],
  unknown: [''],
};

const PRINCIPAL_OPENERS: Record<Band, string[]> = {
  outstanding: [
    'Congratulations on an excellent result.',
    'A proud result — well done.',
  ],
  veryGood: [
    'A very good result. Keep it up.',
    'Strong performance — continue the good work.',
  ],
  good: [
    'A good result. Aim higher next term.',
    'Satisfactory progress — keep working steadily.',
  ],
  satisfactory: [
    'Work consistently to improve further.',
    'This result can definitely be improved.',
  ],
  needsImprovement: [
    'Regular study and support are needed for better results.',
    'Focused effort is required to improve this result.',
  ],
  unknown: ['Results will be reviewed once all marks are complete.'],
};

function pick<T>(list: T[], key: string): T {
  return list[hashString(key) % list.length];
}

function fill(template: string, subject: string, pct: number | null): string {
  return template
    .replace('{subject}', subject)
    .replace('{pct}', pct === null ? '—' : String(Math.round(pct)));
}

/** Subject the student scored best / worst in — only meaningful ones are used. */
function strengthAndFocus(
  subjects: { name: string; percentage: number | null }[],
): { strength?: { name: string; pct: number }; focus?: { name: string; pct: number } } {
  const ranked = subjects
    .filter((s) => s.percentage !== null && Number.isFinite(s.percentage as number))
    .map((s) => ({ name: s.name, pct: s.percentage as number }));
  if (ranked.length === 0) return {};

  const sorted = [...ranked].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return {
    strength: best.pct >= 60 ? best : undefined,
    focus: worst.pct < 75 && worst.name !== best.name ? worst : undefined,
  };
}

export function generateTeacherRemark(
  ctx: RemarkContext,
  config: RemarksConfig = DEFAULT_REMARKS_CONFIG,
): string {
  const band = bandFor(ctx.percentage);
  const { strength, focus } = strengthAndFocus(ctx.subjects);

  const parts: string[] = [pick(OPENERS[band], `${ctx.seedKey}|teacher|open|${band}`)];

  if (strength) {
    parts.push(
      fill(
        pick(STRENGTH_CLAUSES, `${ctx.seedKey}|strength|${strength.name}`),
        strength.name,
        strength.pct,
      ),
    );
  }

  if (focus) {
    parts.push(
      fill(
        pick(FOCUS_CLAUSES, `${ctx.seedKey}|focus|${focus.name}`),
        focus.name,
        focus.pct,
      ),
    );
  }

  if (ctx.attendancePercentage !== null && Number.isFinite(ctx.attendancePercentage)) {
    const attendancePct = Math.round(ctx.attendancePercentage);
    const pool = attendancePct >= 85 ? ATTENDANCE_GOOD : ATTENDANCE_LOW;
    parts.push(
      fill(pick(pool, `${ctx.seedKey}|attendance`), '', attendancePct),
    );
  }

  const closer = pick(CLOSERS[band], `${ctx.seedKey}|closer|${band}`);
  if (closer) parts.push(closer);

  return clampLength(parts.join(' '), config.maxLength);
}

export function generatePrincipalRemark(
  ctx: RemarkContext,
  config: RemarksConfig = DEFAULT_REMARKS_CONFIG,
): string {
  const band = bandFor(ctx.percentage);
  const opener = pick(PRINCIPAL_OPENERS[band], `${ctx.seedKey}|principal|${band}`);
  const { focus } = strengthAndFocus(ctx.subjects);
  const extra =
    band === 'outstanding' || band === 'veryGood'
      ? ''
      : focus
        ? ` Pay attention to ${focus.name}.`
        : '';

  return clampLength(`${opener}${extra}`, config.maxLength);
}

function clampLength(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Build the remark context from a normalised student record. */
export function buildRemarkContext(
  student: Student,
  bands?: GradingBand[] | null,
): RemarkContext {
  const totals = computeTotals(student, { bands });
  const attendanceRaw = String(student.attendance ?? '').replace(/[^0-9.]/g, '');
  const attendance = attendanceRaw ? Number(attendanceRaw) : NaN;

  return {
    seedKey: `${student.studentId}|${student.rollNo}|${student.name}`,
    percentage: totals.percentage,
    subjects: totals.gradedSubjects
      .filter((subject) => subject.maxMarks > 0)
      .map((subject) => ({ name: subject.name, percentage: subject.percentage })),
    attendancePercentage: Number.isFinite(attendance) ? attendance : null,
  };
}
