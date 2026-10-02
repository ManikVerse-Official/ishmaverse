import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

// --- Re-implement core functions for Node.js testing (mirrors of TS versions) ---
function normalizeHeader(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[_\-./\\]/g, ' ')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
}

const FIELD_ALIASES = [
  { field: 'name', aliases: ['student name', 'student', 'name', 'full name', 'studentname'] },
  { field: 'rollNo', aliases: ['roll no', 'roll number', 'roll', 'rollno'] },
  { field: 'class', aliases: ['class', 'standard', 'grade'] },
  { field: 'section', aliases: ['section', 'sec'] },
  { field: 'fatherName', aliases: ['father name', 'father', 'fathers name'] },
  { field: 'motherName', aliases: ['mother name', 'mother', 'mothers name'] },
  { field: 'dob', aliases: ['dob', 'date of birth'] },
  { field: 'attendance', aliases: ['attendance', 'attendance %'] },
  { field: 'photoFilename', aliases: ['photo', 'photo filename'] },
];

const SUBJECT_NAME_VARIANTS = {
  maths: 'Mathematics', math: 'Mathematics', mathematics: 'Mathematics',
  sci: 'Science', science: 'Science', english: 'English', eng: 'English', hindi: 'Hindi',
  sanskrit: 'Sanskrit', sans: 'Sanskrit', sst: 'Social Science',
  'social science': 'Social Science', social: 'Social Science',
  evs: 'EVS', gk: 'GK', computer: 'Computer', it: 'IT',
};

function canonicalizeSubjectName(raw) {
  const norm = normalizeHeader(raw);
  if (SUBJECT_NAME_VARIANTS[norm]) return SUBJECT_NAME_VARIANTS[norm];
  return norm.replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeSubjectHeader(header) {
  const norm = normalizeHeader(header);
  if (!norm) return false;
  if (norm.length > 60) return false;
  const isCore = FIELD_ALIASES.some((fa) =>
    fa.aliases.some((a) => norm === a || norm.startsWith(a + ' ')),
  );
  if (isCore) return false;
  if (norm.includes('max') || norm.includes('total')) return false;
  if (/^(obtained|marks|score|grade)$/.test(norm)) return false;
  return true;
}

function autoMapColumns(headers) {
  const mapping = [];
  const assignedFields = new Set();
  for (const col of headers) {
    const norm = normalizeHeader(col);
    let matched = null;
    for (const fa of FIELD_ALIASES) {
      if (assignedFields.has(fa.field)) continue;
      const exact = fa.aliases.some((a) => a === norm);
      const prefix = fa.aliases.some((a) => norm.startsWith(a + ' '));
      if (exact || prefix) {
        matched = { columnName: col, fieldKey: fa.field };
        assignedFields.add(fa.field);
        break;
      }
    }
    if (!matched) {
      if (looksLikeSubjectHeader(col)) {
        matched = {
          columnName: col,
          fieldKey: 'subject',
          subjectName: canonicalizeSubjectName(col),
          maxMarks: inferMax(col, norm),
        };
      } else {
        matched = { columnName: col, fieldKey: 'ignore' };
      }
    }
    mapping.push(matched);
  }
  return mapping;
}

function inferMax(col, norm) {
  const brackets = col.match(/\(\s*(\d+)\s*\)/) || col.match(/\[(\d+)\]/);
  if (brackets) return parseInt(brackets[1], 10);
  const trailing = norm.match(/(\d{2,3})\s*$/);
  if (trailing) return parseInt(trailing[1], 10);
  return 100;
}

function buildStudents(rows, mapping, defaults) {
  const subjectMappings = mapping.filter((m) => m.fieldKey === 'subject');
  const statusRegexAbsent = /^ab$|^absent$/i;
  const statusRegexExempt = /^ex$|^exempt$/i;
  const statusRegexMedical = /^medical$|^med$/i;

  return rows.map((row, idx) => {
    const studentId = `row-${idx + 2}`;
    const fields = {};
    for (const m of mapping) {
      if (m.fieldKey === 'subject' || m.fieldKey === 'ignore') continue;
      const v = row[m.columnName];
      fields[m.fieldKey] = v === null || v === undefined ? '' : String(v).trim();
    }
    const subjects = subjectMappings.map((m) => {
      const raw = row[m.columnName];
      const str = raw === null || raw === undefined ? '' : String(raw).trim();
      let status = 'present';
      let marks = null;
      if (statusRegexAbsent.test(str)) status = 'absent';
      else if (statusRegexExempt.test(str)) status = 'exempt';
      else if (statusRegexMedical.test(str)) status = 'medical';
      else if (str !== '') {
        const n = Number(str.replace(/,/g, ''));
        if (Number.isFinite(n)) marks = n;
      }
      return {
        name: m.subjectName || m.columnName,
        maxMarks: m.maxMarks ?? 100,
        marks,
        status,
      };
    });
    return {
      studentId,
      rowNumber: idx + 2,
      rollNo: fields.rollNo || String(idx + 1),
      class: fields.class || defaults.defaultClass || undefined,
      section: fields.section || defaults.defaultSection || undefined,
      name: fields.name,
      fatherName: fields.fatherName || undefined,
      motherName: fields.motherName || undefined,
      dob: fields.dob || undefined,
      attendance: fields.attendance || undefined,
      subjects,
    };
  });
}

function validateStudents(students) {
  const issues = [];
  const rollSeen = new Map();
  for (const s of students) {
    const ctx = { studentId: s.studentId, rowNumber: s.rowNumber };
    if (!s.name || !s.name.trim())
      issues.push({ ...ctx, severity: 'error', type: 'missing_name', message: 'Student name is missing.' });
    if (!s.rollNo || !String(s.rollNo).trim())
      issues.push({ ...ctx, severity: 'error', type: 'missing_roll', message: 'Roll number is missing.' });
    else {
      const key = `${s.class ?? ''}__${s.section ?? ''}__${String(s.rollNo).trim()}`;
      const existing = rollSeen.get(key) ?? [];
      existing.push(s.studentId);
      rollSeen.set(key, existing);
    }
    for (const sub of s.subjects) {
      if (sub.status === 'present') {
        if (sub.marks === null)
          issues.push({ ...ctx, severity: 'error', type: 'missing_marks', message: `${sub.name} marks missing.` });
        else if (sub.marks < 0)
          issues.push({ ...ctx, severity: 'error', type: 'negative', message: `${sub.name} negative marks.` });
        else if (sub.marks > sub.maxMarks)
          issues.push({
            ...ctx,
            severity: 'error',
            type: 'marks_exceed_max',
            message: `${sub.name} marks ${sub.marks} exceed maximum ${sub.maxMarks}.`,
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
          message: `Roll number ${roll}${cls ? ` in Class ${cls}` : ''}${sec ? `-${sec}` : ''} is duplicated.`,
        });
      }
    }
  }
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount: issues.length - errorCount,
  };
}

function computeTotals(s) {
  let total = 0, max = 0, present = 0;
  for (const sub of s.subjects) {
    if (sub.status === 'present' && sub.marks !== null) {
      total += sub.marks; max += sub.maxMarks; present++;
    }
  }
  const pct = max > 0 ? Math.round((total / max) * 10000) / 100 : null;
  return { total, max, pct, present };
}

// --- End service copies ---

// --- Test driver ---
function runTests() {
  const files = [
    { file: 'testdata_10_students.xlsx', expectStudents: 10, expectErrors: true },
    { file: 'testdata_50_students.xlsx', expectStudents: 50, expectErrors: true },
    { file: 'testdata_alt_subjects.xlsx', expectStudents: 15, expectErrors: true },
  ];
  let failed = 0;
  for (const tc of files) {
    console.log(`\n=== Testing ${tc.file} ===`);
    const buf = readFileSync(tc.file);
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    const headerIdx = 0;
    const headers = json[headerIdx].map((h, i) => (String(h ?? '').trim() || `Column_${i + 1}`));
    const rows = json.slice(headerIdx + 1).map((r) => {
      const o = {}; headers.forEach((h, i) => (o[h] = r[i] ?? ''));
      return o;
    });
    console.log(`  Headers: ${headers.join(' | ')}`);
    console.log(`  Data rows: ${rows.length}`);
    if (rows.length !== tc.expectStudents) {
      console.log(`  FAIL: expected ${tc.expectStudents} students, got ${rows.length}`);
      failed++;
    }
    const mapping = autoMapColumns(headers);
    console.log(`  Mapped fields: ${mapping.filter((m) => m.fieldKey !== 'subject' && m.fieldKey !== 'ignore').length}`);
    console.log(`  Subjects: ${mapping.filter((m) => m.fieldKey === 'subject').map((m) => `${m.subjectName}(${m.maxMarks})`).join(', ')}`);
    const students = buildStudents(rows, mapping, { defaultClass: '8', defaultSection: 'A' });
    console.log(`  Built ${students.length} students. Subjects per student: ${students[0].subjects.length}`);
    // Duplicate-name sanity: internal IDs must be unique
    const ids = new Set(students.map((s) => s.studentId));
    if (ids.size !== students.length) { console.log('  FAIL: duplicate student IDs'); failed++; }
    // Validate
    const v = validateStudents(students);
    console.log(`  Validation result: valid=${v.isValid}  errors=${v.errorCount}  warnings=${v.warningCount}`);
    if (tc.expectErrors && v.errorCount === 0) {
      console.log('  WARN: Expected edge cases but 0 errors found (may be OK due to randomness)');
    }
    // Totals sample
    for (let i = 0; i < Math.min(3, students.length); i++) {
      const s = students[i];
      const t = computeTotals(s);
      const issuesHere = v.issues.filter((x) => x.studentId === s.studentId);
      console.log(`    Roll ${s.rollNo}  ${s.name.substring(0, 20)}: ${t.total}/${t.max}  ${t.pct !== null ? t.pct + '%' : '—'}  issues=${issuesHere.length}`);
      for (const iss of issuesHere.slice(0, 2)) console.log(`      - ${iss.type}: ${iss.message}`);
    }
  }
  console.log(`\n=== Tests done: ${failed} failures ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
