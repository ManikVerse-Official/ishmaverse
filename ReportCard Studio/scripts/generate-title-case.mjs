import * as XLSX from 'xlsx';

/**
 * Mimics the reported real workbook:
 *  - Title row contains the school name AND the class: "S.B.S PUBLIC SCHOOL (CLASS-3rd)"
 *  - There is NO separate Class column.
 *  - 30 students.
 *  - Each subject has components (PT/NB/SEA/SA2) plus a subject TOTAL column.
 *  - Co-scholastic grade columns (MV/GK/DRAW) and overall TOTAL / % / POSITION.
 */

const firstNames = ['Aarav', 'Ananya', 'Riya', 'Aryan', 'Ishaan', 'Saanvi', 'Vivaan', 'Diya', 'Kabir', 'Myra'];
const lastNames = ['Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Mehta', 'Patel', 'Iyer', 'Rao', 'Khan'];
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const subjects = ['English', 'Hindi', 'Maths', 'SCI.', 'SST', 'COMPUTER'];

// row 0: title (merged across the whole sheet)
const title = 'S.B.S PUBLIC SCHOOL (CLASS-3rd)';

// row 1: subject group headers (merged), identity columns written once
const groupRow = ['Sr. No.', 'Student Name', "Father's Name", "Mother's Name", 'D.O.B', 'Address'];
for (const s of subjects) {
  for (let i = 0; i < 5; i++) groupRow.push(s);
}
groupRow.push('MV', 'GK', 'DRAW', 'TOTAL', '%', 'POSITION');

// row 2: component headers
const compRow = ['', '', '', '', '', ''];
for (let i = 0; i < subjects.length; i++) {
  compRow.push('PT', 'NB', 'SEA', 'SA2', 'TOTAL');
}
compRow.push('', '', '', '', '', '');

const data = [new Array(groupRow.length).fill(''), groupRow, compRow];
data[0][0] = title;

for (let i = 0; i < 30; i++) {
  const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
  const row = [
    i + 1,
    name,
    `Father ${i + 1}`,
    `Mother ${i + 1}`,
    `2014-0${rand(1, 9)}-1${rand(0, 9)}`,
    `House ${i + 1}, City`,
  ];
  for (let s = 0; s < subjects.length; s++) {
    const pt = rand(5, 10);
    const nb = rand(3, 5);
    const sea = rand(3, 5);
    const sa2 = rand(40, 70);
    row.push(pt, nb, sea, sa2, pt + nb + sea + sa2);
  }
  row.push(['A', 'A+', 'B'][i % 3], ['A+', 'B', 'A'][i % 3], ['B', 'A', 'C'][i % 3], '', '', '');
  data.push(row);
}

const ws = XLSX.utils.aoa_to_sheet(data);
const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: groupRow.length - 1 } }];
let col = 6;
for (let s = 0; s < subjects.length; s++) {
  merges.push({ s: { r: 1, c: col }, e: { r: 1, c: col + 4 } });
  col += 5;
}
ws['!merges'] = merges;

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'S.B.S PUBLIC SCHOOL (CLASS-3rd)');
XLSX.writeFile(wb, 'testdata_title_class_30.xlsx');
console.log('Wrote testdata_title_class_30.xlsx with 30 students');

/*
 * Second case: flat single-row header, class ONLY in the sheet name, and a
 * subject name outside our vocabulary ("AI") to exercise generic detection.
 */
const flatHeaders = [
  'Sr. No.',
  'Student Name',
  'Father Name',
  'DOB',
  'Attendance',
  'English',
  'Hindi',
  'Maths',
  'SCI',
  'SST',
  'AI',
  'TOTAL',
  '%',
  'POSITION',
];
const flat = [flatHeaders];
for (let i = 0; i < 30; i++) {
  const marks = [rand(40, 98), rand(40, 98), rand(40, 98), rand(40, 98), rand(40, 98), rand(40, 98)];
  const total = marks.reduce((a, b) => a + b, 0);
  flat.push([
    i + 1,
    `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    `Father ${i + 1}`,
    `2014-0${rand(1, 9)}-1${rand(0, 9)}`,
    `${rand(70, 100)}%`,
    ...marks,
    total,
    Math.round((total / 600) * 100),
    i + 1,
  ]);
}
const wsFlat = XLSX.utils.aoa_to_sheet(flat);
const wbFlat = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbFlat, wsFlat, 'Class 3');
XLSX.writeFile(wbFlat, 'testdata_sheetname_class.xlsx');
console.log('Wrote testdata_sheetname_class.xlsx with 30 students');
