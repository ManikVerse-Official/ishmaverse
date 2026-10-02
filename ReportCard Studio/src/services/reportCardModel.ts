import type { SchoolProfile, Student } from '../types';
import {
  computeTotals,
  coScholasticGradeFields,
  overallPerformanceLabel,
  remarkFromPercent,
  type SubjectSummary,
} from './calculationEngine';
import {
  DEFAULT_GRADING_BANDS,
  bandsLegend,
  normalizeGradingBands,
  type GradingBand,
} from './gradingEngine';
import {
  DEFAULT_ASSESSMENT_CONFIG,
  buildPerformanceProfile,
  gradeLabelForStars,
  rateSkill,
  type AssessmentConfig,
  type SkillSource,
} from './assessmentEngine';
import { buildRemarkContext, generatePrincipalRemark, generateTeacherRemark } from './remarksEngine';
import { getTheme } from '../themes';

/**
 * A single source of truth for the report card.
 *
 * Both the on-screen preview and the generated PDF consume this model, so the
 * two never drift apart. Every value is either derived from the uploaded Excel
 * data or from the user's School Profile — nothing is school-specific here, and
 * nothing is ever invented: missing data is printed as a placeholder instead.
 */

export interface ReportCardRow {
  name: string;
  value?: string;
  stars?: number;
  /** Where the assessment value came from (Excel wins over computed). */
  source?: SkillSource;
}

export interface AcademicRow {
  name: string;
  maxMarks: number | string;
  marks: number | string;
  grade: string;
  remark: string;
  isGrandTotal?: boolean;
  /** Index into `student.subjects` for the row (absent for GRAND TOTAL). */
  subjectIndex?: number;
  gradeFromExcel?: boolean;
}

export interface ReportCardTotals {
  obtained: number;
  max: number;
  percentage: number | null;
  grade: string;
  excelTotalProvided: boolean;
  excelPercentageProvided: boolean;
}

export interface ReportCardModel {
  themeId: string;
  title: string;
  header: {
    schoolName: string;
    address: string;
    affiliationText: string;
    schoolCode: string;
    affiliationNo: string;
    academicSession: string;
    logoDataUrl?: string;
    tagline: string;
  };
  infoLeft: { label: string; value: string }[];
  infoRight: { label: string; value: string }[];
  academic: AcademicRow[];
  gradeScale: string;
  coScholastic: ReportCardRow[];
  personality: ReportCardRow[];
  learning: ReportCardRow[];
  attendance: { workingDays: string; present: string; percentage: string };
  overallPerformance: string;
  teacherRemarks: string;
  principalRemarks: string;
  /** True when the printed remarks came from the workbook, not from the engine. */
  remarksFromExcel: boolean;
  signatures: {
    teacherName: string;
    checkedByName: string;
    principalName: string;
  };
  totals: ReportCardTotals;
  assessment: { maxStars: number; computedRows: number; excelRows: number };
}

/**
 * Fallback skill names used only when the workbook does not carry its own
 * assessment areas. They are generic (not school-specific); the star ratings
 * for them are always computed from the student's performance.
 */
const DEFAULT_LEARNING: string[] = [
  'Understanding',
  'Application',
  'Analytical Thinking',
  'Creativity',
  'Independence',
];

const DEFAULT_PERSONALITY: string[] = [
  'Confidence',
  'Communication Skills',
  'Leadership Qualities',
  'Emotional Balance',
  'Attitude',
];

const DEFAULT_CO_SCHOLASTIC: string[] = [
  'Work Education',
  'Art Education',
  'Health & Physical Education',
  'Discipline',
  'Value Education',
  'Life Skills',
];

function resolveBands(school: SchoolProfile): GradingBand[] {
  return normalizeGradingBands(school.gradingBands ?? DEFAULT_GRADING_BANDS);
}

function resolveAssessmentConfig(school: SchoolProfile): AssessmentConfig {
  const configured = (school as SchoolProfile & { assessmentConfig?: Partial<AssessmentConfig> })
    .assessmentConfig;
  return { ...DEFAULT_ASSESSMENT_CONFIG, ...(configured ?? {}) };
}

/**
 * Rows for a skill block.
 *
 * Excel values (grades / stars / numbers) are preserved. Rows without an Excel
 * value are rated from the student's own performance and receive a grade label
 * derived from the same rating, so the legend on the card stays truthful.
 */
function buildSkillRows(
  excelValues: Record<string, string> | undefined,
  defaultNames: string[],
  profile: ReturnType<typeof buildPerformanceProfile>,
  bands: GradingBand[],
  config: AssessmentConfig,
): { rows: ReportCardRow[]; computed: number; excel: number } {
  const hasExcel = excelValues && Object.keys(excelValues).length > 0;
  let computed = 0;
  let excel = 0;

  const rows: ReportCardRow[] = hasExcel
    ? Object.entries(excelValues!).map(([name, value]) => {
        const rating = rateSkill(name, profile, value, config);
        if (rating.source === 'excel') excel++;
        else computed++;
        return {
          name: rating.name,
          value: rating.value ?? value,
          stars: rating.stars,
          source: rating.source,
        };
      })
    : defaultNames.map((name) => {
        const rating = rateSkill(name, profile, undefined, config);
        computed++;
        return {
          name: rating.name,
          value:
            rating.source === 'computed'
              ? gradeLabelForStars(rating.stars, bands, config)
              : undefined,
          stars: rating.stars,
          source: rating.source,
        };
      });

  return { rows, computed, excel };
}

export function buildReportCardModel(
  student: Student,
  school: SchoolProfile,
): ReportCardModel {
  const theme = getTheme(school.reportTheme);
  const bands = resolveBands(school);
  const assessmentConfig = resolveAssessmentConfig(school);

  const totals = computeTotals(student, { bands });
  const profile = buildPerformanceProfile(student, bands);

  /* ── Academic rows: marks exactly as the workbook holds them ─────────── */
  const academic: AcademicRow[] = [];
  totals.gradedSubjects.forEach((summary: SubjectSummary, index: number) => {
    /* Grade-only columns are not academic subjects. */
    if (summary.maxMarks === 0) return;
    academic.push({
      name: summary.name,
      maxMarks: summary.maxMarks || '—',
      marks:
        summary.status === 'present'
          ? summary.marks !== null
            ? summary.marks
            : '—'
          : summary.status.toUpperCase(),
      grade: summary.grade,
      remark: summary.remark,
      subjectIndex: index,
      gradeFromExcel: summary.gradeFromExcel,
    });
  });

  academic.push({
    name: 'GRAND TOTAL',
    maxMarks: totals.totalMax || '—',
    marks: totals.totalMarks,
    grade: totals.percentage !== null ? totals.overallGrade : '—',
    remark: remarkFromPercent(totals.percentage, bands),
    isGrandTotal: true,
  });

  const classSection = [student.class, student.section]
    .filter((part) => part && String(part).trim())
    .join(' - ');

  /* ── Assessment blocks ──────────────────────────────────────────────── */
  const coScholasticExcel = coScholasticGradeFields(student);
  const excelCoMap: Record<string, string> = {};
  for (const field of coScholasticExcel) excelCoMap[field.name] = field.value;

  const learning = buildSkillRows(
    student.learningSkills,
    DEFAULT_LEARNING,
    profile,
    bands,
    assessmentConfig,
  );
  const personality = buildSkillRows(
    student.personalityDev,
    DEFAULT_PERSONALITY,
    profile,
    bands,
    assessmentConfig,
  );
  const coScholastic = buildSkillRows(
    Object.keys(excelCoMap).length > 0 ? excelCoMap : undefined,
    DEFAULT_CO_SCHOLASTIC,
    profile,
    bands,
    assessmentConfig,
  );

  /* ── Remarks: workbook first, generated only as a fallback ──────────── */
  const remarkContext = buildRemarkContext(student, bands);
  const teacherFromExcel = String(student.teacherRemarks ?? '').trim();
  const principalFromExcel = String(student.principalRemarks ?? '').trim();

  const teacherRemarks =
    teacherFromExcel ||
    (Object.keys(remarkContext.subjects).length > 0 || remarkContext.percentage !== null
      ? generateTeacherRemark(remarkContext)
      : '');
  const principalRemarks =
    principalFromExcel ||
    (remarkContext.percentage !== null ? generatePrincipalRemark(remarkContext) : '');

  const percentage = totals.percentage;
  const performancePct =
    percentage !== null && Number.isFinite(percentage) ? percentage : null;

  return {
    themeId: theme.id,
    title: theme.title,
    header: {
      schoolName: school.schoolName,
      address: school.address,
      affiliationText: school.affiliationText || '',
      schoolCode: school.schoolCode || '',
      affiliationNo: school.affiliationNo || '',
      academicSession: school.academicSession,
      logoDataUrl: school.logoDataUrl,
      tagline: school.tagline || '',
    },
    infoLeft: [
      { label: "Student's Name", value: student.name },
      { label: "Father's Name", value: student.fatherName || '' },
      { label: "Mother's Name", value: student.motherName || '' },
      { label: 'Class & Section', value: classSection },
      { label: 'Roll No.', value: student.rollNo },
    ],
    infoRight: [
      { label: 'Date of Birth', value: student.dob || '' },
      { label: 'Admission No.', value: student.admissionNo || '' },
      { label: 'Attendance', value: student.attendance || '' },
      { label: 'Examination', value: school.examTerm || '' },
      { label: 'Date of Issue', value: school.dateOfIssue || '' },
    ],
    academic,
    gradeScale: (school.gradingScale || '').trim() || bandsLegend(bands),
    coScholastic: coScholastic.rows,
    personality: personality.rows,
    learning: learning.rows,
    attendance: {
      workingDays: student.workingDays || '',
      present: student.daysPresent || '',
      percentage: student.attendance || '',
    },
    overallPerformance:
      performancePct !== null
        ? overallPerformanceLabel(performancePct)
        : totals.overallGrade,
    teacherRemarks,
    principalRemarks,
    remarksFromExcel: Boolean(teacherFromExcel || principalFromExcel),
    signatures: {
      teacherName: school.teacherName,
      checkedByName: school.checkedByName || '',
      principalName: school.principalName,
    },
    totals: {
      obtained: totals.totalMarks,
      max: totals.totalMax,
      percentage: totals.percentage,
      grade: totals.overallGrade,
      excelTotalProvided: totals.excelTotal !== undefined,
      excelPercentageProvided: totals.percentageSource === 'excel',
    },
    assessment: {
      maxStars: assessmentConfig.maxStars,
      computedRows: learning.computed + personality.computed + coScholastic.computed,
      excelRows: learning.excel + personality.excel + coScholastic.excel,
    },
  };
}
