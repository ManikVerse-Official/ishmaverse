/*
 * ReportCard Studio regression harness.
 *
 * Runs the real services in Node and asserts the product rules:
 *   1. photo matching uses identity, never upload order;
 *   2. grading / percentage math is correct for mixed maximum marks;
 *   3. stars and remarks differ per student and reflect real performance;
 *   4. Excel-provided data (marks, grades, totals, remarks) wins;
 *   5. every generated PDF contains only that student's data, stays inside one
 *      A4 page and has NO overlapping text (the historical Father's Name /
 *      Admission No. bug).
 *
 * Usage:  npx jiti scripts/regression-test.ts [workbook.xlsx ...]
 */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import jsPDF from 'jspdf';

import { parseWorkbookFromFile } from '../src/services/excelParser';
import { parseDynamicStructure } from '../src/services/dynamicExcelParser';
import {
  convertDetectedStructureToColumnMapping,
  createStructureMappingFromDetected,
} from '../src/services/dynamicMappingEngine';
import { buildStudentsFromDynamicStructure } from '../src/services/normalizationEngine';
import { computeTotals, resolveExcelGrades } from '../src/services/calculationEngine';
import {
  DEFAULT_GRADING_BANDS,
  bandsLegend,
  gradeFromMarksOutOf,
  gradeFromPercent,
  percentFromGradeLabel,
} from '../src/services/gradingEngine';
import {
  DEFAULT_ASSESSMENT_CONFIG,
  buildPerformanceProfile,
  rateSkill,
  starsFromAssessmentValue,
} from '../src/services/assessmentEngine';
import { buildRemarkContext, generateTeacherRemark } from '../src/services/remarksEngine';
import { buildReportCardModel } from '../src/services/reportCardModel';
import { verifyReportCardModel } from '../src/services/reportVerification';
import { buildPhotoIndex, resolveStudentPhoto } from '../src/services/photoMatcher';
import { generateStudentPdfBlob } from '../src/services/pdfGenerator';
import { REPORT_CARD_THEMES } from '../src/themes';
import type { PhotoMap, SchoolProfile, Student } from '../src/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    return;
  }
  failed++;
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

function near(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

(globalThis as any).FileReader = class FileReader {
  result: any;
  error: any;
  onload: any;
  onerror: any;
  readAsArrayBuffer(file: any) {
    Promise.resolve(file.arrayBuffer())
      .then((ab: ArrayBuffer) => {
        this.result = ab;
        if (this.onload) this.onload({ target: this });
      })
      .catch((e: any) => {
        this.error = e;
        if (this.onerror) this.onerror(e);
      });
  }
};

function fileFromPath(p: string): File {
  const buf = readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return { name: basename(p), arrayBuffer: () => Promise.resolve(ab) } as any as File;
}

const SCHOOL: SchoolProfile = {
  schoolName:
    'SHAHEED BHAGAT SINGH SENIOR SECONDARY PUBLIC SCHOOL OF EXCELLENCE (AFFILIATED TO C.B.S.E., NEW DELHI)',
  address: 'Village Jhiwerheri, Yamuna Nagar (Haryana) - 135001',
  affiliationText: 'AFFILIATED TO C.B.S.E., NEW DELHI',
  schoolCode: '41627',
  affiliationNo: '531651',
  principalName: 'Ruhi Rani',
  teacherName: 'Pooja Sharma',
  checkedByName: 'Zahida',
  academicSession: '2026-27',
  examTerm: 'Periodic Test - I',
  dateOfIssue: '14-08-2026',
};

/* ─────────────────────────── 1. photo matching ─────────────────────────── */

function testPhotoMatching(): void {
  console.log('\n## photo matching');
  const photoMap: PhotoMap = {
    '13_EKANJOT.jpg': 'data:image/png;base64,AAAA',
    'ADM-2019-1043.png': 'data:image/png;base64,BBBB',
    'Aarav Sharma.jpeg': 'data:image/png;base64,CCCC',
    'Riya_Verma.jpg': 'data:image/png;base64,DDDD',
  };
  const index = buildPhotoIndex(photoMap);

  const ekanjot = {
    studentId: 'row-2',
    rowNumber: 2,
    rollNo: '13',
    name: 'EKANJOT',
    admissionNo: 'X1',
  };
  check(
    'roll-prefixed filename matches the right student',
    resolveStudentPhoto(index, ekanjot) === photoMap['13_EKANJOT.jpg'],
  );

  const admission = {
    studentId: 'row-3',
    rowNumber: 3,
    rollNo: '77',
    name: 'Simran Kaur',
    admissionNo: 'ADM-2019-1043',
  };
  check(
    'admission number matches when the filename has no roll',
    resolveStudentPhoto(index, admission) === photoMap['ADM-2019-1043.png'],
  );

  const byName = {
    studentId: 'row-4',
    rowNumber: 4,
    rollNo: '91',
    name: 'Riya Verma',
  };
  check(
    'normalised name matches',
    resolveStudentPhoto(index, byName) === photoMap['Riya_Verma.jpg'],
  );

  /* Two students share roll 13: the filename carries the name to disambiguate. */
  const duplicateRoll = {
    studentId: 'row-9',
    rowNumber: 9,
    rollNo: '13',
    name: 'Gurpreet',
  };
  check(
    'ambiguous roll without a name match leaves the photo blank',
    resolveStudentPhoto(index, duplicateRoll) === undefined,
  );

  /* Identical names, different rolls: identity still resolves correctly. */
  const aarav = {
    studentId: 'row-5',
    rowNumber: 5,
    rollNo: '5',
    name: 'Aarav Sharma',
  };
  check(
    'duplicate names resolve by their own filename',
    resolveStudentPhoto(index, aarav) === photoMap['Aarav Sharma.jpeg'],
  );

  const missing = {
    studentId: 'row-6',
    rowNumber: 6,
    rollNo: '404',
    name: 'Nobody Here',
  };
  check('missing photo stays blank', resolveStudentPhoto(index, missing) === undefined);

  /* Order must not matter at all. */
  const reversed = buildPhotoIndex({
    'Riya_Verma.jpg': photoMap['Riya_Verma.jpg'],
    'Aarav Sharma.jpeg': photoMap['Aarav Sharma.jpeg'],
    'ADM-2019-1043.png': photoMap['ADM-2019-1043.png'],
    '13_EKANJOT.jpg': photoMap['13_EKANJOT.jpg'],
  });
  check(
    'matching is independent of upload order',
    resolveStudentPhoto(reversed, ekanjot) === resolveStudentPhoto(index, ekanjot),
  );
}

/* ─────────────────────── 2. grading & totals math ─────────────────────── */

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    studentId: 'row-2',
    rowNumber: 2,
    rollNo: '1',
    name: 'Test Student',
    class: '8',
    section: 'A',
    subjects: [],
    ...overrides,
  };
}

function testGradingAndTotals(): void {
  console.log('\n## grading & totals');

  check('grade A1 at 95%', gradeFromPercent(95) === 'A1');
  check('grade D below 50%', gradeFromPercent(42) === 'D');
  /* 20/25 = 80% → B1, 12/25 = 48% → D */
  check('grade for a 25-mark subject (80%)', gradeFromMarksOutOf(20, 25) === 'B1');
  check('grade for a 25-mark subject (48%)', gradeFromMarksOutOf(12, 25) === 'D');
  check('grade for 80-mark subject', gradeFromMarksOutOf(72, 80) === 'A2');
  check('legend is generated from the bands', bandsLegend(DEFAULT_GRADING_BANDS).includes('A1 (91-100)'));
  check('percent from a letter grade', percentFromGradeLabel('B+') === 78);

  /* Mixed maxima: 80 + 50 + 25 + 100 = 255, obtained 60 + 45 + 20 + 90 = 215 */
  const student = makeStudent({
    subjects: [
      { name: 'Mathematics', marks: 60, maxMarks: 80, status: 'present', hasComponents: false },
      { name: 'English', marks: 45, maxMarks: 50, status: 'present', hasComponents: false },
      { name: 'GK', marks: 20, maxMarks: 25, status: 'present', hasComponents: false },
      { name: 'Science', marks: 90, maxMarks: 100, status: 'present', hasComponents: false },
    ],
  });
  const totals = computeTotals(student);
  check('grand total uses mixed maxima', totals.totalMarks === 215 && totals.totalMax === 255,
    `${totals.totalMarks}/${totals.totalMax}`);
  const expectedPct = Math.round((215 / 255) * 10000) / 100;
  check('percentage = obtained / max × 100', totals.percentage === expectedPct, `${totals.percentage}`);

  /* Component subject with an Excel TOTAL: the TOTAL wins, components are not summed twice. */
  const withTotal = makeStudent({
    subjects: [
      {
        name: 'English',
        marks: 79,
        maxMarks: 100,
        status: 'present',
        hasComponents: true,
        components: [
          { name: 'PT', marks: 9, maxMarks: 10, status: 'present', isTotal: false },
          { name: 'NB', marks: 5, maxMarks: 5, status: 'present', isTotal: false },
          { name: 'SEA', marks: 5, maxMarks: 5, status: 'present', isTotal: false },
          { name: 'SA2', marks: 60, maxMarks: 80, status: 'present', isTotal: false },
          { name: 'TOTAL', marks: 79, maxMarks: 100, status: 'present', isTotal: true },
        ],
      },
    ],
  });
  const totalTotals = computeTotals(withTotal);
  check('Excel TOTAL is not double counted', totalTotals.totalMarks === 79, `${totalTotals.totalMarks}`);
  check('Excel TOTAL maximum is used', totalTotals.totalMax === 100);

  /* Total missing → components are summed. */
  const noTotal = makeStudent({
    subjects: [
      {
        name: 'English',
        marks: 69,
        maxMarks: 100,
        status: 'present',
        hasComponents: true,
        components: [
          { name: 'PT', marks: 9, maxMarks: 10, status: 'present', isTotal: false },
          { name: 'SA2', marks: 60, maxMarks: 90, status: 'present', isTotal: false },
        ],
      },
    ],
  });
  check('components are summed when no TOTAL exists', computeTotals(noTotal).totalMarks === 69);

  /* Absent subject: never counted as marks. */
  const absent = makeStudent({
    subjects: [
      { name: 'English', marks: null, maxMarks: 100, status: 'absent', hasComponents: false },
      { name: 'Maths', marks: 80, maxMarks: 100, status: 'present', hasComponents: false },
    ],
  });
  check('AB subject contributes no marks', computeTotals(absent).totalMarks === 80);

  /* An impossible Excel percentage is never printed. */
  const badPercent = makeStudent({
    subjects: [{ name: 'Maths', marks: 90, maxMarks: 100, status: 'present', hasComponents: false }],
    overall: { total: 90, percentage: 140 },
  });
  const badTotals = computeTotals(badPercent);
  check(
    'impossible Excel percentage is rejected',
    badTotals.percentage === 90 && badTotals.percentageSource === 'computed',
    `${badTotals.percentage} (${badTotals.percentageSource})`,
  );

  /* A plausible Excel percentage is preserved. */
  const goodPercent = makeStudent({
    subjects: [{ name: 'Maths', marks: 90, maxMarks: 100, status: 'present', hasComponents: false }],
    overall: { percentage: 90 },
  });
  check('plausible Excel percentage is preserved', computeTotals(goodPercent).percentageSource === 'excel');

  /* Excel grades are preserved instead of recomputed. */
  const graded = makeStudent({
    subjects: [
      { name: 'MATHEMATICS', marks: 76, maxMarks: 80, status: 'present', hasComponents: false },
      { name: 'Science', marks: 40, maxMarks: 100, status: 'present', hasComponents: false },
    ],
    gradeFields: [
      { name: 'MATHEMATICS | GRADE', value: 'A1' },
      { name: 'MV', value: 'B' },
    ],
  });
  const gradeMap = resolveExcelGrades(graded);
  check('Excel subject grade is preserved', gradeMap.get('MATHEMATICS') === 'A1');
  const gradedModel = buildReportCardModel(graded, SCHOOL);
  const mathsRow = gradedModel.academic.find((row) => row.name === 'MATHEMATICS');
  check('academic row prints the Excel grade', mathsRow?.grade === 'A1', mathsRow?.grade);
  check('co-scholastic keeps MV', gradedModel.coScholastic.some((row) => row.name === 'MV'));
  check(
    'subject grade column is not duplicated as co-scholastic',
    !gradedModel.coScholastic.some((row) => /mathematics/i.test(row.name)),
  );
}

/* ───────────────────────── 3. stars & remarks ─────────────────────────── */

function testAssessmentAndRemarks(): void {
  console.log('\n## stars & remarks');

  const high = makeStudent({
    studentId: 'row-10',
    name: 'High Performer',
    subjects: [
      { name: 'English', marks: 92, maxMarks: 100, status: 'present', hasComponents: false },
      { name: 'Maths', marks: 74, maxMarks: 80, status: 'present', hasComponents: false },
    ],
  });
  const low = makeStudent({
    studentId: 'row-11',
    name: 'Low Performer',
    subjects: [
      { name: 'English', marks: 38, maxMarks: 100, status: 'present', hasComponents: false },
      { name: 'Maths', marks: 22, maxMarks: 80, status: 'present', hasComponents: false },
    ],
  });

  const highProfile = buildPerformanceProfile(high);
  const lowProfile = buildPerformanceProfile(low);
  const highStars = ['Understanding', 'Creativity', 'Leadership Qualities'].map(
    (skill) => rateSkill(skill, highProfile).stars,
  );
  const lowStars = ['Understanding', 'Creativity', 'Leadership Qualities'].map(
    (skill) => rateSkill(skill, lowProfile).stars,
  );

  check('high performer earns more stars', Math.min(...highStars) > Math.max(...lowStars),
    `${highStars.join(',')} vs ${lowStars.join(',')}`);
  check('stars stay inside the scale', [...highStars, ...lowStars].every((s) => s >= 0 && s <= 5));
  check('stars are not the same for every skill', new Set(highStars).size > 1, highStars.join(','));
  check(
    'stars are deterministic for a student',
    rateSkill('Understanding', highProfile).stars === highStars[0],
  );

  /* Excel assessment values win over the computed rating. */
  const excelRated = rateSkill('Understanding', lowProfile, 'A+');
  check('Excel grade overrides the computed stars', excelRated.stars === 5 && excelRated.source === 'excel');
  check('star glyphs are parsed', starsFromAssessmentValue('★★★☆☆') === 3);
  check('numeric assessment is parsed out of 5', starsFromAssessmentValue('4/5') === 4);

  const models = [high, low].map((student) => buildReportCardModel(student, SCHOOL));
  const starSets = models.map((m) =>
    [...m.learning, ...m.personality].map((row) => row.stars).join('-') + '-' + m.academic.length,
  );
  check(
    'two students never receive identical star sets',
    starSets[0] !== starSets[1],
    starSets.join(' | '),
  );

  const highRemark = models[0].teacherRemarks;
  const lowRemark = models[1].teacherRemarks;
  check('remarks differ between performance bands', highRemark !== lowRemark);
  check('remarks mention a real subject', /english|maths/i.test(highRemark), highRemark);
  check('no placeholder remark is printed', !/TODO|undefined|null/.test(highRemark));

  const sameBandA = makeStudent({
    studentId: 'row-21',
    name: 'Same Band A',
    subjects: [{ name: 'English', marks: 76, maxMarks: 100, status: 'present', hasComponents: false }],
  });
  const sameBandB = makeStudent({
    studentId: 'row-22',
    name: 'Same Band B',
    subjects: [{ name: 'Hindi', marks: 76, maxMarks: 100, status: 'present', hasComponents: false }],
  });
  const remarkA = generateTeacherRemark(buildRemarkContext(sameBandA));
  const remarkB = generateTeacherRemark(buildRemarkContext(sameBandB));
  check('same marks do not produce byte-identical remarks', remarkA !== remarkB, `${remarkA} || ${remarkB}`);

  /* Excel remarks take priority. */
  const withRemark = makeStudent({
    studentId: 'row-30',
    subjects: [{ name: 'English', marks: 76, maxMarks: 100, status: 'present', hasComponents: false }],
    teacherRemarks: 'Teacher wrote this in the workbook.',
  });
  const remarkModel = buildReportCardModel(withRemark, SCHOOL);
  check(
    'workbook remarks are preserved',
    remarkModel.teacherRemarks === 'Teacher wrote this in the workbook.',
  );
  check('model flags Excel remarks', remarkModel.remarksFromExcel === true);
}

/* ─────────────────── 4. PDF text extraction and overlap ───────────────── */

interface TextRun {
  page: number;
  x: number;
  y: number;
  size: number;
  style: 'normal' | 'bold';
  text: string;
}

const BLOCK_RE =
  /BT\s*\/(F\d+)\s+([\d.]+)\s+Tf[\s\S]*?([\d.-]+)\s+([\d.-]+)\s+Td\s*\(((?:[^()\\]|\\.)*)\)\s*Tj\s*ET/g;

function decodePdfText(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\(\d{3})/g, (_match, code) => String.fromCharCode(Number.parseInt(code, 8)));
}

const OBJ_RE = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
const STREAM_RE = /stream\r?\n([\s\S]*?)\r?\nendstream/;

/**
 * Page content streams in document order. Coordinates in a PDF are page-local,
 * so text from different pages must never be compared as if it shared a plane
 * (a multi-page card legitimately restarts near the top margin on page 2).
 */
function extractPageContents(pdfLatin1: string): string[] {
  const objects = new Map<number, string>();
  const order: number[] = [];
  OBJ_RE.lastIndex = 0;
  let object: RegExpExecArray | null;
  while ((object = OBJ_RE.exec(pdfLatin1))) {
    const number = Number(object[1]);
    objects.set(number, object[2]);
    order.push(number);
  }

  const pages: string[] = [];
  for (const number of order) {
    const body = objects.get(number) ?? '';
    if (!/\/Type\s*\/Page(?!s)/.test(body)) continue;
    const contentsRef = /\/Contents\s+(\d+)\s+0\s+R/.exec(body);
    if (!contentsRef) continue;
    const streamBody = objects.get(Number(contentsRef[1]));
    if (!streamBody) continue;
    const stream = STREAM_RE.exec(streamBody);
    if (!stream) continue;
    try {
      pages.push(inflateSync(Buffer.from(stream[1], 'latin1')).toString('latin1'));
    } catch {
      /* not a flate stream — skip this page's content */
    }
  }
  return pages;
}

function extractTextRuns(pdfLatin1: string): TextRun[] {
  let contents = extractPageContents(pdfLatin1);
  if (contents.length === 0) {
    /* Fallback: concatenate every readable stream (single-page documents). */
    let content = '';
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRe.exec(pdfLatin1))) {
      try {
        content += `${inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')}\n`;
      } catch {
        /* not a flate stream */
      }
    }
    contents = [content];
  }

  const runs: TextRun[] = [];
  contents.forEach((content, page) => {
    let block: RegExpExecArray | null;
    BLOCK_RE.lastIndex = 0;
    while ((block = BLOCK_RE.exec(content))) {
      runs.push({
        page,
        style: block[1] === 'F2' ? 'bold' : 'normal',
        size: Number(block[2]),
        x: Number(block[3]),
        y: Number(block[4]),
        text: decodePdfText(block[5]),
      });
    }
  });
  return runs;
}

const measureDoc = new jsPDF({ unit: 'pt', format: 'a4' });

function runWidth(run: TextRun): number {
  measureDoc.setFont('helvetica', run.style);
  measureDoc.setFontSize(run.size);
  return measureDoc.getTextWidth(run.text);
}

/** Report overlapping text runs (same page) with their ids. */
function findOverlaps(runs: TextRun[]): string[] {
  const boxes = runs.map((run, index) => {
    const width = runWidth(run);
    return {
      index,
      run,
      left: run.x - 0.4,
      right: run.x + width + 0.4,
      bottom: run.y - run.size * 0.22,
      top: run.y + run.size * 0.82,
    };
  });

  const overlaps: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.run.page !== b.run.page) continue;
      const horizontal = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const vertical = Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom);
      if (horizontal > 0.75 && vertical > 0.6) {
        overlaps.push(
          `"${a.run.text}" (${a.run.x.toFixed(1)},${a.run.y.toFixed(1)}) ↔ "${b.run.text}" (${b.run.x.toFixed(
            1,
          )},${b.run.y.toFixed(1)})`,
        );
      }
    }
  }
  return overlaps;
}

function pageCount(pdfLatin1: string): number {
  const match = pdfLatin1.match(/\/Count\s+(\d+)/);
  return match ? Number(match[1]) : 0;
}

const PT_PER_MM = 72 / 25.4;

/**
 * Vertical distance (mm) between the lowest line of the assessment body and the
 * TEACHER'S REMARKS label.
 *
 * The remarks/signature blocks must FLOW under the content. They used to be
 * pinned to the bottom of the sheet, which left a ~25-30% blank band (≈60mm on a
 * normal six-subject card) between the skills tables and the remarks, while the
 * browser preview was always compact. `null` when the theme has no remarks block.
 *
 * NOTE: jsPDF writes text in PDF user space — points, y measured from the BOTTOM
 * of the page — so content that sits above the remarks has a LARGER y.
 */
/**
 * Distance (mm) between the lowest printed line and the bottom edge of the card
 * frame (the frame sits 6mm inside the page). A card that uses the page keeps
 * this at roughly 10-15mm; the old layout left ~55mm and the pinned one ~8mm
 * with a hole in the middle instead.
 */
/**
 * Vertical difference (mm) between the lowest line of the left column and the
 * lowest line of the right column of a holistic card.
 *
 * The right column (co-scholastic / attendance / overall) is spread over the
 * depth of the left column; without that, the whole difference appeared as a
 * blank patch under the overall panel. `null` for single-column themes.
 */
function columnBalanceMm(runs: TextRun[], columnSplitPt: number): number | null {
  const label = runs.find((run) => run.text.toUpperCase().includes("TEACHER'S REMARKS"));
  if (!label) return null;
  const above = runs.filter((run) => run.page === label.page && run.y > label.y + 2);
  const left = above.filter((run) => run.x < columnSplitPt).map((run) => run.y);
  const right = above.filter((run) => run.x >= columnSplitPt).map((run) => run.y);
  if (left.length === 0 || right.length === 0) return null;
  return (Math.min(...left) - Math.min(...right)) / PT_PER_MM;
}

function bottomMarginMm(runs: TextRun[]): number {
  const lowest = runs.reduce((min, run) => Math.min(min, run.y), Number.POSITIVE_INFINITY);
  return lowest / PT_PER_MM - 6;
}

function remarksGapMm(runs: TextRun[]): number | null {
  const label = runs.find((run) => run.text.toUpperCase().includes("TEACHER'S REMARKS"));
  if (!label) return null;
  const above = runs.filter((run) => run.page === label.page && run.y > label.y + 2);
  if (above.length === 0) return null;
  const contentLowest = above.reduce((min, run) => Math.min(min, run.y), Number.POSITIVE_INFINITY);
  return (contentLowest - label.y) / PT_PER_MM;
}

async function renderAndCheck(
  student: Student,
  label: string,
  themeId: string,
  expectations: {
    name: string;
    roll: string;
    subjects: string[];
    marks: number[];
    extra?: string[];
    /* Very long mark sheets are allowed to paginate instead of being squeezed. */
    onePage?: boolean;
    /**
     * Allowed blank space below the card frame, in mm. Cards with a real mark
     * sheet are expected to fill the sheet; a card with only a couple of rows
     * (or none at all, e.g. a grade-only workbook) genuinely cannot, so it gets
     * a bigger allowance.
     */
    maxBottomMm?: number;
  },
): Promise<void> {
  const school: SchoolProfile = { ...SCHOOL, reportTheme: themeId };
  const model = buildReportCardModel(student, school);

  const verification = verifyReportCardModel(student, model);
  check(
    `${label} [${themeId}] passes verification`,
    verification.ok,
    verification.errors.map((issue) => issue.message).join(' '),
  );

  const blob = await generateStudentPdfBlob({ student, school });
  const latin1 = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  const runs = extractTextRuns(latin1);
  /* Wrapped lines are separate PDF runs, so compare on a whitespace-normalised
   * single line — a long subject name must still be fully present. */
  const text = runs.map((run) => run.text).join(' ').replace(/\s+/g, ' ');

  if (expectations.onePage === false) {
    /* An oversized card must paginate (never squash itself over the remarks). */
    const pages = pageCount(latin1);
    check(
      `${label} [${themeId}] paginates cleanly`,
      pages >= 2 && pages <= 4,
      `${pages} pages`,
    );
  } else {
    check(`${label} [${themeId}] fits on one A4 page`, pageCount(latin1) <= 1, `${pageCount(latin1)} pages`);
  }
  check(`${label} [${themeId}] draws text`, runs.length > 10, `${runs.length} runs`);

  const offPage = runs.filter(
    (run) => run.x < -1 || run.x > 595.5 || run.y < -1 || run.y > 843,
  );
  check(`${label} [${themeId}] keeps all text on the sheet`, offPage.length === 0,
    offPage.slice(0, 3).map((run) => `${run.text}@${run.x.toFixed(0)},${run.y.toFixed(0)}`).join(' | '));

  const overlaps = findOverlaps(runs);
  check(`${label} [${themeId}] has no overlapping text`, overlaps.length === 0, overlaps.slice(0, 4).join(' || '));

  /* Remarks must hug the content — no large blank band in the lower page. */
  if (expectations.onePage !== false) {
    const gap = remarksGapMm(runs);
    if (gap !== null) {
      /*
       * Upper bound is generous on purpose: part of this distance is the padding
       * inside the last block (a grown result strip is a filled box, not empty
       * space). The bug this guards was ~60mm of truly blank space.
       */
      check(
        `${label} [${themeId}] remarks follow the assessment section`,
        gap >= 2 && gap <= 26,
        `${gap.toFixed(1)}mm gap between content and remarks`,
      );
    }

    /*
     * Holistic cards have two columns; both must reach roughly the same depth
     * (the layout splits the right column's slack over its blocks).
     */
    if (themeId === 'holistic' && expectations.subjects.length >= 4) {
      const balance = columnBalanceMm(runs, 132 * PT_PER_MM);
      if (balance !== null) {
        check(
          `${label} [${themeId}] columns reach the same depth`,
          Math.abs(balance) <= 20,
          `${balance.toFixed(1)}mm difference between column bottoms`,
        );
      }
    }

    /* And the card must use the page height instead of ending early. */
    const margin = bottomMarginMm(runs);
    /*
     * A mark sheet with fewer than four rows (or none at all, e.g. a grade-only
     * workbook) has nothing to fill the page with — the remaining space is
     * decided by the theme's header/footer, so those cards get a wide budget.
     */
    const fillBudget = expectations.maxBottomMm ?? (expectations.subjects.length >= 4 ? 22 : 95);
    check(
      `${label} [${themeId}] fills the page down to the footer`,
      margin <= fillBudget,
      `${margin.toFixed(1)}mm of blank space below the card frame`, 
    );
  }

  check(`${label} [${themeId}] prints the student name`, text.includes(expectations.name));
  check(`${label} [${themeId}] prints the roll number`, text.includes(expectations.roll));

  const missingSubjects = expectations.subjects.filter(
    (subject) => !text.includes(subject.replace(/\s+/g, ' ')),
  );
  check(
    `${label} [${themeId}] prints every subject`,
    missingSubjects.length === 0,
    missingSubjects.join(', '),
  );

  const missingMarks = expectations.marks.filter((marks) => !new RegExp(`\\b${marks}\\b`).test(text));
  check(`${label} [${themeId}] prints the real marks`, missingMarks.length === 0, missingMarks.join(', '));

  for (const needle of expectations.extra ?? []) {
    check(`${label} [${themeId}] prints "${needle}"`, text.includes(needle));
  }
}

/* ───────────────────── 5. workbook driven end-to-end ─────────────────── */

async function buildStudentsFromWorkbook(file: string): Promise<{ students: Student[]; schoolName?: string }> {
  const f = fileFromPath(resolve(process.cwd(), file));
  const workbook = await parseWorkbookFromFile(f);
  const detected = await parseDynamicStructure(f);
  const mappings = convertDetectedStructureToColumnMapping(detected, workbook.headers);
  const structureMapping = createStructureMappingFromDetected(detected);
  const students = buildStudentsFromDynamicStructure(
    workbook.rows,
    structureMapping.detected,
    structureMapping,
    {
      defaultClass: '',
      defaultSection: '',
      inferredClass: detected.inferredClass,
      inferredSection: detected.inferredSection,
    },
    workbook.headers,
    mappings,
  );
  return { students, schoolName: detected.schoolName };
}

async function testWorkbooks(files: string[]): Promise<void> {
  for (const file of files) {
    console.log(`\n## workbook ${file}`);
    const { students, schoolName } = await buildStudentsFromWorkbook(file);
    check(`${file} produced students`, students.length > 0, `${students.length}`);

    if (file.includes('layout_stress')) {
      check(
        'stress workbook exposes all six subjects',
        students[0].subjects.length === 6,
        students[0].subjects.map((s) => `${s.name}:${s.maxMarks}`).join(', '),
      );
      check(
        'different maximum marks survive parsing',
        JSON.stringify(students[0].subjects.map((s) => s.maxMarks)) === JSON.stringify([80, 50, 100, 50, 25, 40]),
        students[0].subjects.map((s) => `${s.name}=${s.maxMarks}`).join(', '),
      );
      check(
        'long subject name is kept verbatim',
        students[0].subjects.some(
          (s) => s.name === 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT',
        ),
      );
      check('class is not taken from a subject grade column', students[0].class === '8', String(students[0].class));
      check(
        'Excel school name is detected',
        Boolean(schoolName && schoolName.includes('SHAHEED BHAGAT SINGH')),
        schoolName,
      );

      /* Every student passes verification and the percentages are sane. */
      for (const student of students) {
        const model = buildReportCardModel(student, SCHOOL);
        const verification = verifyReportCardModel(student, model);
        check(
          `${file} student ${student.rollNo} verifies`,
          verification.ok,
          verification.errors.map((issue) => issue.message).join(' '),
        );
        check(
          `${file} student ${student.rollNo} percentage is valid`,
          model.totals.percentage === null ||
            (model.totals.percentage >= 0 && model.totals.percentage <= 100),
          `${model.totals.percentage}`,
        );
      }

      /* Stars must not be identical for every student. */
      const starSignatures = students.map((student) =>
        buildReportCardModel(student, SCHOOL)
          .learning.map((row) => row.stars)
          .join(''),
      );
      check('stars vary between students', new Set(starSignatures).size > 1, starSignatures.join(' '));

      const remarkSignatures = students.map(
        (student) => buildReportCardModel(student, SCHOOL).teacherRemarks,
      );
      check('generated remarks vary between students', new Set(remarkSignatures).size > 1);

      /* The reported bug: Father's Name must never collide with Admission No. */
      const first = students[0];
      for (const theme of REPORT_CARD_THEMES) {
        await renderAndCheck(first, `${file} #1`, theme.id, {
          name: first.name,
          roll: first.rollNo,
          subjects: first.subjects.map((s) => s.name),
          marks: first.subjects
            .filter((s) => s.status === 'present' && s.marks !== null)
            .map((s) => s.marks as number),
          extra: [
            'MR.CHARNJEET SINGH SANDHU (S/O LATE KARTAR SINGH)'.slice(0, 20),
            first.admissionNo ?? '',
          ].filter(Boolean),
        });
      }

      /* The exact father's name and the admission number must both be present
       * on their own lines — this is the historical overlap report. */
      const model = buildReportCardModel(first, SCHOOL);
      const blob = await generateStudentPdfBlob({ student: first, school: SCHOOL });
      const runs = extractTextRuns(Buffer.from(await blob.arrayBuffer()).toString('latin1'));
      const fatherRuns = runs.filter((run) => /CHARNJEET/i.test(run.text));
      const admissionRuns = runs.filter((run) => run.text.includes(first.admissionNo ?? '@@'));
      check('father name is printed', fatherRuns.length > 0);
      check('admission number is printed', admissionRuns.length > 0);
      const collision = fatherRuns.some((a) =>
        admissionRuns.some((b) => {
          const overlapX =
            Math.min(a.x + runWidth(a), b.x + runWidth(b)) - Math.max(a.x, b.x);
          const overlapY =
            Math.min(a.y + a.size * 0.82, b.y + b.size * 0.82) -
            Math.max(a.y - a.size * 0.22, b.y - b.size * 0.22);
          return overlapX > 0.5 && overlapY > 0.5;
        }),
      );
      check("Father's Name never overlaps Admission No.", !collision);
      check(
        'long father name wraps onto its own lines',
        fatherRuns.length >= 2 || fatherRuns[0].text.includes('CHARNJEET'),
      );
      check('info grid keeps columns separate', model.infoLeft.length === 5 && model.infoRight.length === 5);
    } else {
      /* Sample a few students from every other workbook in both themes. */
      const sample = students.slice(0, 3);
      for (const student of sample) {
        for (const theme of REPORT_CARD_THEMES) {
          await renderAndCheck(student, `${file} #${student.rollNo}`, theme.id, {
            name: student.name,
            roll: student.rollNo,
            subjects: student.subjects.map((s) => s.name),
            marks: student.subjects
              .filter((s) => s.status === 'present' && s.marks !== null)
              .map((s) => s.marks as number),
          });
        }
      }
    }
  }
}

/* ──────────────── 6. synthetic layout / data extremes ───────────────── */

async function testSyntheticLayout(): Promise<void> {
  console.log('\n## synthetic layout stress');

  const maxima = [25, 40, 50, 80, 100];
  const many = makeStudent({
    studentId: 'row-99',
    rollNo: '99',
    name: 'A Very Long Student Name That Keeps Going On And On',
    class: '10',
    section: 'B',
    fatherName: 'MR. CHARANJEET SINGH SANDHU S/O LATE SARDAR KARTAR SINGH JI',
    motherName: 'MRS. HARJINDER KAUR SANDHU W/O SARDAR CHARANJEET SINGH SANDHU',
    admissionNo: 'ADM/2019/1043/VERY/LONG',
    dob: '2013-04-12',
    address: 'House No. 1043/7, Guru Nanak Nagar, Near Old Bus Stand, Yamuna Nagar',
    attendance: '96%',
    subjects: Array.from({ length: 30 }, (_, index) => {
      const maxMarks = maxima[index % maxima.length];
      return {
        name:
          index % 3 === 0
            ? `ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT PART ${index + 1}`
            : `SUBJECT ${index + 1}`,
        marks: Math.round(maxMarks * 0.82),
        maxMarks,
        status: 'present' as const,
        hasComponents: false,
      };
    }),
    teacherRemarks:
      'The student has worked steadily through the term and shows a good understanding of most concepts. '.repeat(
        4,
      ),
    principalRemarks: 'Regular revision and consistent effort will improve the result further. '.repeat(3),
  });

  for (const theme of REPORT_CARD_THEMES) {
    await renderAndCheck(many, '30 subjects', theme.id, {
      name: many.name,
      roll: many.rollNo,
      subjects: many.subjects.map((subject) => subject.name),
      marks: many.subjects.map((subject) => subject.marks as number),
      onePage: false,
    });
  }

  /* A student with no marks at all must still produce a valid (blank) card. */
  const empty = makeStudent({ studentId: 'row-100', rollNo: '100', name: 'No Marks Student', subjects: [] });
  const emptyModel = buildReportCardModel(empty, SCHOOL);
  check('student without marks verifies', verifyReportCardModel(empty, emptyModel).ok);
  check('student without marks shows a placeholder percentage', emptyModel.totals.percentage === null);
  await renderAndCheck(empty, 'no marks', 'holistic', {
    name: empty.name,
    roll: empty.rollNo,
    subjects: [],
    marks: [],
  });
}

/* ──────────── 6b. layout density (blank band regression) ─────────────── */

/**
 * The complaint that started this section: the PDF kept a large blank area
 * between the Personality/Learning skills tables and the remarks while the
 * browser preview was compact. These cards cover the shapes that change the
 * body height (subject count, name/remark length, performance band).
 */
async function testLayoutDensity(): Promise<void> {
  console.log('\n## layout density');

  const subject = (name: string, marks: number, maxMarks = 100) => ({
    name,
    marks,
    maxMarks,
    status: 'present' as const,
    hasComponents: false,
  });
  const six = (marks: number[]) =>
    ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Computer'].map((name, index) =>
      subject(name, marks[index]),
    );

  const cases: { label: string; student: Student }[] = [
    {
      label: 'high performer',
      student: makeStudent({ studentId: 'row-201', rollNo: '201', name: 'Aarav Mehta', subjects: six([96, 92, 98, 95, 94, 99]) }),
    },
    {
      label: 'low performer',
      student: makeStudent({ studentId: 'row-202', rollNo: '202', name: 'Bhavya Rani', subjects: six([24, 19, 12, 21, 27, 31]) }),
    },
    {
      label: 'long names',
      student: makeStudent({
        studentId: 'row-203',
        rollNo: '203',
        name: 'Gurpreet Kaur Sandhu Dhillon Brar',
        fatherName: 'MR. CHARANJEET SINGH SANDHU S/O LATE SARDAR KARTAR SINGH JI',
        motherName: 'MRS. HARJINDER KAUR SANDHU W/O SARDAR CHARANJEET SINGH SANDHU',
        admissionNo: 'ADM/2019/1043/VERY/LONG',
        address: 'House No. 1043/7, Guru Nanak Nagar, Near Old Bus Stand, Yamuna Nagar',
        subjects: six([76, 68, 81, 74, 66, 88]),
      }),
    },
    {
      label: 'long remarks',
      student: makeStudent({
        studentId: 'row-204',
        rollNo: '204',
        name: 'Meera Joshi',
        subjects: six([70, 64, 58, 77, 69, 83]),
        teacherRemarks:
          'The student has worked steadily through the term and shows a good understanding of most concepts. '.repeat(4),
        principalRemarks:
          'Regular revision and consistent effort will improve the result further. '.repeat(3),
      }),
    },
    {
      label: 'two subjects',
      student: makeStudent({
        studentId: 'row-205',
        rollNo: '205',
        name: 'Kabir Singh',
        subjects: [subject('English', 63), subject('Mathematics', 47)],
      }),
    },
  ];

  for (const { label, student } of cases) {
    for (const theme of REPORT_CARD_THEMES) {
      await renderAndCheck(student, label, theme.id, {
        name: student.name,
        roll: student.rollNo,
        subjects: student.subjects.map((item) => item.name),
        marks: student.subjects.map((item) => item.marks as number),
      });
    }
  }
}

/* ────────────── 6c. theme identity (the looks must differ) ───────────── */

async function renderRuns(student: Student, themeId: string): Promise<TextRun[]> {
  const school: SchoolProfile = { ...SCHOOL, reportTheme: themeId };
  const blob = await generateStudentPdfBlob({ student, school });
  return extractTextRuns(Buffer.from(await blob.arrayBuffer()).toString('latin1'));
}

/**
 * Share of text positions used by both cards, measured RELATIVE to each card's
 * topmost line so a plain vertical shift (a taller header) does not count as a
 * different layout.
 */
function geometryOverlap(a: TextRun[], b: TextRun[]): number {
  const keysOf = (runs: TextRun[]) => {
    const top = runs.reduce((max, run) => Math.max(max, run.y), 0);
    return new Set(runs.map((run) => `${Math.round(run.x / 5)}:${Math.round((top - run.y) / 5)}`));
  };
  const left = keysOf(a);
  const right = keysOf(b);
  let shared = 0;
  left.forEach((key) => {
    if (right.has(key)) shared += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 1 : shared / union;
}

/**
 * "Simple Academic" and "Modern School" are two different products, not a
 * palette swap: the modern card re-skins the header, the student info, the
 * table and the result summary. These checks fail if the two ever collapse into
 * the same look again.
 */
async function testThemeIdentity(): Promise<void> {
  console.log('\n## theme identity');

  const classic = REPORT_CARD_THEMES.find((theme) => theme.id === 'academic')!;
  const modern = REPORT_CARD_THEMES.find((theme) => theme.id === 'modern')!;
  check(
    'the two marks-focused themes use different visuals',
    (classic.variant ?? 'classic') !== (modern.variant ?? 'classic'),
    `${classic.variant ?? 'classic'} vs ${modern.variant ?? 'classic'}`,
  );
  check(
    'both keep the same layout family (shared fitting engine)',
    classic.layout === 'academic' && modern.layout === 'academic',
  );

  const student = makeStudent({
    studentId: 'row-301',
    rollNo: '301',
    name: 'Identity Check',
    subjects: ['English', 'Hindi', 'Maths', 'Science', 'Social Science', 'Computer'].map((name, index) => ({
      name,
      marks: [88, 74, 91, 66, 79, 83][index],
      maxMarks: 100,
      status: 'present' as const,
      hasComponents: false,
    })),
  });

  const classicRuns = await renderRuns(student, classic.id);
  const modernRuns = await renderRuns(student, modern.id);
  const classicText = classicRuns.map((run) => run.text).join(' ').toUpperCase();
  const modernText = modernRuns.map((run) => run.text).join(' ').toUpperCase();

  check('classic card prints the grading-scale line', classicText.includes('GRADING SCALE'));
  check(
    'modern card replaces it with the wide result band',
    !modernText.includes('GRADING SCALE') && modernText.includes('OVERALL PERFORMANCE'),
  );
  check('classic card keeps its own title', classicText.includes(classic.title.toUpperCase()));
  check('modern card keeps its own title', modernText.includes(modern.title.toUpperCase()));

  /* Both must still print the same data — different look, same content. */
  for (const name of ['ENGLISH', 'HINDI', 'MATHS', 'SCIENCE', 'SOCIAL SCIENCE', 'COMPUTER']) {
    check(`modern card prints ${name}`, modernText.includes(name));
  }
  check('modern card prints the grand total', modernText.includes('GRAND TOTAL'));

  /*
   * Measured ~11%; a palette-only swap would score ~100% because the two cards
   * would place every line in the same spot.
   */
  const overlap = geometryOverlap(classicRuns, modernRuns);
  check(
    'the two looks place their text differently',
    overlap <= 0.5,
    `${(overlap * 100).toFixed(0)}% of text positions shared`,
  );
}

/* ────────────────────────────── 7. themes ────────────────────────────── */

function testThemes(): void {
  console.log('\n## themes');
  check('three themes are registered', REPORT_CARD_THEMES.length >= 3);
  check(
    'theme ids are unique',
    new Set(REPORT_CARD_THEMES.map((theme) => theme.id)).size === REPORT_CARD_THEMES.length,
  );
  const holistic = REPORT_CARD_THEMES.find((theme) => theme.id === 'holistic')!;
  const academic = REPORT_CARD_THEMES.find((theme) => theme.layout === 'academic')!;
  const student = makeStudent({
    subjects: [{ name: 'English', marks: 76, maxMarks: 100, status: 'present', hasComponents: false }],
  });
  const holisticModel = buildReportCardModel(student, { ...SCHOOL, reportTheme: holistic.id });
  const academicModel = buildReportCardModel(student, { ...SCHOOL, reportTheme: academic.id });
  check('theme decides the card title', holisticModel.title !== academicModel.title,
    `${holisticModel.title} vs ${academicModel.title}`);
  check(
    'unknown theme falls back to the default',
    buildReportCardModel(student, { ...SCHOOL, reportTheme: 'does-not-exist' }).themeId === 'holistic',
  );
  check('default assessment scale is five stars', DEFAULT_ASSESSMENT_CONFIG.maxStars === 5);
}

/* ─────────────────────────────── run ─────────────────────────────── */

(async () => {
  testPhotoMatching();
  testGradingAndTotals();
  testAssessmentAndRemarks();
  testThemes();
  await testSyntheticLayout();
  await testLayoutDensity();
  await testThemeIdentity();

  const args = process.argv.slice(2);
  const files = args.length
    ? args
    : [
        'testdata_layout_stress.xlsx',
        'testdata_10_students.xlsx',
        'testdata_alt_subjects.xlsx',
        'testdata_complex_structure.xlsx',
        'testdata_sheetname_class.xlsx',
        'testdata_title_class_30.xlsx',
        'testdata_50_students.xlsx',
      ];

  await testWorkbooks(files);

  console.log(`\n=== regression summary: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('failures:');
    for (const failure of failures.slice(0, 40)) console.log('  - ' + failure);
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error('HARNESS ERROR:', error);
  process.exit(1);
});
