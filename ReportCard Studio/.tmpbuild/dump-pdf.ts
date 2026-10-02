import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { parseWorkbookFromFile } from '../src/services/excelParser';
import { parseDynamicStructure } from '../src/services/dynamicExcelParser';
import { convertDetectedStructureToColumnMapping, createStructureMappingFromDetected } from '../src/services/dynamicMappingEngine';
import { buildStudentsFromDynamicStructure } from '../src/services/normalizationEngine';
import { generateStudentPdfBlob } from '../src/services/pdfGenerator';
import type { SchoolProfile } from '../src/types';

(globalThis as any).FileReader = class {
  result: any; onload: any; onerror: any; error: any;
  readAsArrayBuffer(f: any) { Promise.resolve(f.arrayBuffer()).then((ab: ArrayBuffer) => { this.result = ab; this.onload?.({ target: this }); }); }
};

const SCHOOL: SchoolProfile = {
  schoolName: 'SHAHEED BHAGAT SINGH SENIOR SECONDARY PUBLIC SCHOOL OF EXCELLENCE, YAMUNA NAGAR',
  address: 'Village Jhiwerheri, Yamuna Nagar (Haryana)',
  affiliationText: 'AFFILIATED TO C.B.S.E., NEW DELHI',
  schoolCode: '41627', affiliationNo: '531651',
  principalName: 'Ruhi Rani', teacherName: 'Pooja Sharma', checkedByName: 'Zahida',
  academicSession: '2026-27', examTerm: 'Periodic Test - I', dateOfIssue: '14-08-2026',
};

(async () => {
  const p = resolve(process.cwd(), process.argv[2] || 'testdata_layout_stress.xlsx');
  const buf = readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const f = { name: basename(p), arrayBuffer: () => Promise.resolve(ab) } as any as File;
  const wb = await parseWorkbookFromFile(f);
  const detected = await parseDynamicStructure(f);
  const mappings = convertDetectedStructureToColumnMapping(detected, wb.headers);
  const sm = createStructureMappingFromDetected(detected);
  const students = buildStudentsFromDynamicStructure(wb.rows, sm.detected, sm, {
    defaultClass: '', defaultSection: '', inferredClass: detected.inferredClass, inferredSection: detected.inferredSection,
  }, wb.headers, mappings);
  const blob = await generateStudentPdfBlob({ student: students[0], school: SCHOOL });
  const text = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  let content = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try { content += inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n%%--STREAM--%%\n'; } catch {}
  }
  const idx = content.indexOf('BT');
  console.log(content.slice(idx, idx + 2600));
})().catch((e) => { console.error(e); process.exit(1); });
