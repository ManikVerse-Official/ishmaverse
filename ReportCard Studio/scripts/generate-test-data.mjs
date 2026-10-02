import * as XLSX from 'xlsx';

const firstNames = [
  'Aarav', 'Ananya', 'Riya', 'Aryan', 'Ishaan', 'Saanvi', 'Vivaan', 'Diya',
  'Kabir', 'Myra', 'Arjun', 'Anika', 'Reyansh', 'Aadhya', 'Krishna', 'Pari',
  'Ishita', 'Siddharth', 'Rohan', 'Anjali', 'Nisha', 'Rahul', 'Sneha', 'Aditya',
  'Neha', 'Dev', 'Sara', 'Yash', 'Tanya', 'Karan', 'Kavya', 'Mohit', 'Priya',
  'Samarth', 'Ridhi', 'Harsh', 'Shreya', 'Atharv', 'Khushi', 'Vihaan',
  'Shubham', 'Aaditya', 'Sneha', 'Priya', 'Rahul', 'Neha', 'Ankita', 'Vivek',
];
const lastNames = [
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Mehta', 'Patel', 'Iyer',
  'Rao', 'Khan', 'Joshi', 'Nair', 'Kapoor', 'Saxena', 'Tiwari', 'Desai',
  'Bose', 'Chatterjee', 'Das', 'Roy', 'Srivastava', 'Malhotra', 'Chopra',
];
const fathers = ['Rajesh', 'Rakesh', 'Amit', 'Suresh', 'Vijay', 'Ajay', 'Ramesh', 'Mukesh', 'Anil', 'Sunil'];
const mothers = ['Neha', 'Pooja', 'Priya', 'Meera', 'Kavita', 'Anita', 'Seema', 'Rina', 'Suman', 'Shilpa'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function buildRow(i, opts) {
  const subjects = opts.subjects;
  const maxes = opts.maxes;
  const fn = pick(firstNames);
  const ln = pick(lastNames);
  const isEdge = opts.edgeCases;
  const markRow = {};
  subjects.forEach((s, idx) => {
    const mx = maxes[idx];
    const chance = Math.random();
    if (isEdge && idx === 0 && i === 5) markRow[s] = 'AB';
    else if (isEdge && idx === 1 && i === 7) markRow[s] = 'EX';
    else if (isEdge && idx === 2 && i === 9) markRow[s] = 'Medical';
    else if (isEdge && idx === 3 && i === 3) markRow[s] = mx + 10;
    else if (isEdge && i === 4 && idx < 2) markRow[s] = '';
    else if (chance < 0.05) markRow[s] = 'AB';
    else if (chance < 0.08) markRow[s] = 'EX';
    else markRow[s] = rand(35, mx);
  });

  let roll = i + 1;
  if (isEdge && i === 6) roll = 5;

  let attendance = `${rand(70, 100)}%`;
  if (isEdge && i === 8) attendance = 'N/A';

  return {
    Roll: roll,
    Name: `${fn} ${ln}`,
    Class: '8',
    Section: 'A',
    'Father Name': `${pick(fathers)} ${ln}`,
    'Mother Name': `${pick(mothers)} ${ln}`,
    DOB: `2013-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
    Attendance: attendance,
    Photo: `${roll}.jpg`,
    ...markRow,
  };
}

function writeXlsx(rows, fileName) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, fileName);
  console.log(`Wrote ${fileName} with ${rows.length} students`);
}

const commonSubjects = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'];
const commonMaxes = [100, 100, 100, 100, 100, 50];

const altSubjects = ['English', 'Sanskrit', 'Maths', 'Physics', 'Chemistry', 'Biology', 'IT'];
const altMaxes = [100, 50, 80, 70, 70, 70, 100];

const rows10 = Array.from({ length: 10 }, (_, i) =>
  buildRow(i, { subjects: commonSubjects, maxes: commonMaxes, edgeCases: true }),
);
writeXlsx(rows10, 'testdata_10_students.xlsx');

const rows50 = Array.from({ length: 50 }, (_, i) =>
  buildRow(i, { subjects: commonSubjects, maxes: commonMaxes, edgeCases: false }),
);
rows50[20] = { ...rows50[20], Name: rows50[33].Name };
rows50[44] = { ...rows50[44], Name: rows50[1].Name };
rows50[30] = { ...rows50[30], Roll: 7 };
writeXlsx(rows50, 'testdata_50_students.xlsx');

const rowsAlt = Array.from({ length: 15 }, (_, i) =>
  buildRow(i, { subjects: altSubjects, maxes: altMaxes, edgeCases: true }),
);
writeXlsx(rowsAlt, 'testdata_alt_subjects.xlsx');

console.log('Test Excel files generated.');
