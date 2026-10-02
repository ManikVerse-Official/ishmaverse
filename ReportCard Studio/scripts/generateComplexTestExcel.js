import XLSX from 'xlsx';

// Create a new workbook
const wb = XLSX.utils.book_new();

// Create worksheet data with multi-row headers and merged cells
const data = [];

// Header Row 1 - Subject groups (merged)
data.push(['', '', '', 'ENGLISH', '', '', '', '', 'HINDI', '', '', '', '', 'MATHS', '', '', '', '', 'SCIENCE', '', '', '', '', 'SST', '', '', '', '', 'COMPUTER', '', '', '', '', 'MV', 'GK', 'DRAW', 'TOTAL', '%', 'POSITION']);

// Header Row 2 - Components
data.push(['S.No', 'Roll No', 'Name', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', 'PT', 'NB', 'SE', 'SA2', 'TOTAL', '', '', '', '', '', '', '']);

// Sample student data
const students = [
  {
    sno: 1,
    rollNo: 1,
    name: 'Rahul Sharma',
    english: { pt: 9, nb: 5, se: 5, sa2: 60, total: 79 },
    hindi: { pt: 8, nb: 6, se: 6, sa2: 58, total: 78 },
    maths: { pt: 10, nb: 5, se: 7, sa2: 65, total: 87 },
    science: { pt: 9, nb: 5, se: 6, sa2: 62, total: 82 },
    sst: { pt: 8, nb: 6, se: 5, sa2: 60, total: 79 },
    computer: { pt: 10, nb: 5, se: 8, sa2: 68, total: 91 },
    mv: 'A',
    gk: 'A+',
    draw: 'B',
  },
  {
    sno: 2,
    rollNo: 2,
    name: 'Priya Gupta',
    english: { pt: 8, nb: 6, se: 6, sa2: 58, total: 78 },
    hindi: { pt: 9, nb: 5, se: 7, sa2: 60, total: 81 },
    maths: { pt: 9, nb: 6, se: 6, sa2: 63, total: 84 },
    science: { pt: 8, nb: 5, se: 5, sa2: 60, total: 78 },
    sst: { pt: 9, nb: 6, se: 6, sa2: 62, total: 83 },
    computer: { pt: 9, nb: 5, se: 7, sa2: 65, total: 86 },
    mv: 'A+',
    gk: 'A',
    draw: 'A',
  },
  {
    sno: 3,
    rollNo: 3,
    name: 'Amit Kumar',
    english: { pt: 7, nb: 5, se: 5, sa2: 55, total: 72 },
    hindi: { pt: 8, nb: 5, se: 6, sa2: 56, total: 75 },
    maths: { pt: 8, nb: 6, se: 5, sa2: 60, total: 79 },
    science: { pt: 7, nb: 5, se: 5, sa2: 58, total: 75 },
    sst: { pt: 8, nb: 5, se: 6, sa2: 58, total: 77 },
    computer: { pt: 9, nb: 5, se: 6, sa2: 62, total: 82 },
    mv: 'B',
    gk: 'B+',
    draw: 'B+',
  },
  {
    sno: 4,
    rollNo: 4,
    name: 'Sneha Patel',
    english: { pt: 10, nb: 5, se: 7, sa2: 65, total: 87 },
    hindi: { pt: 9, nb: 6, se: 7, sa2: 62, total: 84 },
    maths: { pt: 10, nb: 5, se: 8, sa2: 68, total: 91 },
    science: { pt: 9, nb: 6, se: 7, sa2: 65, total: 87 },
    sst: { pt: 9, nb: 5, se: 6, sa2: 63, total: 83 },
    computer: { pt: 10, nb: 5, se: 8, sa2: 70, total: 93 },
    mv: 'A+',
    gk: 'A+',
    draw: 'A+',
  },
  {
    sno: 5,
    rollNo: 5,
    name: 'Vijay Singh',
    english: { pt: 6, nb: 4, se: 4, sa2: 50, total: 64 },
    hindi: { pt: 7, nb: 5, se: 5, sa2: 52, total: 69 },
    maths: { pt: 7, nb: 5, se: 5, sa2: 55, total: 72 },
    science: { pt: 6, nb: 4, se: 4, sa2: 50, total: 64 },
    sst: { pt: 7, nb: 5, se: 5, sa2: 52, total: 69 },
    computer: { pt: 8, nb: 5, se: 6, sa2: 58, total: 77 },
    mv: 'B',
    gk: 'B',
    draw: 'C',
  },
];

// Add student data rows
students.forEach(student => {
  data.push([
    student.sno,
    student.rollNo,
    student.name,
    student.english.pt, student.english.nb, student.english.se, student.english.sa2, student.english.total,
    student.hindi.pt, student.hindi.nb, student.hindi.se, student.hindi.sa2, student.hindi.total,
    student.maths.pt, student.maths.nb, student.maths.se, student.maths.sa2, student.maths.total,
    student.science.pt, student.science.nb, student.science.se, student.science.sa2, student.science.total,
    student.sst.pt, student.sst.nb, student.sst.se, student.sst.sa2, student.sst.total,
    student.computer.pt, student.computer.nb, student.computer.se, student.computer.sa2, student.computer.total,
    student.mv,
    student.gk,
    student.draw,
    '', // TOTAL
    '', // %
    '', // POSITION
  ]);
});

// Create worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Add merges for subject headers
const merges = [
  // ENGLISH (columns D to H, which are indices 3-7)
  { s: { r: 0, c: 3 }, e: { r: 0, c: 7 } },
  // HINDI (columns I to M, which are indices 8-12)
  { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } },
  // MATHS (columns N to R, which are indices 13-17)
  { s: { r: 0, c: 13 }, e: { r: 0, c: 17 } },
  // SCIENCE (columns S to W, which are indices 18-22)
  { s: { r: 0, c: 18 }, e: { r: 0, c: 22 } },
  // SST (columns X to AB, which are indices 23-27)
  { s: { r: 0, c: 23 }, e: { r: 0, c: 27 } },
  // COMPUTER (columns AC to AG, which are indices 28-32)
  { s: { r: 0, c: 28 }, e: { r: 0, c: 32 } },
];

ws['!merges'] = merges;

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Class 5-A');

// Write file
XLSX.writeFile(wb, 'testdata_complex_structure.xlsx');

console.log('Complex test Excel file generated: testdata_complex_structure.xlsx');
