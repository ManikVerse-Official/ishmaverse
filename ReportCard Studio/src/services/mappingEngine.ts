import type { ColumnMapping, FieldKey, ColumnMappingFieldKey } from '../types';
import {
  FIELD_ALIASES,
  canonicalizeSubjectName,
  looksLikeSubjectHeader,
  normalizeHeader,
  isKnownNonSubjectHeader,
  OVERALL_FIELD_SYNONYMS,
} from '../utils/normalization';

/**
 * mappingEngine
 *
 * Purpose:
 * - Map normal/simple Excel columns to internal student fields.
 * - Detect possible subject columns without hard-coding subject names.
 * - Never treat known overall/calculation columns as subjects.
 * - Keep duplicate subject component columns valid.
 *
 * IMPORTANT:
 * This engine intentionally maps PHYSICAL Excel columns.
 * Multi-row / merged subject grouping is handled by the dynamic
 * Excel structure engine.
 */

const REQUIRED_FIELDS: FieldKey[] = ['name', 'rollNo'];

/**
 * Columns which are normally NOT student subjects even when their
 * names contain words such as "total", "marks", "%" etc.
 *
 * These are generic structural terms, not actual subject names.
 */
const NON_SUBJECT_TERMS = [
  'total',
  'grand total',
  'overall total',
  'percentage',
  'percent',
  'percentile',
  'position',
  'rank',
  'result',
  'average',
  'avg',
  'aggregate',
  'overall',
  'remarks',
  'remark',
  'attendance',
  'present',
  'absent',
  'grade',
  'status',
];

/**
 * Component / assessment terms.
 *
 * A column such as:
 * English | PT
 * English | NB
 * English | SA1
 * English | TOTAL
 *
 * is still a subject-related column, but the actual grouping is
 * intentionally left to dynamicMappingEngine.
 */
const COMPONENT_TERMS = [
  'pt',
  'periodic test',
  'periodic assessment',
  'pa',
  'class test',
  'ct',
  'nb',
  'notebook',
  'notebook submission',
  'activity',
  'activities',
  'assignment',
  'project',
  'oral',
  'written',
  'practical',
  'theory',
  'internal',
  'external',
  'exam',
  'examination',
  'term',
  'sa',
  'sa1',
  'sa2',
  'fa',
  'ut',
  'unit test',
  'assessment',
  'test',
  'total',
];

/**
 * Grade-only fields.
 *
 * Examples:
 * GK -> A1
 * MV -> B1
 * DRAW -> A2
 *
 * These should not automatically be treated as numeric marks.
 */
const GRADE_TERMS = [
  'grade',
  'remark',
  'remarks',
  'status',
  'result',
];

/**
 * Map FIELD_ALIASES entries to the actual FieldKey used by the app.
 */
function mapAliasToFieldKey(aliasField: string): FieldKey | null {
  const mapping: Record<string, FieldKey> = {
    name: 'name',
    rollNo: 'rollNo',
    admissionNo: 'admissionNo',
    class: 'class',
    section: 'section',
    fatherName: 'fatherName',
    motherName: 'motherName',
    dob: 'dob',
    attendance: 'attendance',
    workingDays: 'workingDays',
    daysPresent: 'daysPresent',
    photoFilename: 'photoFilename',
    teacherRemarks: 'teacherRemarks',
    principalRemarks: 'principalRemarks',
    address: 'address',
    position: 'position',
  };

  return mapping[aliasField] ?? null;
}

/**
 * Returns true when the flattened header is clearly an overall/result
 * column and should NOT become a subject.
 */
function isOverallOrResultColumn(header: string): boolean {
  const normalized = normalizeHeader(header);

  if (!normalized) return false;

  // Exact structural fields.
  if (
    normalized === 'total' ||
    normalized === 'grand total' ||
    normalized === 'overall total' ||
    normalized === 'percentage' ||
    normalized === 'percent' ||
    normalized === 'position' ||
    normalized === 'rank'
  ) {
    return true;
  }

  // Avoid false positives such as "English Total".
  //
  // If a header contains a subject hierarchy and ends in TOTAL,
  // it is allowed to remain a subject column because dynamic
  // grouping can attach it to that subject.
  const parts = normalized.split(/\s*\|\s*/).filter(Boolean);

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];

    if (
      last === 'total' ||
      last === 'marks' ||
      last === 'max marks' ||
      last === 'maximum marks'
    ) {
      return false;
    }
  }

  // Standalone overall terms.
  return NON_SUBJECT_TERMS.some((term) => {
    if (normalized === term) return true;
    return normalized.startsWith(`${term} `);
  });
}

/**
 * Returns true if the column looks like a component of a subject.
 */
function looksLikeComponentHeader(header: string): boolean {
  const normalized = normalizeHeader(header);

  if (!normalized) return false;

  const parts = normalized
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return false;

  const lastPart = parts[parts.length - 1];

  return COMPONENT_TERMS.some(
    (term) =>
      lastPart === term ||
      lastPart.startsWith(`${term} `) ||
      lastPart.startsWith(`${term}-`) ||
      lastPart.startsWith(`${term}:`),
  );
}

/**
 * Detect whether the header is explicitly a grade-like field.
 */
function looksLikeGradeHeader(header: string): boolean {
  const normalized = normalizeHeader(header);

  if (!normalized) return false;

  const parts = normalized
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return false;

  return GRADE_TERMS.some((term) => {
    return parts.some(
      (part) =>
        part === term ||
        part.startsWith(`${term} `) ||
        part.startsWith(`${term}:`),
    );
  });
}

/**
 * Gets the most meaningful subject name from a flattened header.
 *
 * Examples:
 *
 * "School | English | PT"
 *        -> English
 *
 * "English | SA2"
 *        -> English
 *
 * "English"
 *        -> English
 *
 * No actual subject names are hard-coded.
 */
function inferSubjectName(header: string): string {
  const parts = header
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return canonicalizeSubjectName(header);
  }

  /**
   * Remove obvious school/title prefixes when there are multiple
   * hierarchy levels.
   *
   * We do NOT maintain a list of school names.
   * The first part is simply skipped only when there are enough
   * hierarchy levels and the remaining part clearly looks academic.
   */
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 2];

    if (
      candidate &&
      !isStructuralPart(candidate) &&
      !isComponentPart(candidate)
    ) {
      return canonicalizeSubjectName(candidate);
    }
  }

  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];

    if (isComponentPart(last) || isStructuralPart(last)) {
      return canonicalizeSubjectName(first);
    }

    return canonicalizeSubjectName(first);
  }

  return canonicalizeSubjectName(parts[0]);
}

function isStructuralPart(value: string): boolean {
  const normalized = normalizeHeader(value);

  return NON_SUBJECT_TERMS.some(
    (term) =>
      normalized === term ||
      normalized.startsWith(`${term} `) ||
      normalized.startsWith(`${term}:`),
  );
}

function isComponentPart(value: string): boolean {
  const normalized = normalizeHeader(value);

  return COMPONENT_TERMS.some(
    (term) =>
      normalized === term ||
      normalized.startsWith(`${term} `) ||
      normalized.startsWith(`${term}-`) ||
      normalized.startsWith(`${term}:`),
  );
}

/**
 * Infer maximum marks from the header.
 *
 * Supports examples such as:
 *   English (100)
 *   English [50]
 *   English Max 100
 *   English - 100
 *
 * Otherwise defaults to 100.
 */
function inferMaxMarks(column: string, normalized: string): number {
  const bracketMatch =
    column.match(/\(\s*(\d+(?:\.\d+)?)\s*\)/) ??
    column.match(/\[\s*(\d+(?:\.\d+)?)\s*\]/);

  if (bracketMatch) {
    const value = Number(bracketMatch[1]);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const maxMatch = normalized.match(
    /(?:^|\s)(?:max|max marks|maximum|maximum marks)\s*[:\-]?\s*(\d+(?:\.\d+)?)/,
  );

  if (maxMatch) {
    const value = Number(maxMatch[1]);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const trailingMatch = normalized.match(/(?:^|\s)(\d{1,3})\s*$/);

  if (trailingMatch) {
    const value = Number(trailingMatch[1]);

    if (Number.isFinite(value) && value > 0 && value <= 1000) {
      return value;
    }
  }

  return 100;
}

/**
 * Try to match a column against a known core student field.
 *
 * The matching order is:
 *   exact -> prefix -> safe substring
 *
 * This avoids mapping a random column just because it happens to
 * contain a short word.
 */
function findCoreField(
  column: string,
  assignedFields: Set<FieldKey>,
): FieldKey | null {
  const normalized = normalizeHeader(column);

  if (!normalized) return null;

  for (const aliasGroup of FIELD_ALIASES) {
    const field = mapAliasToFieldKey(aliasGroup.field);

    if (!field) continue;
    if (assignedFields.has(field)) continue;

    const aliases = aliasGroup.aliases
      .map((alias) => normalizeHeader(alias))
      .filter(Boolean);

    // 1. Exact match.
    if (aliases.some((alias) => alias === normalized)) {
      return field;
    }

    // 2. Prefix match.
    if (
      aliases.some(
        (alias) =>
          normalized.startsWith(`${alias} `) ||
          normalized.startsWith(`${alias}:`) ||
          normalized.startsWith(`${alias}-`),
      )
    ) {
      return field;
    }

    // 3. Safe substring match.
    //
    // Very short aliases are intentionally ignored here because
    // they can create false matches.
    if (
      aliases.some(
        (alias) =>
          alias.length >= 4 &&
          (normalized.includes(` ${alias} `) ||
            normalized.startsWith(`${alias} `) ||
            normalized.endsWith(` ${alias}`)),
      )
    ) {
      return field;
    }
  }

  return null;
}

/**
 * Detect whether a column should be treated as a subject column.
 *
 * This does NOT know actual subject names.
 */
function shouldMapAsSubject(column: string): boolean {
  const normalized = normalizeHeader(column);

  if (!normalized) return false;

  if (isKnownNonSubjectHeader(column)) {
    return false;
  }

  /**
   * Pure overall fields must not become subjects.
   */
  if (isOverallOrResultColumn(column)) {
    return false;
  }

  /**
   * Multi-level headers such as:
   *
   * English | PT
   * English | NB
   * English | SA2
   *
   * are subject-related.
   */
  if (looksLikeComponentHeader(column)) {
    return true;
  }

  /**
   * Existing normalization utility remains the primary generic
   * subject detector for simple spreadsheets.
   */
  if (looksLikeSubjectHeader(column)) {
    return true;
  }

  return false;
}

/**
 * Main automatic mapper.
 */
export function autoMapColumns(headers: string[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];
  const assignedFields = new Set<FieldKey>();

  for (const column of headers) {
    const columnName = String(column ?? '').trim();

    if (!columnName) {
      mapping.push({
        columnName,
        fieldKey: 'ignore',
      });
      continue;
    }

    /**
     * STEP 1
     * Try to identify core student fields.
     */
    const coreField = findCoreField(columnName, assignedFields);

    if (coreField) {
      mapping.push({
        columnName,
        fieldKey: coreField,
      });

      assignedFields.add(coreField);
      continue;
    }

    /**
     * STEP 2
     * Never turn obvious overall/result columns into subjects.
     */
    if (isOverallOrResultColumn(columnName)) {
      mapping.push({
        columnName,
        fieldKey: 'ignore',
      });

      continue;
    }

    /**
     * STEP 3
     * Detect subject/component columns generically.
     */
    if (shouldMapAsSubject(columnName)) {
      const normalized = normalizeHeader(columnName);
      const subjectName = inferSubjectName(columnName);

      mapping.push({
        columnName,
        fieldKey: 'subject',
        subjectName: subjectName || canonicalizeSubjectName(columnName),
        maxMarks: inferMaxMarks(columnName, normalized),
      });

      continue;
    }

    /**
     * STEP 4
     * Unknown columns are ignored by default.
     *
     * This is intentional:
     * an unknown column must NEVER silently become student data.
     */
    mapping.push({
      columnName,
      fieldKey: 'ignore',
    });
  }

  return mapping;
}

/**
 * Options shown in the Mapping UI.
 */
export function getCoreFieldOptions(): {
  value: ColumnMappingFieldKey;
  label: string;
}[] {
  return [
    {
      value: 'ignore',
      label: '— Ignore Column —',
    },
    {
      value: 'name',
      label: 'Student Name',
    },
    {
      value: 'rollNo',
      label: 'Roll Number',
    },
    {
      value: 'admissionNo',
      label: 'Admission No',
    },
    {
      value: 'class',
      label: 'Class',
    },
    {
      value: 'section',
      label: 'Section',
    },
    {
      value: 'fatherName',
      label: 'Father Name',
    },
    {
      value: 'motherName',
      label: 'Mother Name',
    },
    {
      value: 'dob',
      label: 'Date of Birth',
    },
    {
      value: 'address',
      label: 'Address',
    },
    {
      value: 'attendance',
      label: 'Attendance %',
    },
    {
      value: 'workingDays',
      label: 'Total Working Days',
    },
    {
      value: 'daysPresent',
      label: 'Days Present',
    },
    {
      value: 'photoFilename',
      label: 'Photo Filename',
    },
    {
      value: 'teacherRemarks',
      label: 'Teacher Remarks',
    },
    {
      value: 'principalRemarks',
      label: 'Principal Remarks',
    },
    {
      value: 'position',
      label: 'Position/Rank',
    },
    {
      value: 'subject',
      label: 'Subject Marks',
    },
    {
      value: 'gradeField',
      label: 'Grade / Co-scholastic',
    },
    {
      value: 'overallField',
      label: 'Overall Field (Total/%/Position)',
    },
  ];
}

/**
 * Return a compact summary for the mapping screen.
 */
export function summarizeMappings(mappings: ColumnMapping[]): {
  missing: FieldKey[];
  subjectCount: number;
  ignored: number;
} {
  const mappedFields = new Set<FieldKey>();

  let subjectCount = 0;
  let ignored = 0;

  for (const mapping of mappings) {
    if (mapping.fieldKey === 'subject') {
      subjectCount++;
      continue;
    }

    if (mapping.fieldKey === 'ignore') {
      ignored++;
      continue;
    }

    mappedFields.add(mapping.fieldKey as FieldKey);
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => !mappedFields.has(field),
  );

  return {
    missing,
    subjectCount,
    ignored,
  };
}

/**
 * Utility exported for future dynamic mapping code.
 *
 * Kept intentionally small and generic.
 */
export function isLikelyOverallColumn(header: string): boolean {
  return isOverallOrResultColumn(header);
}

/**
 * Utility exported for future dynamic mapping code.
 */
export function isLikelySubjectComponent(header: string): boolean {
  return looksLikeComponentHeader(header);
}

/**
 * Utility exported for future dynamic mapping code.
 */
export function inferSubjectFromHeader(header: string): string {
  return inferSubjectName(header);
}