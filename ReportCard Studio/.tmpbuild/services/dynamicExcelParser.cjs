"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDynamicStructure = parseDynamicStructure;
exports.convertColumnToLetter = convertColumnToLetter;
exports.convertLetterToColumn = convertLetterToColumn;
const XLSX = __importStar(require("xlsx"));
const normalization_1 = require("../utils/normalization");
const COMMON_HEADER_TERMS = [
    'name',
    'roll',
    'serial',
    'sr',
    'admission',
    'father',
    'mother',
    'dob',
    'birth',
    'class',
    'section',
    'address',
    'english',
    'hindi',
    'math',
    'mathematics',
    'science',
    'sci',
    'social',
    'sst',
    'computer',
    'pt',
    'nb',
    'se',
    'sa',
    'sa1',
    'sa2',
    'total',
    'percentage',
    'attendance',
    'position',
    'marks',
    'grade',
    'rank',
    'physics',
    'chemistry',
    'biology',
    'history',
    'geography',
    'civics',
    'economics',
    'sanskrit',
    'urdu',
    'punjabi',
    'marathi',
    'tamil',
    'telugu',
    'bengali',
    'kannada',
    'malayalam',
    'gujarati',
    'art',
    'music',
    'sports',
    'yoga',
    'gk',
    'evs',
    'drawing',
];
const NON_SUBJECT_WORDS = [
    'student',
    'students',
    'name',
    'father',
    'mother',
    'dob',
    'dateofbirth',
    'birth',
    'address',
    'house',
    'roll',
    'serial',
    'sr',
    'sno',
    'admission',
    'class',
    'section',
    'photo',
    'photograph',
    'image',
    'remarks',
    'remark',
    'comment',
    'comments',
    'attendance',
    'present',
    'workingdays',
    'position',
    'rank',
    'percentage',
    'percent',
    'grandtotal',
    'overalltotal',
];
const SUBJECT_INDICATORS = [
    'english',
    'hindi',
    'math',
    'mathematics',
    'science',
    'sci',
    'social',
    'sst',
    'computer',
    'physics',
    'chemistry',
    'biology',
    'economics',
    'history',
    'geography',
    'civics',
    'sanskrit',
    'french',
    'german',
    'spanish',
    'urdu',
    'punjabi',
    'marathi',
    'tamil',
    'telugu',
    'bengali',
    'kannada',
    'malayalam',
    'gujarati',
    'evs',
    'environmentalstudies',
];
const GRADE_SUBJECT_INDICATORS = [
    'gk',
    'general knowledge',
    'art',
    'drawing',
    'draw',
    'music',
    'physical education',
    'pe',
    'sports',
    'yoga',
    'moral',
    'moral values',
    'mv',
    'moral value',
    'value education',
    'work education',
    'art education',
    'computer literacy',
    'discipline',
];
const COMPONENT_TERMS = [
    'pt',
    'periodic test',
    'unit test',
    'ut',
    'assignment',
    'activity',
    'notebook',
    'nb',
    'classwork',
    'cw',
    'homework',
    'hw',
    'project',
    'internal',
    'term',
    'exam',
    'theory',
    'practical',
    'oral',
    'viva',
    'written',
    'half yearly',
    'annual',
    'final',
    'sa',
    'fa',
];
const STUDENT_FIELD_NAMES = [
    'dob',
    'address',
    'fatherName',
    'motherName',
    'name',
    'rollNo',
    'class',
    'section',
    'photo',
    'attendance',
    'remarks',
];
function parseDynamicStructure(file, requestedSheetName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            reject(reader.error ?? new Error('File read failed'));
        };
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (!(result instanceof ArrayBuffer)) {
                    reject(new Error('Invalid workbook data'));
                    return;
                }
                const data = new Uint8Array(result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true,
                    raw: true,
                });
                const sheetName = requestedSheetName &&
                    workbook.SheetNames.includes(requestedSheetName)
                    ? requestedSheetName
                    : workbook.SheetNames[0];
                if (!sheetName) {
                    reject(new Error('No worksheet found in workbook'));
                    return;
                }
                const worksheet = workbook.Sheets[sheetName];
                if (!worksheet || !worksheet['!ref']) {
                    reject(new Error('Worksheet is empty'));
                    return;
                }
                resolve(analyzeSheetStructure(worksheet));
            }
            catch (error) {
                reject(error instanceof Error
                    ? error
                    : new Error('Unable to parse Excel workbook'));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
function analyzeSheetStructure(ws) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const mergedCells = extractMergedCells(ws);
    const { headerRows, dataStartRow } = detectHeaderRows(ws, range, mergedCells);
    const effectiveHeaders = buildEffectiveColumnHeaders(ws, range, headerRows, mergedCells);
    const classifications = classifyColumns(ws, range, effectiveHeaders, dataStartRow);
    const studentFields = classifications
        .filter((item) => item.studentField)
        .map((item) => ({
        excelColumn: item.col,
        excelHeader: item.header.path,
        fieldType: item.studentField,
        confidence: item.studentConfidence,
    }));
    const overallFields = classifications
        .filter((item) => item.overallField &&
        !item.studentField)
        .map((item) => ({
        name: item.header.path,
        col: item.col,
        fieldType: item.overallField,
        confidence: calculateOverallFieldConfidence(item.header.leaf, item.overallField),
    }));
    const { subjectGroups, gradeFields } = buildSubjectGroups(classifications);
    const confidence = calculateConfidence(studentFields, subjectGroups, gradeFields, overallFields);
    return {
        studentFields,
        subjectGroups,
        gradeFields,
        overallFields,
        headerRows,
        dataStartRow,
        confidence,
    };
}
/* -------------------------------------------------------------------------- */
/* WORKBOOK / MERGED CELLS                                                    */
/* -------------------------------------------------------------------------- */
function extractMergedCells(ws) {
    const merges = ws['!merges'] || [];
    return merges.map((merge) => {
        const startRow = merge.s.r;
        const endRow = merge.e.r;
        const startCol = merge.s.c;
        const endCol = merge.e.c;
        const cellRef = XLSX.utils.encode_cell({
            r: startRow,
            c: startCol,
        });
        const cell = ws[cellRef];
        return {
            startRow,
            endRow,
            startCol,
            endCol,
            value: cell ? String(cell.v ?? '').trim() : '',
        };
    });
}
function findMergeAtPosition(mergedCells, row, col) {
    return mergedCells.find((merge) => row >= merge.startRow &&
        row <= merge.endRow &&
        col >= merge.startCol &&
        col <= merge.endCol);
}
function getCellText(ws, row, col) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = ws[cellRef];
    if (!cell)
        return '';
    return String(cell.v ?? '').trim();
}
/* -------------------------------------------------------------------------- */
/* HEADER DETECTION                                                           */
/* -------------------------------------------------------------------------- */
function detectHeaderRows(ws, range, mergedCells) {
    const maxScanRows = Math.min(range.e.r, range.s.r + 10);
    let bestHeaderEnd = range.s.r;
    let bestScore = -Infinity;
    for (let endRow = range.s.r; endRow <= maxScanRows; endRow++) {
        let score = 0;
        for (let row = range.s.r; row <= endRow; row++) {
            score += scoreHeaderRow(ws, range, row, mergedCells);
        }
        const dataScore = scoreDataRowsAfter(ws, range, endRow + 1);
        const combinedScore = score + dataScore;
        if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestHeaderEnd = endRow;
        }
    }
    let headerRows = bestHeaderEnd - range.s.r + 1;
    /*
     * Never allow an excessive number of header rows.
     * Most school Excel files use 1-4 actual header rows.
     */
    headerRows = Math.max(1, Math.min(headerRows, 4));
    /*
     * A vertically merged field such as D.O.B or Student Name
     * can span the whole header section. Include its rows.
     */
    const verticalHeaderSpan = mergedCells
        .filter((merge) => merge.startRow <=
        range.s.r + headerRows - 1 &&
        merge.endRow >
            range.s.r + headerRows - 1 &&
        merge.endRow - merge.startRow <= 4)
        .reduce((max, merge) => Math.max(max, merge.endRow -
        range.s.r +
        1), headerRows);
    headerRows = Math.max(1, Math.min(verticalHeaderSpan, 4));
    const dataStartRow = findDataStartRow(ws, range, headerRows);
    return {
        headerRows,
        dataStartRow,
    };
}
function scoreHeaderRow(ws, range, row, mergedCells) {
    let nonEmpty = 0;
    let textCells = 0;
    let numericCells = 0;
    let commonTerms = 0;
    let mergedHeaderCells = 0;
    for (let col = range.s.c; col <= range.e.c; col++) {
        const text = getCellText(ws, row, col);
        if (!text)
            continue;
        nonEmpty++;
        const numeric = Number(text);
        if (Number.isFinite(numeric) &&
            text.trim() !== '') {
            numericCells++;
        }
        else {
            textCells++;
            const normalized = safeNormalize(text);
            if (COMMON_HEADER_TERMS.some((term) => normalized.includes(safeNormalize(term)))) {
                commonTerms++;
            }
        }
        if (mergedCells.some((merge) => merge.startRow === row &&
            merge.endRow >= row &&
            merge.startCol <= col &&
            merge.endCol >= col)) {
            mergedHeaderCells++;
        }
    }
    if (nonEmpty === 0)
        return -10;
    const textRatio = textCells / nonEmpty;
    const numericRatio = numericCells / nonEmpty;
    let score = 0;
    score += textRatio * 3;
    score += commonTerms > 0 ? 3 : 0;
    score += mergedHeaderCells > 0 ? 2 : 0;
    score -= numericRatio * 4;
    /*
     * Data rows normally contain repeated numeric values.
     * Header rows generally contain labels.
     */
    if (textRatio >= 0.5)
        score += 2;
    if (numericRatio >= 0.6)
        score -= 5;
    return score;
}
function scoreDataRowsAfter(ws, range, startRow) {
    if (startRow > range.e.r)
        return -2;
    let score = 0;
    let checked = 0;
    for (let row = startRow; row <= Math.min(range.e.r, startRow + 3); row++) {
        const values = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const text = getCellText(ws, row, col);
            if (text)
                values.push(text);
        }
        if (!values.length)
            continue;
        checked++;
        const numeric = values.filter((value) => Number.isFinite(Number(value))).length;
        const numericRatio = numeric / values.length;
        if (numericRatio >= 0.25) {
            score += 3;
        }
        if (values.length >= 3) {
            score += 1;
        }
    }
    return checked > 0 ? score : -3;
}
function findDataStartRow(ws, range, headerRows) {
    const firstCandidate = range.s.r + headerRows;
    let candidate = firstCandidate;
    for (let row = firstCandidate; row <= Math.min(range.e.r, firstCandidate + 8); row++) {
        const values = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const value = getCellText(ws, row, col);
            if (value)
                values.push(value);
        }
        if (!values.length)
            continue;
        const numericCount = values.filter((value) => Number.isFinite(Number(value))).length;
        const numericRatio = numericCount / values.length;
        const normalizedValues = values.map(safeNormalize);
        const hasHeaderWords = normalizedValues.some((value) => COMMON_HEADER_TERMS.some((term) => value.includes(safeNormalize(term))));
        if (numericRatio >= 0.25 ||
            (!hasHeaderWords && values.length >= 3)) {
            candidate = row;
            break;
        }
    }
    return Math.max(firstCandidate, candidate);
}
/* -------------------------------------------------------------------------- */
/* HEADER HIERARCHY                                                           */
/* -------------------------------------------------------------------------- */
function buildEffectiveColumnHeaders(ws, range, headerRows, mergedCells) {
    const result = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
        const labels = [];
        for (let row = range.s.r; row <
            range.s.r + headerRows; row++) {
            let text = getCellText(ws, row, col);
            /*
             * If this position is inside a merged cell,
             * inherit the actual merged-cell value.
             */
            if (!text) {
                const merge = findMergeAtPosition(mergedCells, row, col);
                if (merge) {
                    text = merge.value;
                }
            }
            text = cleanHeaderText(text);
            if (!text)
                continue;
            /*
             * Avoid repeating the same inherited label.
             * Example:
             * School Name
             * School Name
             * English
             */
            if (labels.length === 0 ||
                safeNormalize(labels[labels.length - 1]) !== safeNormalize(text)) {
                labels.push(text);
            }
        }
        const leaf = labels[labels.length - 1] ||
            `Column ${convertColumnToLetter(col)}`;
        const path = labels.join(' | ');
        result.push({
            col,
            labels,
            leaf,
            path,
            normalizedPath: safeNormalize(path),
            normalizedLeaf: safeNormalize(leaf),
        });
    }
    return result;
}
function cleanHeaderText(value) {
    return value
        .replace(/\s+/g, ' ')
        .replace(/\|+/g, ' | ')
        .trim();
}
function safeNormalize(value) {
    try {
        // Preserve % character for percentage detection
        const normalized = (0, normalization_1.normalizeHeader)(value);
        // Remove special chars but keep %
        return normalized
            .replace(/[^a-z0-9%]+/gi, '')
            .toLowerCase();
    }
    catch {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9%]+/g, '');
    }
}
/* -------------------------------------------------------------------------- */
/* COLUMN CLASSIFICATION                                                      */
/* -------------------------------------------------------------------------- */
function classifyColumns(ws, range, headers, dataStartRow) {
    return headers.map((header) => {
        const studentResult = identifyStudentField(header);
        const overallField = identifyOverallFieldFromPath(header);
        const numericRatio = calculateColumnNumericRatio(ws, range, header.col, dataStartRow);
        /*
         * Student fields ALWAYS win.
         *
         * This is the most important protection:
         * D.O.B / Father's Name / Address / Student Name
         * can never fall through into subject detection.
         */
        const isStudentField = studentResult.fieldType !==
            'ignore';
        const numericCoScholastic = isNumericCoScholasticColumn(header, numericRatio);
        const subject = !isStudentField &&
            !overallField &&
            (isAcademicColumn(header) ||
                numericCoScholastic) &&
            (numericRatio >= 0.15 ||
                hasMarksLikeHeader(header));
        /* Grade/co-scholastic columns are commonly TEXT grades (A/B/C,
           Excellent, Good, etc.), so numericRatio must NOT be required. */
        const grade = !isStudentField &&
            !overallField &&
            !numericCoScholastic &&
            isGradeColumn(header);
        return {
            col: header.col,
            header,
            studentField: isStudentField
                ? studentResult.fieldType
                : null,
            studentConfidence: studentResult.confidence,
            overallField: overallField?.fieldType ?? null,
            subject,
            grade,
            numericRatio,
        };
    });
}
function identifyStudentField(header) {
    /*
     * First inspect the complete hierarchy.
     * This solves duplicate flattened headers because
     * column position + parent labels are preserved.
     */
    const labels = header.labels;
    /*
     * Explicit hard-negative checks.
     * These fields are NEVER academic subjects.
     */
    if (labels.some((label) => isDobHeader(label))) {
        return {
            fieldType: 'dob',
            confidence: 0.99,
        };
    }
    if (labels.some((label) => isFatherHeader(label))) {
        return {
            fieldType: 'fatherName',
            confidence: 0.99,
        };
    }
    if (labels.some((label) => isMotherHeader(label))) {
        return {
            fieldType: 'motherName',
            confidence: 0.99,
        };
    }
    if (labels.some((label) => isAddressHeader(label))) {
        return {
            fieldType: 'address',
            confidence: 0.99,
        };
    }
    if (labels.some((label) => isRollHeader(label))) {
        return {
            fieldType: 'rollNo',
            confidence: 0.99,
        };
    }
    if (labels.some((label) => isStudentNameHeader(label))) {
        return {
            fieldType: 'name',
            confidence: 0.99,
        };
    }
    /*
     * Other known fields are resolved only after
     * the hard-negative checks above.
     */
    const candidates = [];
    for (const fa of normalization_1.FIELD_ALIASES) {
        for (const aliasRaw of fa.aliases) {
            const alias = safeNormalize(aliasRaw);
            if (!alias)
                continue;
            for (const label of labels) {
                const normalized = safeNormalize(label);
                if (!normalized)
                    continue;
                if (normalized === alias) {
                    candidates.push({
                        field: mapAliasFieldToFieldType(fa.field),
                        confidence: 0.94,
                    });
                }
            }
        }
    }
    /*
     * Do NOT use fuzzy matching for dangerous fields
     * such as name/father/DOB. It can create false positives.
     */
    const safeCandidate = candidates
        .filter((candidate) => candidate.field !==
        'ignore' &&
        candidate.field !==
            'address' &&
        candidate.field !==
            'position')
        .sort((a, b) => b.confidence -
        a.confidence)[0];
    if (safeCandidate) {
        return {
            fieldType: safeCandidate.field,
            confidence: safeCandidate.confidence,
        };
    }
    /*
     * Conservative fallback.
     * Unknown fields must NOT become student fields.
     */
    return {
        fieldType: 'ignore',
        confidence: 0,
    };
}
function isRollHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'srno' ||
        norm === 'sno' ||
        norm === 'serialno' ||
        norm === 'serialnumber' ||
        norm === 'rollno' ||
        norm === 'rollnumber' ||
        norm === 'studentrollno' ||
        norm === 'studentrollnumber' ||
        norm.includes('rollno') ||
        norm.includes('rollnumber'));
}
function isStudentNameHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'name' ||
        norm === 'studentname' ||
        norm === 'studentsname' ||
        norm === 'nameofstudent' ||
        norm === 'studentfullname');
}
function isFatherHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'fathername' ||
        norm === 'fathersname' ||
        norm === 'father' ||
        norm === 'parentfathername');
}
function isMotherHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'mothername' ||
        norm === 'mothersname' ||
        norm === 'mother');
}
function isDobHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'dob' ||
        norm === 'dateofbirth' ||
        norm === 'birthdate' ||
        norm === 'datebirth');
}
function isAddressHeader(text) {
    const norm = safeNormalize(text);
    return (norm === 'address' ||
        norm === 'studentaddress' ||
        norm === 'residentialaddress' ||
        norm === 'homeaddress');
}
/* -------------------------------------------------------------------------- */
/* SUBJECT DETECTION                                                          */
/* -------------------------------------------------------------------------- */
function isAcademicColumn(header) {
    /*
     * Inspect the complete path, not only the flattened leaf.
     *
     * Example:
     * English | PT
     * English | Notebook
     * English | Total
     *
     * All three belong to English.
     */
    const labels = header.labels;
    if (labels.some((label) => isForbiddenSubjectLabel(label))) {
        return false;
    }
    const path = safeNormalize(header.path);
    const leaf = safeNormalize(header.leaf);
    /*
     * A direct academic subject name.
     */
    if (SUBJECT_INDICATORS.some((indicator) => path.includes(safeNormalize(indicator)))) {
        return true;
    }
    /*
     * A marks component is only academic if
     * the hierarchy also provides an academic parent.
     *
     * This prevents random numeric columns from
     * becoming subjects.
     */
    if (COMPONENT_TERMS.some((term) => leaf.includes(safeNormalize(term)))) {
        return labels.some((label) => SUBJECT_INDICATORS.some((indicator) => safeNormalize(label).includes(safeNormalize(indicator))));
    }
    return false;
}
function isGradeColumn(header) {
    /* Grade/co-scholastic detection must not be blocked by generic
       non-subject rules. Check the actual grade indicators first. */
    const labels = header.labels ?? [];
    const normalizedLabels = labels.map(safeNormalize);
    const path = safeNormalize(header.path);
    const leaf = safeNormalize(header.leaf);
    const gradeMatch = GRADE_SUBJECT_INDICATORS.some((indicator) => {
        const token = safeNormalize(indicator);
        return token.length > 1 && (leaf === token ||
            normalizedLabels.some((label) => label === token) ||
            path.includes(token));
    });
    if (!gradeMatch)
        return false;
    // Hard-protect real student identity fields.
    return !labels.some((label) => isDobHeader(label) ||
        isFatherHeader(label) ||
        isMotherHeader(label) ||
        isAddressHeader(label) ||
        isStudentNameHeader(label) ||
        isRollHeader(label));
}
function isNumericCoScholasticColumn(header, numericRatio) {
    if (numericRatio < 0.75) {
        return false;
    }
    const labels = header.labels ?? [];
    const normalizedLabels = labels.map(safeNormalize);
    const path = safeNormalize(header.path);
    const leaf = safeNormalize(header.leaf);
    return GRADE_SUBJECT_INDICATORS.some((indicator) => {
        const token = safeNormalize(indicator);
        return token.length > 1 && (leaf === token ||
            normalizedLabels.some((label) => label === token) ||
            path.includes(token));
    });
}
function isForbiddenSubjectLabel(text) {
    const norm = safeNormalize(text);
    if (!norm)
        return true;
    /*
     * Never allow these to be interpreted as subjects.
     */
    if (NON_SUBJECT_WORDS.some((word) => norm === safeNormalize(word))) {
        return true;
    }
    if ((0, normalization_1.isKnownNonSubjectHeader)(text)) {
        return true;
    }
    if (isDobHeader(text) ||
        isFatherHeader(text) ||
        isMotherHeader(text) ||
        isAddressHeader(text) ||
        isStudentNameHeader(text) ||
        isRollHeader(text)) {
        return true;
    }
    return false;
}
function hasMarksLikeHeader(header) {
    const path = safeNormalize(header.path);
    return (path.includes('marks') ||
        path.includes('total') ||
        path.includes('max') ||
        path.includes('obtained') ||
        path.includes('score'));
}
/* -------------------------------------------------------------------------- */
/* SUBJECT GROUPING                                                           */
/* -------------------------------------------------------------------------- */
function buildSubjectGroups(classifications) {
    const subjectGroups = [];
    const gradeFields = [];
    /*
     * Grade columns are individual fields.
     */
    for (const item of classifications) {
        if (item.grade &&
            !item.studentField &&
            !item.overallField) {
            gradeFields.push({
                name: item.header.path,
                col: item.col,
                confidence: 0.92,
            });
        }
    }
    /*
     * Only genuine academic columns enter this phase.
     */
    const subjectColumns = classifications.filter((item) => item.subject &&
        !item.studentField &&
        !item.overallField &&
        !item.grade);
    /*
     * Group by the first meaningful academic label
     * in the hierarchy, while preserving column position.
     */
    let current = null;
    for (const item of subjectColumns) {
        const subjectName = getSubjectName(item.header, item.numericRatio);
        if (!subjectName)
            continue;
        const sameGroup = current &&
            normalizeGroupName(current.name) ===
                normalizeGroupName(subjectName) &&
            item.col === current.endCol + 1;
        if (!sameGroup) {
            if (current) {
                subjectGroups.push(createSubjectGroup(current.name, current.startCol, current.endCol, current.columns));
            }
            current = {
                name: subjectName,
                startCol: item.col,
                endCol: item.col,
                columns: [item],
            };
        }
        else {
            current.endCol = item.col;
            current.columns.push(item);
        }
    }
    if (current) {
        subjectGroups.push(createSubjectGroup(current.name, current.startCol, current.endCol, current.columns));
    }
    return {
        subjectGroups,
        gradeFields,
    };
}
function getSubjectName(header, numericRatio = 0) {
    /*
     * First prefer a known academic label. This keeps familiar school
     * subjects such as English, Hindi, Maths, Science, SCI., SST and
     * Computer stable without relying on the leaf/component name.
     */
    for (const label of header.labels) {
        if (SUBJECT_INDICATORS.some((indicator) => safeNormalize(label).includes(safeNormalize(indicator)))) {
            return cleanSubjectName(label);
        }
    }
    /*
     * Generic fallback for schools using subject names that are not in our
     * vocabulary. We only accept a parent/header label that looks like a
     * subject and whose column contains numeric marks. This keeps the
     * parser genuinely dynamic instead of requiring every possible subject
     * name to be hard-coded.
     *
     * Example:
     *   "Environmental Education | PT"
     *   "Artificial Intelligence | Theory"
     *   "Value Education | Total"
     *
     * The component itself is not selected as the subject name.
     */
    if (numericRatio >= 0.15 && header.labels.length > 1) {
        const candidates = header.labels
            .map((label) => cleanSubjectName(label))
            .filter(Boolean)
            .filter((label) => !isGenericHeaderLabel(label))
            .filter((label) => !isComponentLabel(label))
            .filter((label) => !isForbiddenSubjectLabel(label));
        if (candidates.length > 0) {
            /* Prefer the last meaningful parent label before the component. */
            return candidates[candidates.length - 1];
        }
    }
    /*
     * A single-column subject can have no component parent. For these files,
     * accept the leaf only when it is numeric and is not a known protected
     * field/header.
     */
    if (numericRatio >= 0.15 &&
        header.labels.length === 1 &&
        !isGenericHeaderLabel(header.leaf) &&
        !isComponentLabel(header.leaf) &&
        !isForbiddenSubjectLabel(header.leaf)) {
        return cleanSubjectName(header.leaf);
    }
    return null;
}
function isComponentLabel(text) {
    const normalized = safeNormalize(text);
    if (!normalized)
        return true;
    return COMPONENT_TERMS.some((term) => {
        const termNormalized = safeNormalize(term);
        return normalized === termNormalized ||
            normalized.includes(termNormalized);
    });
}
function isGenericHeaderLabel(text) {
    const normalized = safeNormalize(text);
    if (!normalized)
        return true;
    const generic = [
        'school',
        'schoolname',
        'publicschool',
        'schoolcode',
        'academic',
        'academicsession',
        'session',
        'term',
        'finalterm',
        'annual',
        'examination',
        'exam',
        'result',
        'reportcard',
        'marksheet',
        'class',
        'section',
        'subject',
        'subjects',
        'student',
        'students',
    ];
    if (generic.includes(normalized))
        return true;
    /* School-title style labels should never become subjects. */
    if (normalized.includes('publicschool') ||
        normalized.includes('school') && normalized.length > 8) {
        return true;
    }
    return false;
}
function cleanSubjectName(value) {
    return value
        .replace(/\s*\((?:max|marks?|out of)[^)]*\)/gi, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .trim();
}
function normalizeGroupName(value) {
    return safeNormalize(cleanSubjectName(value));
}
function createSubjectGroup(name, startCol, endCol, columns) {
    const components = [];
    let hasTotal = false;
    for (const item of columns) {
        const isTotal = isTotalColumn(item.header.leaf);
        if (isTotal) {
            hasTotal = true;
        }
        components.push({
            name: getComponentName(item.header),
            col: item.col,
            maxMarks: extractMaxMarks(item.header.path),
            isTotal,
        });
    }
    /*
     * If a subject has only a single column,
     * that column itself is the marks field.
     */
    return {
        name,
        startCol,
        endCol,
        components,
        hasTotal,
        confidence: calculateSubjectGroupConfidence(columns),
    };
}
function getComponentName(header) {
    if (header.labels.length <= 1) {
        return header.leaf;
    }
    /*
     * Remove the subject parent from the
     * component label.
     */
    const subjectIndex = header.labels.findIndex((label) => SUBJECT_INDICATORS.some((indicator) => safeNormalize(label).includes(safeNormalize(indicator))));
    if (subjectIndex >= 0 &&
        subjectIndex <
            header.labels.length - 1) {
        return header.labels
            .slice(subjectIndex + 1)
            .join(' | ');
    }
    return header.leaf;
}
function calculateSubjectGroupConfidence(columns) {
    if (!columns.length)
        return 0;
    const numericAverage = columns.reduce((sum, item) => sum + item.numericRatio, 0) / columns.length;
    const numericBonus = Math.min(numericAverage, 1) * 0.08;
    return Math.min(0.98, 0.88 + numericBonus);
}
/* -------------------------------------------------------------------------- */
/* OVERALL FIELDS                                                             */
/* -------------------------------------------------------------------------- */
function identifyOverallFieldFromPath(header) {
    /* Student identity fields always win. */
    if (header.labels.some((label) => isForbiddenStudentOverallLabel(label))) {
        return null;
    }
    /*
     * Use the leaf for standalone result columns. The full path may contain
     * school/class labels, so checking path === "TOTAL" or path === "%"
     * incorrectly misses valid overall columns.
     */
    const pathNorm = safeNormalize(header.path);
    const rawLeaf = String(header.leaf ?? '').trim();
    const leafNorm = rawLeaf === '%' ? '%' : safeNormalize(rawLeaf);
    if (leafNorm === '%' ||
        leafNorm === 'percent' ||
        leafNorm === 'percentage' ||
        pathNorm.endsWith('%') ||
        pathNorm.endsWith('percent') ||
        pathNorm.endsWith('percentage')) {
        return {
            fieldType: 'percentage',
            confidence: 0.98,
        };
    }
    const explicitOverallTotal = leafNorm === 'grandtotal' ||
        leafNorm === 'overalltotal' ||
        leafNorm === 'finaltotal' ||
        pathNorm.endsWith('grandtotal') ||
        pathNorm.endsWith('overalltotal') ||
        pathNorm.endsWith('finaltotal');
    const hasAcademicParent = header.labels.some((label) => SUBJECT_INDICATORS.some((indicator) => safeNormalize(label).includes(safeNormalize(indicator))));
    const hasGradeParent = header.labels.some((label) => GRADE_SUBJECT_INDICATORS.some((indicator) => safeNormalize(label).includes(safeNormalize(indicator))));
    /* A leaf TOTAL is overall when it is not under an academic subject.
       This handles flattened headers such as "School | TOTAL". */
    const standaloneTotal = leafNorm === 'total' &&
        !hasAcademicParent &&
        !hasGradeParent;
    if (explicitOverallTotal || standaloneTotal) {
        return {
            fieldType: 'total',
            confidence: 0.98,
        };
    }
    if (leafNorm.includes('position') ||
        leafNorm.includes('rank') ||
        leafNorm.includes('merit') ||
        pathNorm.endsWith('position') ||
        pathNorm.endsWith('rank') ||
        pathNorm.endsWith('merit')) {
        return {
            fieldType: 'position',
            confidence: 0.94,
        };
    }
    if (leafNorm.includes('attendance') ||
        leafNorm.includes('dayspresent') ||
        leafNorm.includes('workingdays') ||
        pathNorm.endsWith('attendance') ||
        pathNorm.endsWith('dayspresent') ||
        pathNorm.endsWith('workingdays')) {
        return {
            fieldType: 'attendance',
            confidence: 0.94,
        };
    }
    if (leafNorm.includes('remarks') ||
        leafNorm.includes('remark') ||
        leafNorm.includes('comment')) {
        return {
            fieldType: 'remarks',
            confidence: 0.94,
        };
    }
    return null;
}
function isForbiddenStudentOverallLabel(text) {
    return (isDobHeader(text) ||
        isFatherHeader(text) ||
        isMotherHeader(text) ||
        isAddressHeader(text) ||
        isStudentNameHeader(text) ||
        isRollHeader(text));
}
function calculateOverallFieldConfidence(header, fieldType) {
    const norm = safeNormalize(header);
    const exactPatterns = {
        total: [
            'grandtotal',
            'overalltotal',
        ],
        percentage: [
            'percentage',
            'percent',
        ],
        position: [
            'position',
            'rank',
            'merit',
        ],
        attendance: [
            'attendance',
            'dayspresent',
            'workingdays',
        ],
        remarks: [
            'remarks',
            'remark',
            'comment',
            'comments',
        ],
    };
    if (exactPatterns[fieldType].some((pattern) => norm ===
        safeNormalize(pattern))) {
        return 0.97;
    }
    return 0.82;
}
/* -------------------------------------------------------------------------- */
/* NUMERIC DATA                                                               */
/* -------------------------------------------------------------------------- */
function calculateColumnNumericRatio(ws, range, col, dataStartRow) {
    let total = 0;
    let numeric = 0;
    const endRow = Math.min(range.e.r, dataStartRow + 15);
    for (let row = dataStartRow; row <= endRow; row++) {
        const text = getCellText(ws, row, col);
        if (!text)
            continue;
        total++;
        if (Number.isFinite(Number(text))) {
            numeric++;
        }
    }
    return total > 0
        ? numeric / total
        : 0;
}
/* -------------------------------------------------------------------------- */
/* TOTAL / MAX MARKS                                                          */
/* -------------------------------------------------------------------------- */
function isTotalColumn(text) {
    const norm = safeNormalize(text);
    return (norm === 'total' ||
        norm === 'subtotal' ||
        norm === 'grandtotal' ||
        norm === 'overalltotal' ||
        norm.endsWith('total'));
}
function extractMaxMarks(text) {
    const bracket = text.match(/\(\s*(\d+(?:\.\d+)?)\s*\)/) ||
        text.match(/\[\s*(\d+(?:\.\d+)?)\s*\]/);
    if (bracket) {
        return Number(bracket[1]);
    }
    const maxMatch = text.match(/max(?:imum)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    if (maxMatch) {
        return Number(maxMatch[1]);
    }
    const outOfMatch = text.match(/out\s*of\s*(\d+(?:\.\d+)?)/i);
    if (outOfMatch) {
        return Number(outOfMatch[1]);
    }
    return undefined;
}
/* -------------------------------------------------------------------------- */
/* CONFIDENCE                                                                 */
/* -------------------------------------------------------------------------- */
function calculateConfidence(studentFields, subjectGroups, gradeFields, overallFields) {
    const hasName = studentFields.some((field) => field.fieldType === 'name');
    const hasRoll = studentFields.some((field) => field.fieldType === 'rollNo');
    const hasDob = studentFields.some((field) => field.fieldType === 'dob');
    const hasFather = studentFields.some((field) => field.fieldType ===
        'fatherName');
    /*
     * Required identity fields provide strong confidence.
     */
    let score = 0.35;
    if (hasName)
        score += 0.18;
    if (hasRoll)
        score += 0.15;
    if (hasDob)
        score += 0.08;
    if (hasFather)
        score += 0.08;
    if (subjectGroups.length > 0) {
        score += Math.min(subjectGroups.length * 0.025, 0.12);
    }
    if (gradeFields.length > 0) {
        score += 0.03;
    }
    if (overallFields.length > 0) {
        score += 0.03;
    }
    return Math.min(0.99, Math.max(0, score));
}
/* -------------------------------------------------------------------------- */
/* LEGACY HELPERS                                                             */
/* -------------------------------------------------------------------------- */
function getBigrams(value) {
    const result = new Set();
    const clean = safeNormalize(value);
    for (let index = 0; index < clean.length - 1; index++) {
        result.add(clean.substring(index, index + 2));
    }
    return result;
}
function bigramOverlap(a, b) {
    const first = getBigrams(a);
    const second = getBigrams(b);
    if (!first.size || !second.size) {
        return 0;
    }
    let intersection = 0;
    for (const item of first) {
        if (second.has(item)) {
            intersection++;
        }
    }
    const union = first.size +
        second.size -
        intersection;
    return union > 0
        ? intersection / union
        : 0;
}
function identifyStudentFieldType(header) {
    const effective = {
        col: -1,
        labels: [header],
        leaf: header,
        path: header,
        normalizedPath: safeNormalize(header),
        normalizedLeaf: safeNormalize(header),
    };
    return identifyStudentField(effective);
}
function mapAliasFieldToFieldType(aliasField) {
    const mapping = {
        name: 'name',
        rollNo: 'rollNo',
        class: 'class',
        section: 'section',
        fatherName: 'fatherName',
        motherName: 'motherName',
        dob: 'dob',
        address: 'address',
        attendance: 'attendance',
        position: 'position',
        photoFilename: 'photo',
        teacherRemarks: 'remarks',
        principalRemarks: 'remarks',
    };
    return (mapping[aliasField] ||
        'ignore');
}
function calculateFieldConfidence(header, fieldType) {
    return identifyStudentFieldType(header).confidence;
}
function looksLikeSubject(text) {
    const header = {
        col: -1,
        labels: [text],
        leaf: text,
        path: text,
        normalizedPath: safeNormalize(text),
        normalizedLeaf: safeNormalize(text),
    };
    return isAcademicColumn(header);
}
function looksLikeGradeField(text) {
    return GRADE_SUBJECT_INDICATORS.some((indicator) => safeNormalize(text).includes(safeNormalize(indicator)));
}
/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */
function convertColumnToLetter(col) {
    let letter = '';
    let temp = col;
    while (temp >= 0) {
        letter =
            String.fromCharCode((temp % 26) + 65) + letter;
        temp =
            Math.floor(temp / 26) - 1;
    }
    return letter;
}
function convertLetterToColumn(letter) {
    let column = 0;
    const normalized = letter.toUpperCase().trim();
    for (let index = 0; index < normalized.length; index++) {
        column =
            column * 26 +
                (normalized.charCodeAt(index) -
                    64);
    }
    return column - 1;
}
