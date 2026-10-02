import * as XLSX from 'xlsx';
import { parseDynamicStructure } from '../src/services/dynamicExcelParser';

const names = [
  'EVS',
  'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT',
  'ROBOTICS',
  'GENERAL KNOWLEDGE',
  'ARTIFICIAL INTELLIGENCE',
];
const headersRow1 = ['Sr. No.', 'Student Name', ...names];
const headersRow2 = ['', '', ...names.map(() => 'MARKS (50)')];
const data: any[][] = [headersRow1, headersRow2];
for (let i = 0; i < 3; i++) data.push([i + 1, `Student ${i + 1}`, 40 + i, 40 + i, 40 + i, 40 + i, 40 + i]);
const ws = XLSX.utils.aoa_to_sheet(data);
ws['!merges'] = names.map((_, idx) => ({ s: { r: 0, c: 2 + idx }, e: { r: 0, c: 2 + idx } }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Class 8-A');
const array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
const file = { name: 'probe.xlsx', arrayBuffer: () => Promise.resolve(array) } as any;

(globalThis as any).FileReader = class {
  result: any; onload: any; onerror: any; error: any;
  readAsArrayBuffer(f: any) {
    Promise.resolve(f.arrayBuffer()).then((ab: ArrayBuffer) => { this.result = ab; this.onload?.({ target: this }); });
  }
};

(async () => {
  (globalThis as any).__RCS_DEBUG__ = true;
  const detected = await parseDynamicStructure(file);
  console.log('groups:', detected.subjectGroups.map((g) => `${g.name}@${g.startCol}`));
  console.log('grades:', detected.gradeFields.map((g) => `${g.name}@${g.col}`));
})().catch((e) => { console.error(e); process.exit(1); });
