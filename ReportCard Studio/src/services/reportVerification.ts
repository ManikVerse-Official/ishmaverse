import type { Student } from '../types';
import type { ReportCardModel } from './reportCardModel';
import { computePercentage } from './calculationEngine';

/**
 * Data-safety gate that runs before a PDF is written.
 *
 * Rule of the product: never print incorrect student data. Every generated PDF
 * is validated against the student record it claims to represent — identity
 * fields, subject marks, the grand total and the percentage. Errors abort the
 * file for that student (the batch keeps running and reports the reason);
 * warnings are recorded but do not block printing.
 */

export interface VerificationIssue {
  severity: 'error' | 'warning';
  type: string;
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  errors: VerificationIssue[];
  warnings: VerificationIssue[];
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = text(value).replace(/[^0-9.\-]/g, '');
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

const INFO_LABELS = {
  name: "Student's Name",
  father: "Father's Name",
  mother: "Mother's Name",
  classSection: 'Class & Section',
  rollNo: 'Roll No.',
  dob: 'Date of Birth',
  admissionNo: 'Admission No.',
} as const;

export function verifyReportCardModel(
  student: Student,
  model: ReportCardModel,
  options: { photoAttached?: boolean } = {},
): VerificationResult {
  const errors: VerificationIssue[] = [];
  const warnings: VerificationIssue[] = [];

  const add = (
    severity: VerificationIssue['severity'],
    type: string,
    message: string,
  ) => {
    (severity === 'error' ? errors : warnings).push({ severity, type, message });
  };

  const infoValue = (label: string): string => {
    const row =
      model.infoLeft.find((item) => item.label === label) ??
      model.infoRight.find((item) => item.label === label);
    return text(row?.value);
  };

  /* ── Identity: the card must belong to exactly this student ─────────── */
  const cardName = infoValue(INFO_LABELS.name);
  if (!text(student.name)) {
    add('error', 'missing_student_name', 'Student record has no name.');
  } else if (cardName !== text(student.name)) {
    add(
      'error',
      'name_mismatch',
      `Report card name "${cardName}" does not match the student record "${student.name}".`,
    );
  }

  const cardRoll = infoValue(INFO_LABELS.rollNo);
  if (text(student.rollNo) && cardRoll !== text(student.rollNo)) {
    add(
      'error',
      'roll_mismatch',
      `Report card roll no "${cardRoll}" does not match the student record "${student.rollNo}".`,
    );
  }

  const expectedClassSection = [student.class, student.section]
    .filter((part) => text(part) !== '')
    .join(' - ');
  const cardClassSection = infoValue(INFO_LABELS.classSection);
  if (expectedClassSection && cardClassSection !== expectedClassSection) {
    add(
      'error',
      'class_mismatch',
      `Class/Section "${cardClassSection}" does not match the student record "${expectedClassSection}".`,
    );
  }

  const optionalFields: [string, string | undefined][] = [
    [INFO_LABELS.father, student.fatherName],
    [INFO_LABELS.mother, student.motherName],
    [INFO_LABELS.dob, student.dob],
    [INFO_LABELS.admissionNo, student.admissionNo],
  ];
  for (const [label, expected] of optionalFields) {
    const want = text(expected);
    if (!want) continue;
    const got = infoValue(label);
    if (got !== want) {
      add(
        'error',
        'field_mismatch',
        `${label}: printed "${got}" but the student record says "${want}".`,
      );
    }
  }

  /* ── Academic rows: every subject must be present with its real marks ── */
  const subjectRows = model.academic.filter((row) => !row.isGrandTotal);
  const academicSubjects = student.subjects.filter((subject) => subject.maxMarks !== 0);

  if (subjectRows.length !== academicSubjects.length) {
    add(
      'error',
      'subject_count_mismatch',
      `Academic table has ${subjectRows.length} rows but the student has ${academicSubjects.length} subjects.`,
    );
  }

  for (const row of subjectRows) {
    const subject = academicSubjects.find((item) => text(item.name) === text(row.name));
    if (!subject) {
      add(
        'error',
        'unknown_subject_row',
        `Academic row "${row.name}" does not match any subject of this student.`,
      );
      continue;
    }

    const expectedMarks = subject.marks;
    const printedMarks = numeric(row.marks);
    if (expectedMarks === null || subject.status !== 'present') {
      if (printedMarks !== null) {
        add(
          'error',
          'marks_mismatch',
          `${subject.name}: printed marks ${printedMarks} but the workbook has no numeric marks (${subject.status}).`,
        );
      }
    } else if (printedMarks === null || Math.abs(printedMarks - expectedMarks) > 0.001) {
      add(
        'error',
        'marks_mismatch',
        `${subject.name}: printed marks "${row.marks}" do not match the workbook value "${expectedMarks}".`,
      );
    }

    const printedMax = numeric(row.maxMarks);
    if (printedMax !== null && printedMax !== subject.maxMarks) {
      add(
        'error',
        'max_marks_mismatch',
        `${subject.name}: printed maximum ${printedMax} does not match the configured ${subject.maxMarks}.`,
      );
    }
  }

  /* ── Grand total + percentage must be arithmetically sound ──────────── */
  const grandRow = model.academic.find((row) => row.isGrandTotal);
  if (!grandRow) {
    add('error', 'missing_grand_total', 'Academic table has no GRAND TOTAL row.');
  } else {
    const printedTotal = numeric(grandRow.marks);
    const printedMax = numeric(grandRow.maxMarks);

    const sumOfSubjectMarks = academicSubjects.reduce((sum, subject) => {
      if (subject.status !== 'present' || subject.marks === null) return sum;
      return sum + subject.marks;
    }, 0);
    const sumOfSubjectMax = academicSubjects.reduce((sum, subject) => {
      if (subject.status !== 'present') return sum;
      return sum + subject.maxMarks;
    }, 0);

    if (printedTotal !== null && model.totals.excelTotalProvided) {
      if (Math.abs(printedTotal - sumOfSubjectMarks) > 0.001) {
        add(
          'warning',
          'excel_total_differs',
          `Excel grand total ${printedTotal} differs from the sum of subject totals ${sumOfSubjectMarks}; the Excel total is printed.`,
        );
      }
    } else if (
      printedTotal !== null &&
      Math.abs(printedTotal - sumOfSubjectMarks) > 0.001
    ) {
      add(
        'error',
        'grand_total_mismatch',
        `Grand total ${printedTotal} does not equal the sum of subject totals ${sumOfSubjectMarks}.`,
      );
    }

    if (
      printedMax !== null &&
      model.totals.max > 0 &&
      Math.abs(printedMax - model.totals.max) > 0.001
    ) {
      add(
        'error',
        'grand_total_max_mismatch',
        `Grand total maximum ${printedMax} does not equal the computed maximum ${model.totals.max}.`,
      );
    }

    /* Percentage = obtained / maximum × 100, using the *displayed* numbers. */
    if (printedTotal !== null && printedMax !== null && printedMax > 0) {
      const expectedPct = computePercentage(printedTotal, printedMax);
      const printedPct = model.totals.percentage;
      if (printedPct !== null && expectedPct !== null) {
        const tolerance = model.totals.excelPercentageProvided ? 1.5 : 0.05;
        if (Math.abs(printedPct - expectedPct) > tolerance) {
          add(
            model.totals.excelPercentageProvided ? 'warning' : 'error',
            'percentage_mismatch',
            `Percentage ${printedPct}% does not match ${printedTotal}/${printedMax} = ${expectedPct}%.`,
          );
        }
      }
    } else if (sumOfSubjectMax !== 0 && printedTotal === null) {
      add('error', 'missing_grand_total', 'Grand total value could not be read.');
    }
  }

  /* ── Assessment stars must be within the configured scale ───────────── */
  const maxStars = model.assessment?.maxStars ?? 5;
  for (const row of [
    ...model.personality,
    ...model.learning,
    ...model.coScholastic,
  ]) {
    const stars = row.stars ?? 0;
    if (!Number.isFinite(stars) || stars < 0 || stars > maxStars) {
      add(
        'error',
        'invalid_stars',
        `Row "${row.name}" has ${stars} stars; the scale allows 0-${maxStars}.`,
      );
    }
    if (row.value === undefined && row.stars === undefined) {
      add('warning', 'empty_assessment_row', `Row "${row.name}" has no assessment value.`);
    }
  }

  /* ── Photo / remarks sanity ─────────────────────────────────────────── */
  if (options.photoAttached && !student.photoFilename && !student.rollNo) {
    add('warning', 'photo_unverifiable', 'A photo was attached without any identifying data.');
  }

  if (!text(model.teacherRemarks)) {
    add('warning', 'empty_teacher_remarks', "Teacher's remarks are empty.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Compact one-line summary used in per-student failure reports. */
export function formatVerificationErrors(result: VerificationResult): string {
  if (result.errors.length === 0) return '';
  return result.errors.map((issue) => issue.message).join(' ');
}
