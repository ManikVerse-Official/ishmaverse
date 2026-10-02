/* Repro harness: runs the exact browser pipeline on the test Excel files. */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Minimal browser shims so the compiled services can run in Node.
global.FileReader = class FileReader {
  readAsArrayBuffer(file) {
    Promise.resolve(file.arrayBuffer()).then((ab) => {
      this.result = ab;
      if (this.onload) this.onload({ target: this });
    }).catch((e) => {
      this.error = e;
      if (this.onerror) this.onerror(e);
    });
  }
};

const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  try {
    return origResolve.call(this, request, ...args);
  } catch (e) {
    try {
      return origResolve.call(this, request + '.cjs', ...args);
    } catch (e2) {
      throw e;
    }
  }
};

const svc = (p) => require(path.join(__dirname, '..', '.tmpbuild', 'services', p));
const { parseWorkbookFromFile, parseSheetFromWorkbook } = svc('excelParser.cjs'.replace('.cjs', ''));
const { parseDynamicStructure } = svc('dynamicExcelParser');
const {
  convertDetectedStructureToColumnMapping,
  createStructureMappingFromDetected,
} = svc('dynamicMappingEngine');
const { buildStudentsFromDynamicStructure, buildStudentsFromRows } = svc('normalizationEngine');
const { validateStudents } = svc('validationEngine');

function fileFromPath(p) {
  const buf = fs.readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return {
    name: path.basename(p),
    arrayBuffer: () => Promise.resolve(ab),
  };
}

async function run(file) {
  console.log('\n########## ' + file + ' ##########');
  const f = fileFromPath(path.join(__dirname, '..', file));

  // Step 1: classic parse (what excelParser does in the browser)
  const wbData = await parseWorkbookFromFile(f);
  console.log('headers:', JSON.stringify(wbData.headers));

  // Step 2: dynamic structure detection
  const detected = await parseDynamicStructure(f);
  console.log('detected structure:', JSON.stringify({
    headerRows: detected.headerRows,
    dataStartRow: detected.dataStartRow,
    confidence: detected.confidence,
    studentFields: detected.studentFields,
    subjectGroups: detected.subjectGroups,
    gradeFields: detected.gradeFields,
    overallFields: detected.overallFields,
  }, null, 1));

  const hasName = detected.studentFields.some((x) => x.fieldType === 'name');
  const hasSubjects = detected.subjectGroups.length > 0;

  let students;
  if (!hasName || !hasSubjects) {
    console.log('!! fallback path used (autoMapColumns)');
    const mapping = require(path.join(__dirname, '..', '.tmpbuild', 'services', 'mappingEngine.cjs')).autoMapColumns(wbData.headers);
    students = buildStudentsFromRows(wbData.rows, mapping, { defaultClass: '', defaultSection: '' });
  } else {
    const mappings = convertDetectedStructureToColumnMapping(detected, wbData.headers);
    const structureMapping = createStructureMappingFromDetected(detected);
    console.log('columnMapping:', JSON.stringify(mappings, null, 1));
    students = buildStudentsFromDynamicStructure(
      wbData.rows,
      structureMapping.detected,
      structureMapping,
      { defaultClass: '', defaultSection: '' },
      wbData.headers,
      mappings,
    );
  }

  console.log('students built:', students.length);
  const first = students[0];
  console.log('first student:', JSON.stringify({
    name: first.name,
    rollNo: first.rollNo,
    class: first.class,
    section: first.section,
    subjects: first.subjects,
    gradeFields: first.gradeFields,
    overall: first.overall,
  }, null, 1));

  const v = validateStudents(students);
  console.log('validation: valid=' + v.isValid + ' errors=' + v.errorCount + ' warnings=' + v.warningCount);

  const missing = students.filter((s) => s.subjects.every((sub) => sub.marks === null)).length;
  console.log('students with ALL subject marks missing: ' + missing + '/' + students.length);
}

(async () => {
  for (const file of ['testdata_10_students.xlsx', 'testdata_alt_subjects.xlsx', 'testdata_complex_structure.xlsx']) {
    await run(file);
  }
})().catch((e) => {
  console.error('HARNESS ERROR:', e);
  process.exit(1);
});
