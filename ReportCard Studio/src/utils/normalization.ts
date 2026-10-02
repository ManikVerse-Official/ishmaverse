export function normalizeHeader(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[._\-/\\]/g, ' ')
    .replace(/['''`"]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .replace(/[.,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FieldAliasMap {
  field: string;
  aliases: string[];
}

export const FIELD_ALIASES: FieldAliasMap[] = [
  {
    field: 'name',
    aliases: [
      'name',
      'student name',
      'students name',
      'student s name',
      'student',
      'full name',
      'studentname',
      's name',
      'name of student',
      'student s name',
    ],
  },
  {
    field: 'rollNo',
    aliases: [
      'sr no',
      'srno',
      's no',
      'sno',
      'serial no',
      'serial number',
      'sl no',
      'roll',
      'roll no',
      'roll number',
      'rollno',
      'r no',
      'rno',
    ],
  },
  {
    field: 'admissionNo',
    aliases: [
      'admission no',
      'admission number',
      'adm no',
      'admission',
      'registration no',
      'registration number',
      'reg no',
      'enrollment no',
      'enrollment number',
      'scholar no',
      'scholar number',
    ],
  },
  {
    field: 'class',
    aliases: ['class', 'standard', 'std', 'grade', 'klass', 'cls'],
  },
  {
    field: 'section',
    aliases: ['section', 'sec', 'division', 'div'],
  },
  {
    field: 'fatherName',
    aliases: [
      'father name',
      'father',
      'fathers name',
      'father s name',
      'fathername',
      'f name',
      'guardian',
      'guardian name',
      'parent name',
      'parent',
    ],
  },
  {
    field: 'motherName',
    aliases: [
      'mother name',
      'mother',
      'mothers name',
      'mother s name',
      'mothername',
      'm name',
    ],
  },
  {
    field: 'dob',
    aliases: [
      'dob',
      'd o b',
      'date of birth',
      'birth date',
      'birthday',
      'date of birth',
      'birthdate',
    ],
  },
  {
    field: 'attendance',
    aliases: [
      'attendance',
      'attendance %',
      'attendance percent',
      'attendance percentage',
    ],
  },
  {
    field: 'workingDays',
    aliases: [
      'total working days',
      'working days',
      'working day',
      'total days',
      'no of working days',
    ],
  },
  {
    field: 'daysPresent',
    aliases: [
      'days present',
      'present days',
      'days attended',
      'no of days present',
    ],
  },
  {
    field: 'photoFilename',
    aliases: [
      'photo',
      'photo filename',
      'photo name',
      'image',
      'image filename',
      'photograph',
      'pic',
      'picture',
    ],
  },
  {
    field: 'teacherRemarks',
    aliases: [
      'teacher remarks',
      'remarks',
      'class teacher remarks',
      'comments',
      'teacher comment',
      'class teacher comments',
    ],
  },
  {
    field: 'principalRemarks',
    aliases: [
      'principal remarks',
      'headmaster remarks',
      'principal comment',
      'headmaster comment',
    ],
  },
  {
    field: 'address',
    aliases: [
      'address',
      'residential address',
      'permanent address',
      'home address',
      'city',
      'location',
    ],
  },
  {
    field: 'position',
    aliases: [
      'position',
      'rank',
      'class rank',
      'overall rank',
      'standing',
    ],
  },
];

export const OVERALL_FIELD_SYNONYMS = [
  'total',
  'grand total',
  'overall total',
  'percentage',
  'percent',
  'position',
  'rank',
  'attendance',
  'days present',
  'remarks',
  'comment',
];

export function isKnownNonSubjectHeader(header: string): boolean {
  const norm = normalizeHeader(header);
  if (!norm) return false;

  const matchesAlias = FIELD_ALIASES.some((fa) =>
    fa.aliases.some((a) => {
      const normAlias = normalizeHeader(a);
      return norm === normAlias || norm.includes(normAlias);
    }),
  );
  if (matchesAlias) return true;

  for (const syn of OVERALL_FIELD_SYNONYMS) {
    const normSyn = normalizeHeader(syn);
    if (norm === normSyn || norm.includes(normSyn)) {
      return true;
    }
  }

  if (/^(obtained|marks|score|grade)$/.test(norm)) return true;
  if (norm.includes('max') || norm.includes('total')) return true;

  return false;
}

export const SUBJECT_NAME_VARIANTS: Record<string, string> = {
  maths: 'Mathematics',
  math: 'Mathematics',
  mathematics: 'Mathematics',
  'maths em': 'Mathematics',
  sci: 'Science',
  science: 'Science',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  english: 'English',
  eng: 'English',
  hindi: 'Hindi',
  'hindi em': 'Hindi',
  urdu: 'Urdu',
  sanskrit: 'Sanskrit',
  sans: 'Sanskrit',
  punjabi: 'Punjabi',
  gujarati: 'Gujarati',
  marathi: 'Marathi',
  tamil: 'Tamil',
  telugu: 'Telugu',
  bengali: 'Bengali',
  kannada: 'Kannada',
  malayalam: 'Malayalam',
  sst: 'Social Science',
  'social science': 'Social Science',
  social: 'Social Science',
  'social studies': 'Social Science',
  history: 'History',
  geography: 'Geography',
  civics: 'Civics',
  economics: 'Economics',
  evs: 'EVS',
  'environmental studies': 'EVS',
  'environmental science': 'EVS',
  gk: 'GK',
  'general knowledge': 'GK',
  computer: 'Computer',
  'computer science': 'Computer',
  cs: 'Computer',
  it: 'IT',
  'information technology': 'IT',
  drawing: 'Drawing',
  art: 'Art',
  'value education': 'Value Education',
  'moral science': 'Moral Science',
  'physical education': 'Physical Education',
  pe: 'Physical Education',
  sport: 'Sports',
  sports: 'Sports',
  music: 'Music',
  dance: 'Dance',
  yoga: 'Yoga',
  'third language': 'Third Language',
  'second language': 'Second Language',
};

export function canonicalizeSubjectName(raw: string): string {
  const norm = normalizeHeader(raw);
  if (SUBJECT_NAME_VARIANTS[norm]) return SUBJECT_NAME_VARIANTS[norm];
  return norm.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function looksLikeSubjectHeader(header: string): boolean {
  const norm = normalizeHeader(header);
  if (!norm) return false;
  if (norm.length > 60) return false;

  if (isKnownNonSubjectHeader(header)) return false;

  const isCoreField = FIELD_ALIASES.some((fa) =>
    fa.aliases.some((a) => norm === a || norm.startsWith(a + ' ')),
  );
  if (isCoreField) return false;

  return true;
}
