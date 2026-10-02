/* Pipeline harness: runs the real TS services against the test workbooks. */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { parseWorkbookFromFile } from '../src/services/excelParser';
import { parseDynamicStructure } from '../src/services/dynamicExcelParser';
import {
  convertDetectedStructureToColumnMapping,
  createStructureMappingFromDetected,
} from '../src/services/dynamicMappingEngine';
import { autoMapColumns } from '../src/services/mappingEngine';
import { buildStudentsFromDynamicStructure, buildStudentsFromRows } from '../src/services/normalizationEngine';
import { validateStudents } from '../src/services/validationEngine';
import { generateStudentPdfBlob } from '../src/services/pdfGenerator';

// Minimal File/FileReader shims for Node.
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

function fileFromPath(p: string) {
  const buf = readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return {
    name: basename(p),
    arrayBuffer: () => Promise.resolve(ab),
  } as any as File;
}

async function run(file: string) {
  console.log('\n########## ' + file + ' ##########');
  const f = fileFromPath(resolve(process.cwd(), file));

  const wbData = await parseWorkbookFromFile(f);
  console.log('headers:', JSON.stringify(wbData.headers));
  console.log('rows:', wbData.rows.length);

  const detected = await parseDynamicStructure(f);
  console.log(
    'detected:',
    JSON.stringify(
      {
        headerRows: detected.headerRows,
        dataStartRow: detected.dataStartRow,
        confidence: detected.confidence,
        studentFields: detected.studentFields,
        subjectGroups: detected.subjectGroups,
        gradeFields: detected.gradeFields,
        overallFields: detected.overallFields,
      },
      null,
      1,
    ),
  );

  const hasName = detected.studentFields.some((x) => x.fieldType === 'name');
  const hasSubjects = detected.subjectGroups.length > 0;

  const effectiveDefaults = {
    defaultClass: '',
    defaultSection: '',
    inferredClass: detected.inferredClass,
    inferredSection: detected.inferredSection,
  };

  console.log('inferred:', JSON.stringify({
    inferredClass: detected.inferredClass,
    inferredSection: detected.inferredSection,
    schoolName: detected.schoolName,
    titleRows: detected.titleRows,
  }));

  let students;
  if (!hasName || !hasSubjects) {
    console.log('!! fallback path used (autoMapColumns)');
    const mapping = autoMapColumns(wbData.headers);
    students = buildStudentsFromRows(wbData.rows, mapping, effectiveDefaults);
  } else {
    const mappings = convertDetectedStructureToColumnMapping(detected, wbData.headers);
    const structureMapping = createStructureMappingFromDetected(detected);
    students = buildStudentsFromDynamicStructure(
      wbData.rows,
      structureMapping.detected,
      structureMapping,
      effectiveDefaults,
      wbData.headers,
      mappings,
    );
  }

  console.log('students built:', students.length);
  const first = students[0];
  console.log(
    'first student:',
    JSON.stringify(
      {
        name: first?.name,
        rollNo: first?.rollNo,
        class: first?.class,
        section: first?.section,
        subjects: first?.subjects?.map((s) => ({ name: s.name, marks: s.marks, max: s.maxMarks })),
        gradeFields: first?.gradeFields,
        overall: first?.overall,
      },
      null,
      1,
    ),
  );

  const v = validateStudents(students);
  console.log('validation: valid=' + v.isValid + ' errors=' + v.errorCount + ' warnings=' + v.warningCount);
  console.log('issue samples:', JSON.stringify(v.issues.slice(0, 12), null, 1));

  const missing = students.filter((s) => s.subjects.every((sub) => sub.marks === null)).length;
  console.log('students with ALL subject marks missing: ' + missing + '/' + students.length);

  if (process.env.PDF_SMOKE === '1' && students[0]) {
    const blob = await generateStudentPdfBlob({
      student: students[0],
      school: {
        schoolName: detected.schoolName || 'Test Public School',
        address: 'Village Test, City (State)',
        affiliationText: 'AFFILIATED TO C.B.S.E., NEW DELHI',
        schoolCode: '41627',
        affiliationNo: '531651',
        principalName: 'Principal Name',
        teacherName: 'Class Teacher',
        checkedByName: 'Vice Principal',
        academicSession: '2025-26',
        examTerm: 'Periodic Test - I',
        dateOfIssue: '14-08-2026',
      },
    });
    const bytes = Buffer.from(await blob.arrayBuffer());
    const text = bytes.toString('latin1');
    const countMatch = text.match(/\/Count\s+(\d+)/);
    console.log(
      'pdf smoke bytes=' + blob.size + ' pages=' + (countMatch ? countMatch[1] : '?'),
    );

    /* Inflate the content streams so we can assert the drawn text for real. */
    const { inflateSync } = await import('node:zlib');
    let content = '';
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      try {
        content += inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
      } catch {
        /* not a flate stream */
      }
    }
    const drawn = Array.from(content.matchAll(/\(([^()]*)\)\s*Tj/g)).map((x) => x[1]);
    const joined = drawn.join('\n');
    const lines = drawn.length;
    console.log('pdf text runs=' + lines);
    const missing = [students[0].name, ...students[0].subjects.map((s) => s.name)].filter(
      (needle) => needle && !joined.includes(String(needle)),
    );
    console.log('pdf missing expected strings:', JSON.stringify(missing));

    /*
     * Vertical extent of everything drawn. jsPDF does not auto-paginate, so
     * anything outside 0..842pt would be silently clipped off the sheet.
     */
    const opCounts = new Map<string, number>();
    for (const op of content.matchAll(/\b(Tm|Td|TD|cm)\b/g)) {
      opCounts.set(op[1], (opCounts.get(op[1]) ?? 0) + 1);
    }
    console.log('pdf position ops:', JSON.stringify(Array.from(opCounts.entries())));

    /* PDF user space has its origin at the bottom-left; convert to mm from the
     * top so it can be compared against the 297mm sheet height directly. */
    const toMmFromTop = (pt: number) => ((841.89 - pt) / 72) * 25.4;
    const drew = Array.from(content.matchAll(/([\d.-]+) ([\d.-]+) (Tm|Td|TD)/g))
      .map((x) => toMmFromTop(Number(x[2])))
      .filter((n) => Number.isFinite(n));
    if (drew.length) {
      const top = Math.min(...drew);
      const bottom = Math.max(...drew);
      console.log(
        'pdf drawn area = ' + top.toFixed(1) + 'mm .. ' + bottom.toFixed(1) + 'mm from top (sheet 297mm)',
      );
      console.log(
        'pdf content stays on page:',
        top >= 0 && bottom <= 297 ? 'YES' : 'NO (outside 0..297mm)',
      );
    }
  }
}

(async () => {
  const files = process.argv.slice(2);
  const targets = files.length
    ? files
    : ['testdata_10_students.xlsx', 'testdata_alt_subjects.xlsx', 'testdata_complex_structure.xlsx'];
  for (const file of targets) {
    await run(file);
  }
})().catch((e) => {
  console.error('HARNESS ERROR:', e);
  process.exit(1);
});
