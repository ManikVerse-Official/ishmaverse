/*
 * Stress workbook for layout / data-safety testing.
 *
 * Covers the cases that historically broke the report card:
 *   - a very long school name in the workbook title row,
 *   - the exact reported father's name ("MR.CHARNJEET SINGH ..."),
 *   - long mother's names, long addresses, long remarks,
 *   - long subject names,
 *   - different maximum marks (25 / 40 / 50 / 80 / 100) via component columns,
 *   - a subject level GRADE column inside a subject group,
 *   - duplicate student names, missing photos and AB/EX values.
 */
import * as XLSX from 'xlsx';

const TITLE =
  'SHAHEED BHAGAT SINGH SENIOR SECONDARY PUBLIC SCHOOL OF EXCELLENCE (AFFILIATED TO C.B.S.E., NEW DELHI) — CLASS-8th';

const gradeSubjects = ['MATHEMATICS', 'ENGLISH LANGUAGE AND LITERATURE', 'COMPUTER APPLICATIONS'];
const singleSubjects = ['ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT', 'GENERAL KNOWLEDGE', 'ARTIFICIAL INTELLIGENCE'];

const SUBJECT_COLUMNS = [
  { group: 'MATHEMATICS', components: ['PT (10)', 'NB (5)', 'SEA (5)', 'SA2 (60)', 'GRADE', 'TOTAL (80)'] },
  { group: 'ENGLISH LANGUAGE AND LITERATURE', components: ['PT (5)', 'NB (5)', 'SEA (5)', 'SA2 (35)', 'TOTAL (50)'] },
  { group: 'COMPUTER APPLICATIONS', components: ['PT (20)', 'NB (10)', 'SEA (10)', 'GRADE', 'TOTAL (100)'] },
  { group: 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT', components: ['MARKS (50)'] },
  { group: 'GENERAL KNOWLEDGE', components: ['MARKS (25)'] },
  { group: 'ARTIFICIAL INTELLIGENCE', components: ['MARKS (40)'] },
];

const IDENTITY = ['Sr. No.', 'Student Name', "Father's Name", "Mother's Name", 'Admission No.', 'D.O.B', 'Address', 'Attendance', 'Photo'];
const CO_SCHOLASTIC = ['MV', 'GK', 'WORK EXPERIENCE', 'Life Skills', 'TOTAL', '%', 'POSITION', 'Teacher Remarks', 'Principal Remarks'];

const groupRow = [...IDENTITY];
for (const subject of SUBJECT_COLUMNS) {
  for (let i = 0; i < subject.components.length; i++) groupRow.push(subject.group);
}
groupRow.push(...CO_SCHOLASTIC);

const componentRow = new Array(IDENTITY.length).fill('');
for (const subject of SUBJECT_COLUMNS) {
  componentRow.push(...subject.components);
}
componentRow.push(...new Array(CO_SCHOLASTIC.length).fill(''));

const LONG_REMARKS =
  'Riya has shown steady improvement this term and her participation in class discussions has become noticeably more confident. She should continue to revise the concepts of fractions and decimals regularly, and a daily reading routine of at least twenty minutes will help her language skills considerably. Parents are requested to monitor the homework diary.';

const STUDENTS = [
  {
    name: 'EKANJOT Singh',
    father: 'MR.CHARNJEET SINGH SANDHU (S/O LATE SARDAR KARTAR SINGH)',
    mother: 'MRS. HARJINDER KAUR SANDHU',
    admission: 'ADM/2019/1043',
    dob: '2013-04-12',
    address: 'House No. 1043, Street No. 7, Guru Nanak Nagar, Near Old Bus Stand, Yamuna Nagar, Haryana - 135001',
    attendance: '94%',
    photo: '1_EKANJOT.jpg',
    marks: { MATHEMATICS: [9, 5, 5, 57, 'A1', 76], 'ENGLISH LANGUAGE AND LITERATURE': [5, 5, 5, 33, 48], 'COMPUTER APPLICATIONS': [19, 9, 10, 'A+', 96], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [46], 'GENERAL KNOWLEDGE': [23], 'ARTIFICIAL INTELLIGENCE': [38] },
  },
  {
    name: 'Aarav Sharma',
    father: 'MR. RAJESH SHARMA',
    mother: 'MRS. SUNITA SHARMA',
    admission: 'ADM/2019/1044',
    dob: '2013-06-30',
    address: 'Ward No. 4, Model Town, Jagadhri, Yamuna Nagar',
    attendance: '88%',
    photo: '',
    marks: { MATHEMATICS: [8, 4, 4, 48, 'B1', 64], 'ENGLISH LANGUAGE AND LITERATURE': [4, 4, 4, 28, 40], 'COMPUTER APPLICATIONS': [16, 8, 8, 'B1', 74], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [38], 'GENERAL KNOWLEDGE': [19], 'ARTIFICIAL INTELLIGENCE': [31] },
  },
  {
    name: 'Riya Verma',
    father: 'MR. DINESH VERMA',
    mother: 'MRS. KAVITA VERMA',
    admission: 'ADM/2019/1045',
    dob: '2013-01-19',
    address: 'Village Jhiwerheri, Post Office Khizrabad, Yamuna Nagar, Haryana',
    attendance: '71%',
    photo: '',
    teacherRemarks: LONG_REMARKS,
    principalRemarks:
      'Steady progress has been observed. Regular revision and improved attendance will help Riya reach the next performance band.',
    marks: { MATHEMATICS: [5, 2, 3, 28, 'C2', 38], 'ENGLISH LANGUAGE AND LITERATURE': [3, 3, 3, 21, 30], 'COMPUTER APPLICATIONS': [11, 5, 6, 'C', 48], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [24], 'GENERAL KNOWLEDGE': [12], 'ARTIFICIAL INTELLIGENCE': [18] },
  },
  {
    name: 'Aarav Sharma',
    father: 'MR. MOHAN SHARMA',
    mother: 'MRS. REKHA SHARMA',
    admission: 'ADM/2019/1046',
    dob: '2013-08-08',
    address: 'Sector 17, Housing Board Colony, Jagadhri',
    attendance: '96%',
    photo: '4_AARAV.jpg',
    marks: { MATHEMATICS: [10, 5, 5, 59, 'A+', 79], 'ENGLISH LANGUAGE AND LITERATURE': [5, 5, 5, 34, 49], 'COMPUTER APPLICATIONS': [20, 10, 10, 'A1', 98], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [48], 'GENERAL KNOWLEDGE': [24], 'ARTIFICIAL INTELLIGENCE': [39] },
  },
  {
    name: 'Vijay Singh Chauhan',
    father: 'MR. SURINDER SINGH CHAUHAN',
    mother: 'MRS. BALJIT KAUR',
    admission: 'ADM/2019/1047',
    dob: '2013-11-23',
    address: 'Near Gurudwara Sahib, Radaur Road, Yamuna Nagar',
    attendance: '63%',
    photo: '',
    marks: { MATHEMATICS: ['AB', 'AB', 'AB', 'AB', 'AB', 'AB'], 'ENGLISH LANGUAGE AND LITERATURE': [3, 3, 3, 20, 29], 'COMPUTER APPLICATIONS': ['EX', 'EX', 'EX', 'EX', 'EX'], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [26], 'GENERAL KNOWLEDGE': [14], 'ARTIFICIAL INTELLIGENCE': [22] },
  },
  {
    name: 'Ananya Gupta',
    father: 'MR. VIKRAM GUPTA',
    mother: 'MRS. NEHA GUPTA',
    admission: 'ADM/2019/1048',
    dob: '2013-03-05',
    address: 'House 22, Green Park, Yamuna Nagar',
    attendance: '99%',
    photo: '',
    marks: { MATHEMATICS: [10, 5, 5, 58, 'A+', 78], 'ENGLISH LANGUAGE AND LITERATURE': [5, 5, 5, 34, 49], 'COMPUTER APPLICATIONS': [20, 9, 10, 'A+', 97], 'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT': [47], 'GENERAL KNOWLEDGE': [23], 'ARTIFICIAL INTELLIGENCE': [37] },
  },
];

const data = [new Array(groupRow.length).fill(''), groupRow, componentRow];

STUDENTS.forEach((student, index) => {
  const row = [
    index + 1,
    student.name,
    student.father,
    student.mother,
    student.admission,
    student.dob,
    student.address,
    student.attendance,
    student.photo || '',
  ];
  for (const subject of SUBJECT_COLUMNS) {
    const marks = student.marks[subject.group];
    row.push(...marks);
  }
  const academic = SUBJECT_COLUMNS.filter((s) => gradeSubjects.includes(s.group) || singleSubjects.includes(s.group));
  const totalMax = 295;
  const obtained = academic.reduce((sum, subject) => {
    const marks = student.marks[subject.group];
    const value = marks[marks.length - 1];
    return typeof value === 'number' ? sum + value : sum;
  }, 0);
  row.push(
    ['A', 'A+', 'B'][index % 3],
    ['A+', 'B', 'A'][index % 3],
    'A',
    ['A', 'B+', 'B'][index % 3],
    obtained,
    Math.round((obtained / totalMax) * 100),
    index + 1,
    student.teacherRemarks || '',
    student.principalRemarks || '',
  );
  data.push(row);
});

data[0][0] = TITLE;

const worksheet = XLSX.utils.aoa_to_sheet(data);
const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: groupRow.length - 1 } }];
let column = IDENTITY.length;
for (const subject of SUBJECT_COLUMNS) {
  merges.push({ s: { r: 1, c: column }, e: { r: 1, c: column + subject.components.length - 1 } });
  column += subject.components.length;
}
worksheet['!merges'] = merges;

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Class 8-A');
XLSX.writeFile(workbook, 'testdata_layout_stress.xlsx');
console.log(`Wrote testdata_layout_stress.xlsx with ${STUDENTS.length} students`);
