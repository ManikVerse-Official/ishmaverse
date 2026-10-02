"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBJECT_NAME_VARIANTS = exports.OVERALL_FIELD_SYNONYMS = exports.FIELD_ALIASES = void 0;
exports.normalizeHeader = normalizeHeader;
exports.isKnownNonSubjectHeader = isKnownNonSubjectHeader;
exports.canonicalizeSubjectName = canonicalizeSubjectName;
exports.looksLikeSubjectHeader = looksLikeSubjectHeader;
function normalizeHeader(input) {
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
exports.FIELD_ALIASES = [
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
            'admission no',
            'admission number',
            'adm no',
            'admission number',
            'registration no',
            'registration number',
            'reg no',
            'enrollment no',
            'enrollment number',
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
            'days present',
            'attendance percentage',
            'present days',
            'total days',
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
exports.OVERALL_FIELD_SYNONYMS = [
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
function isKnownNonSubjectHeader(header) {
    const norm = normalizeHeader(header);
    if (!norm)
        return false;
    const matchesAlias = exports.FIELD_ALIASES.some((fa) => fa.aliases.some((a) => {
        const normAlias = normalizeHeader(a);
        return norm === normAlias || norm.includes(normAlias);
    }));
    if (matchesAlias)
        return true;
    for (const syn of exports.OVERALL_FIELD_SYNONYMS) {
        const normSyn = normalizeHeader(syn);
        if (norm === normSyn || norm.includes(normSyn)) {
            return true;
        }
    }
    if (/^(obtained|marks|score|grade)$/.test(norm))
        return true;
    if (norm.includes('max') || norm.includes('total'))
        return true;
    return false;
}
exports.SUBJECT_NAME_VARIANTS = {
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
function canonicalizeSubjectName(raw) {
    const norm = normalizeHeader(raw);
    if (exports.SUBJECT_NAME_VARIANTS[norm])
        return exports.SUBJECT_NAME_VARIANTS[norm];
    return norm.replace(/\b\w/g, (c) => c.toUpperCase());
}
function looksLikeSubjectHeader(header) {
    const norm = normalizeHeader(header);
    if (!norm)
        return false;
    if (norm.length > 60)
        return false;
    if (isKnownNonSubjectHeader(header))
        return false;
    const isCoreField = exports.FIELD_ALIASES.some((fa) => fa.aliases.some((a) => norm === a || norm.startsWith(a + ' ')));
    if (isCoreField)
        return false;
    return true;
}
