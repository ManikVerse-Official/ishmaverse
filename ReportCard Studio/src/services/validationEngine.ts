import type {
  Student,
  ValidationIssue,
  ValidationResult,
} from '../types';

export function validateStudents(students: Student[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rollSeen = new Map<string, string[]>();

  for (const s of students) {
    const ctx: Pick<ValidationIssue, 'studentId' | 'rowNumber'> = {
      studentId: s.studentId,
      rowNumber: s.rowNumber,
    };

    if (!s.name || !s.name.trim()) {
      issues.push({
        ...ctx,
        severity: 'error',
        type: 'missing_name',
        message: 'Student name is missing.',
        field: 'name',
      });
    }

    if (!s.rollNo || !String(s.rollNo).trim()) {
      issues.push({
        ...ctx,
        severity: 'error',
        type: 'missing_roll',
        message: 'Roll number is missing.',
        field: 'rollNo',
      });
    } else {
      const key = `${s.class ?? ''}__${s.section ?? ''}__${String(s.rollNo).trim()}`;
      const existing = rollSeen.get(key) ?? [];
      existing.push(s.studentId);
      rollSeen.set(key, existing);
    }

    if (!s.class || !String(s.class).trim()) {
      issues.push({
        ...ctx,
        severity: 'warning',
        type: 'missing_class',
        message: 'Class is missing; default value will be used.',
        field: 'class',
      });
    }

    for (const sub of s.subjects) {
      if (sub.status === 'present') {
        if (sub.marks === null) {
          issues.push({
            ...ctx,
            severity: 'error',
            type: 'missing_marks',
            message: `${sub.name} marks missing.`,
            field: `subject.${sub.name}`,
          });
        } else if (sub.marks < 0) {
          issues.push({
            ...ctx,
            severity: 'error',
            type: 'invalid_marks_negative',
            message: `${sub.name} marks ${sub.marks} are negative.`,
            field: `subject.${sub.name}`,
          });
        } else if (sub.marks > sub.maxMarks) {
          issues.push({
            ...ctx,
            severity: 'error',
            type: 'marks_exceed_max',
            message: `${sub.name} marks ${sub.marks} exceed maximum ${sub.maxMarks}.`,
            field: `subject.${sub.name}`,
          });
        }
      }
    }

    if (s.attendance) {
      const a = String(s.attendance).replace('%', '').trim();
      const n = Number(a);
      if (a !== '' && (!Number.isFinite(n) || n < 0 || n > 100)) {
        issues.push({
          ...ctx,
          severity: 'warning',
          type: 'invalid_attendance',
          message: `Attendance "${s.attendance}" is malformed.`,
          field: 'attendance',
        });
      }
    }
  }

  for (const [key, ids] of rollSeen.entries()) {
    if (ids.length > 1) {
      const [cls, sec, roll] = key.split('__');
      for (const id of ids) {
        const st = students.find((x) => x.studentId === id);
        if (!st) continue;
        issues.push({
          studentId: st.studentId,
          rowNumber: st.rowNumber,
          severity: 'error',
          type: 'duplicate_roll',
          message: `Roll number ${roll}${cls ? ` in Class ${cls}` : ''}${sec ? ` - Section ${sec}` : ''} is duplicated.`,
          field: 'rollNo',
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

export function getIssuesForStudent(
  validation: ValidationResult | null,
  studentId: string,
): ValidationIssue[] {
  if (!validation) return [];
  return validation.issues.filter((i) => i.studentId === studentId);
}
