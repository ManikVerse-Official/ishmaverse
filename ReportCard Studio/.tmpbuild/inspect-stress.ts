import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseWorkbookFromFile } from '../src/services/excelParser';
import { parseDynamicStructure } from '../src/services/dynamicExcelParser';
import { convertDetectedStructureToColumnMapping } from '../src/services/dynamicMappingEngine';

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
  return { name: basename(p), arrayBuffer: () => Promise.resolve(ab) } as any as File;
}

(async () => {
  const file = resolve(process.cwd(), process.argv[2] || 'testdata_layout_stress.xlsx');
  const f = fileFromPath(file);
  const wbData = await parseWorkbookFromFile(f);
  const detected = await parseDynamicStructure(f);
  const mappings = convertDetectedStructureToColumnMapping(detected, wbData.headers);

  console.log('studentFields:');
  for (const field of detected.studentFields) {
    console.log(`  col ${field.excelColumn} "${field.excelHeader}" -> ${field.fieldType}`);
  }
  console.log('subjectGroups:');
  for (const group of detected.subjectGroups) {
    console.log(
      `  ${group.name} [${group.startCol}..${group.endCol}] total=${group.hasTotal} :: ${group.components
        .map((c) => `${c.name}@${c.col}${c.isTotal ? '(T)' : ''}${c.maxMarks ? `(${c.maxMarks})` : ''}`)
        .join(', ')}`,
    );
  }
  console.log('gradeFields:', detected.gradeFields.map((g) => `${g.name}@${g.col}`).join(' | '));
  console.log('overallFields:', detected.overallFields.map((g) => `${g.name}@${g.col}=${g.fieldType}`).join(' | '));
  console.log('columnMappings:');
  for (const m of mappings) {
    console.log(
      `  col ${m.excelColumn} "${m.columnName}" -> ${m.fieldKey}${
        m.subjectName ? ` (${m.subjectName}${m.maxMarks ? ` max ${m.maxMarks}` : ''})` : ''
      }${m.overallFieldType ? ` [${m.overallFieldType}]` : ''}`,
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
