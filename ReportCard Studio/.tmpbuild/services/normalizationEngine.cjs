"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCellValue = parseCellValue;
exports.parseSubjectCell = parseSubjectCell;
exports.parseGradeCell = parseGradeCell;
exports.buildStudentsFromRows = buildStudentsFromRows;
exports.buildStudentsFromDynamicStructure = buildStudentsFromDynamicStructure;
const ABSENT_VALUES = ['ab', 'absent', 'a'];
const EXEMPT_VALUES = ['ex', 'exempt', 'exmp'];
const MEDICAL_VALUES = ['medical', 'med', 'md'];
function parseCellValue(v) {
    if (v === null || v === undefined)
        return '';
    if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(v).trim();
}
function parseSubjectCell(v) {
    const raw = parseCellValue(v);
    if (raw === '') {
        return { status: 'present', marks: null, rawValue: raw };
    }
    const lower = raw.toLowerCase();
    if (ABSENT_VALUES.includes(lower)) {
        return { status: 'absent', marks: null, rawValue: raw };
    }
    if (EXEMPT_VALUES.includes(lower)) {
        return { status: 'exempt', marks: null, rawValue: raw };
    }
    if (MEDICAL_VALUES.includes(lower)) {
        return { status: 'medical', marks: null, rawValue: raw };
    }
    const cleaned = raw.replace(/,/g, '');
    const slashIndex = cleaned.indexOf('/');
    if (slashIndex >= 0) {
        const first = cleaned.slice(0, slashIndex).trim();
        const num = Number(first);
        if (Number.isFinite(num)) {
            return { status: 'present', marks: num, rawValue: raw };
        }
    }
    const directNum = Number(cleaned);
    if (Number.isFinite(directNum)) {
        return { status: 'present', marks: directNum, rawValue: raw };
    }
    const sepRegex = /[\/·•|:\-\s_]+/g;
    const tokens = cleaned
        .split(sepRegex)
        .map((t) => t.trim())
        .filter((t) => t !== '' && !/^[a-zA-Z]+$/.test(t));
    for (const token of tokens) {
        const n = Number(token);
        if (Number.isFinite(n)) {
            return { status: 'present', marks: n, rawValue: raw };
        }
    }
    const numericMatch = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (numericMatch) {
        const n = Number(numericMatch[0]);
        if (Number.isFinite(n)) {
            return { status: 'present', marks: n, rawValue: raw };
        }
    }
    return { status: 'present', marks: null, rawValue: raw };
}
function parseGradeCell(v) {
    const raw = parseCellValue(v);
    return {
        value: raw,
        rawValue: raw,
    };
}
function getOriginalRowNumber(row, fallback) {
    const value = row.__rowNumber;
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}
function getCellByColumn(row, col, fallbackHeader) {
    const cells = row.__cells;
    if (typeof col === 'number' &&
        Array.isArray(cells) &&
        col >= 0) {
        return cells[col] ?? '';
    }
    return row[fallbackHeader];
}
function getMappedCell(row, mapping) {
    return getCellByColumn(row, mapping.excelColumn, mapping.columnName);
}
function normalizeCellForComparison(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}
function isHeaderLikeStudentValue(value) {
    const normalized = normalizeCellForComparison(value);
    return [
        'name',
        'student',
        'studentname',
        'studentsname',
        'nameofstudent',
        'roll',
        'rollno',
        'rollnumber',
        'srno',
        'sno',
        'serialno',
    ].includes(normalized);
}
function isPlausibleStudentRow(row, detected, existingHeaders) {
    const studentFields = detected?.studentFields ?? [];
    const nameField = studentFields.find((field) => field.fieldType === 'name');
    const rollField = studentFields.find((field) => field.fieldType === 'rollNo');
    const name = nameField
        ? parseCellValue(getCellByColumn(row, nameField.excelColumn, existingHeaders[nameField.excelColumn] ||
            `Column_${nameField.excelColumn}`))
        : '';
    const roll = rollField
        ? parseCellValue(getCellByColumn(row, rollField.excelColumn, existingHeaders[rollField.excelColumn] ||
            `Column_${rollField.excelColumn}`))
        : '';
    if (rollField && !roll) {
        return false;
    }
    if (!name && !roll) {
        return false;
    }
    if ((name && isHeaderLikeStudentValue(name)) ||
        (roll && isHeaderLikeStudentValue(roll))) {
        return false;
    }
    return true;
}
function resolveSubjectMaxMarks(subjectGroup, components, authoritativeTotalMaxMarks) {
    if (typeof authoritativeTotalMaxMarks === 'number' &&
        Number.isFinite(authoritativeTotalMaxMarks) &&
        authoritativeTotalMaxMarks > 0) {
        return authoritativeTotalMaxMarks;
    }
    const totalComponent = subjectGroup.components?.find((component) => component.isTotal);
    if (totalComponent &&
        typeof totalComponent.maxMarks === 'number' &&
        Number.isFinite(totalComponent.maxMarks)) {
        return totalComponent.maxMarks;
    }
    const explicitComponentMax = (subjectGroup.components ?? [])
        .filter((component) => !component.isTotal)
        .reduce((sum, component) => {
        return typeof component.maxMarks === 'number' &&
            Number.isFinite(component.maxMarks)
            ? sum + component.maxMarks
            : sum;
    }, 0);
    if (subjectGroup.hasTotal || totalComponent) {
        return explicitComponentMax > 0 ? explicitComponentMax : 100;
    }
    if (explicitComponentMax > 0) {
        return explicitComponentMax;
    }
    const explicitBuiltComponentMax = components.reduce((sum, c) => {
        const explicit = subjectGroup.components?.find((dc) => dc.col !== undefined && dc.name === c.name)?.maxMarks;
        if (typeof explicit === 'number' && Number.isFinite(explicit)) {
            return sum + explicit;
        }
        return sum;
    }, 0);
    if (explicitBuiltComponentMax > 0) {
        return explicitBuiltComponentMax;
    }
    return 100;
}
function mapDetectedFieldToStudentField(fieldType) {
    const mapping = {
        photo: 'photoFilename',
        remarks: 'teacherRemarks',
    };
    return mapping[fieldType] ?? fieldType;
}
function buildStudentsFromRows(rows, mapping, defaults) {
    const subjectMappings = mapping.filter((m) => m.fieldKey === 'subject');
    const gradeFieldMappings = mapping.filter((m) => m.fieldKey === 'gradeField');
    const overallFieldMappings = mapping.filter((m) => m.fieldKey === 'overallField');
    return rows.map((row, idx) => {
        const rowNumber = getOriginalRowNumber(row, idx + 2);
        const studentId = `row-${rowNumber}`;
        const fields = {};
        for (const m of mapping) {
            if (m.fieldKey === 'subject' || m.fieldKey === 'gradeField' || m.fieldKey === 'overallField' || m.fieldKey === 'ignore')
                continue;
            fields[m.fieldKey] = parseCellValue(getMappedCell(row, m));
        }
        const subjects = subjectMappings.map((m) => {
            const parsed = parseSubjectCell(getMappedCell(row, m));
            return {
                name: m.subjectName || m.columnName,
                maxMarks: m.maxMarks ?? 100,
                ...parsed,
                hasComponents: false,
                components: undefined,
            };
        });
        // Extract grade fields (new gradeField type)
        const gradeFields = gradeFieldMappings.map((m) => {
            const parsed = parseGradeCell(getMappedCell(row, m));
            return {
                name: m.subjectName || m.columnName,
                value: parsed.value,
                rawValue: parsed.rawValue,
            };
        });
        // Extract overall fields (new overallField type)
        const overall = {};
        for (const m of overallFieldMappings) {
            if (m.overallFieldType === 'total') {
                const parsed = parseSubjectCell(getMappedCell(row, m));
                overall.total = parsed.marks ?? undefined;
            }
            else if (m.overallFieldType === 'percentage') {
                const parsed = parseSubjectCell(getMappedCell(row, m));
                overall.percentage = parsed.marks ?? undefined;
            }
            else if (m.overallFieldType === 'position') {
                overall.position = parseCellValue(getMappedCell(row, m));
            }
            else if (m.overallFieldType === 'attendance') {
                overall.attendance = parseCellValue(getMappedCell(row, m));
            }
            else if (m.overallFieldType === 'remarks') {
                overall.remarks = parseCellValue(getMappedCell(row, m));
            }
        }
        // Also check for student field mappings for attendance/remarks
        if (fields.attendance) {
            overall.attendance = fields.attendance;
        }
        if (fields.teacherRemarks) {
            overall.remarks = fields.teacherRemarks;
        }
        const cls = fields.class || defaults.defaultClass;
        const sec = fields.section || defaults.defaultSection;
        return {
            studentId,
            rowNumber,
            rollNo: fields.rollNo || String(idx + 1),
            class: cls || undefined,
            section: sec || undefined,
            name: fields.name,
            fatherName: fields.fatherName || undefined,
            motherName: fields.motherName || undefined,
            dob: fields.dob || undefined,
            address: fields.address || undefined,
            attendance: fields.attendance || undefined,
            photoFilename: fields.photoFilename || undefined,
            subjects,
            gradeFields: gradeFields.length > 0 ? gradeFields : undefined,
            overall: Object.keys(overall).length > 0 ? overall : undefined,
            teacherRemarks: fields.teacherRemarks || undefined,
            principalRemarks: fields.principalRemarks || undefined,
            rawRow: row,
        };
    });
}
function buildStudentsFromDynamicStructure(rows, detectedStructure, structureMapping, defaults, existingHeaders, columnMappings = []) {
    const { detected, customMappings } = structureMapping;
    const columnMappingByCol = new Map();
    columnMappings.forEach((mapping, index) => {
        columnMappingByCol.set(mapping.excelColumn ?? index, mapping);
    });
    const getAuthoritativeMapping = (col) => columnMappingByCol.get(col);
    const getAuthoritativeType = (col) => getAuthoritativeMapping(col)?.fieldKey;
    // Add existingHeaders to detectedStructure for use in the function
    const enhancedDetectedStructure = {
        ...detectedStructure,
        existingHeaders,
    };
    const dataStartRowNumber = typeof detected.dataStartRow === 'number'
        ? detected.dataStartRow + 1
        : 1;
    return rows
        .filter((row) => {
        const rowNumber = getOriginalRowNumber(row, 0);
        if (rowNumber && rowNumber < dataStartRowNumber) {
            return false;
        }
        return isPlausibleStudentRow(row, detected, existingHeaders);
    })
        .map((row, idx) => {
        const rowNumber = getOriginalRowNumber(row, idx + 2);
        const studentId = `row-${rowNumber}`;
        // Extract student fields
        const fields = {};
        for (const [colStr, mapping] of Object.entries(customMappings)) {
            const col = parseInt(colStr, 10);
            const mappingValue = mapping;
            const columnMapping = getAuthoritativeMapping(col);
            const mappedTo = columnMapping &&
                columnMapping.fieldKey !== 'subject' &&
                columnMapping.fieldKey !== 'gradeField' &&
                columnMapping.fieldKey !== 'overallField' &&
                columnMapping.fieldKey !== 'ignore'
                ? columnMapping.fieldKey
                : mappingValue.mappedTo;
            if (mappingValue.type === 'studentField' && mappedTo && mappedTo !== 'ignore') {
                const header = enhancedDetectedStructure.existingHeaders?.[col] || `Column_${col}`;
                const key = mapDetectedFieldToStudentField(mappedTo);
                const value = parseCellValue(getCellByColumn(row, col, header));
                fields[key] = value;
                if (idx === 0) {
                    console.debug('[buildStudents] student-field via customMappings:', { col, key, value, header, type: mappingValue.type, mappedTo });
                }
            }
        }
        /**
         * Robustness fallback: extract student identity fields DIRECTLY from
         * detected.studentFields using their authoritative Excel column index.
         *
         * This ensures class/section/attendance etc. are read even if the
         * customMappings classification missed an entry (e.g. parser detected
         * field at low confidence, or aliases didn't match exactly).
         *
         * Uses ONLY field.excelColumn — never header text or indexOf().
         */
        if (Array.isArray(detectedStructure.studentFields)) {
            for (const field of detectedStructure.studentFields) {
                const col = field.excelColumn;
                const fieldType = field.fieldType;
                if (!Number.isInteger(col) ||
                    col < 0 ||
                    !fieldType ||
                    fieldType === 'ignore' ||
                    fieldType === 'total' ||
                    fieldType === 'percentage' ||
                    fieldType === 'position') {
                    continue;
                }
                const key = mapDetectedFieldToStudentField(fieldType);
                if (fields[key] && String(fields[key]).trim() !== '')
                    continue;
                const header = enhancedDetectedStructure.existingHeaders?.[col] || `Column_${col}`;
                const value = parseCellValue(getCellByColumn(row, col, header));
                fields[key] = value;
                if (idx === 0) {
                    console.debug('[buildStudents] student-field via detected.studentFields fallback:', { col, fieldType, key, value, header, confidence: field.confidence });
                }
            }
        }
        // Extract subject groups with components
        const subjects = [];
        const gradeFields = [];
        const isFirstRow = idx === 0;
        if (isFirstRow) {
            console.debug('[buildStudents] Row[0] subject groups analysis:');
        }
        for (const subjectGroup of detected.subjectGroups) {
            if (isFirstRow) {
                console.debug(`[buildStudents]   Subject "${subjectGroup.name}":`, {
                    componentCount: subjectGroup.components.length,
                    components: subjectGroup.components.map((c) => ({
                        name: c.name,
                        col: c.col,
                        isTotal: !!c.isTotal,
                        detectedMaxMarks: c.maxMarks,
                    })),
                });
            }
            const components = [];
            let totalMarks = null;
            let hasTotal = false;
            let totalComponentCol;
            for (const component of subjectGroup.components) {
                const header = enhancedDetectedStructure.existingHeaders?.[component.col] || `Column_${component.col}`;
                const customMapping = customMappings[component.col];
                const authoritativeMapping = getAuthoritativeMapping(component.col);
                const authoritativeFieldKey = authoritativeMapping?.fieldKey;
                const customType = customMapping?.type;
                const explicitlyIgnored = authoritativeFieldKey === 'ignore' ||
                    customType === 'ignore';
                const isProtectedStudentField = authoritativeFieldKey &&
                    authoritativeFieldKey !== 'subject' &&
                    authoritativeFieldKey !== 'gradeField' &&
                    authoritativeFieldKey !== 'overallField' &&
                    authoritativeFieldKey !== 'ignore';
                const skip = explicitlyIgnored || isProtectedStudentField;
                const cellValue = skip ? '' : getCellByColumn(row, component.col, header);
                const parsed = parseSubjectCell(cellValue);
                if (isFirstRow) {
                    console.debug(`[buildStudents]     Component ${component.name} (col=${component.col}):`, {
                        isTotal: !!component.isTotal,
                        authoritativeFieldKey,
                        customType,
                        skip,
                        header,
                        rawCellValue: cellValue,
                        parsedMarks: parsed.marks,
                        parsedRaw: parsed.rawValue,
                        parsedStatus: parsed.status,
                    });
                }
                if (skip)
                    continue;
                if (component.isTotal) {
                    hasTotal = true;
                    totalComponentCol = component.col;
                    totalMarks = parsed.marks ?? null;
                    components.push({
                        name: component.name,
                        marks: parsed.marks,
                        maxMarks: authoritativeMapping?.maxMarks ??
                            component.maxMarks ??
                            100,
                        status: parsed.status,
                        rawValue: parsed.rawValue,
                        isTotal: true,
                    });
                }
                else {
                    components.push({
                        name: component.name,
                        marks: parsed.marks,
                        maxMarks: authoritativeMapping?.maxMarks ??
                            component.maxMarks ??
                            100,
                        status: parsed.status,
                        rawValue: parsed.rawValue,
                        isTotal: false,
                    });
                }
            }
            if (components.length > 0) {
                const totalAuthMax = totalComponentCol !== undefined
                    ? getAuthoritativeMapping(totalComponentCol)?.maxMarks
                    : undefined;
                const finalMaxMarks = totalAuthMax ??
                    resolveSubjectMaxMarks(subjectGroup, components, totalAuthMax);
                let finalMarks = hasTotal ? totalMarks : null;
                if (finalMarks === null || finalMarks === undefined) {
                    const componentSum = components.reduce((sum, c) => {
                        if (typeof c.marks === 'number' &&
                            Number.isFinite(c.marks)) {
                            return sum + c.marks;
                        }
                        return sum;
                    }, 0);
                    if (componentSum > 0) {
                        finalMarks = componentSum;
                    }
                    else {
                        // Find last numeric component (compatible with older ES targets)
                        const numeric = components
                            .slice()
                            .reverse()
                            .find((c) => typeof c.marks === 'number' && Number.isFinite(c.marks));
                        if (numeric)
                            finalMarks = numeric.marks;
                    }
                }
                if (isFirstRow) {
                    const componentSum = components.reduce((sum, c) => {
                        if (typeof c.marks === 'number' && Number.isFinite(c.marks))
                            return sum + c.marks;
                        return sum;
                    }, 0);
                    console.debug(`[buildStudents]   -> Built SubjectMark for "${subjectGroup.name}":`, {
                        hasTotal,
                        totalMarks,
                        finalMarks,
                        finalMarksSource: hasTotal ? 'total-component' : componentSum > 0 ? 'sum(components)' : 'last-numeric-component',
                        componentSum,
                        totalAuthMax,
                        finalMaxMarks,
                        componentsCount: components.length,
                        totalComponentCol,
                        componentsSummary: components.map((c) => `${c.name}${c.isTotal ? '(TOTAL)' : ''}:${c.marks}`),
                    });
                }
                subjects.push({
                    name: subjectGroup.name,
                    marks: finalMarks,
                    maxMarks: finalMaxMarks,
                    status: 'present',
                    rawValue: (finalMarks !== null && finalMarks !== undefined)
                        ? String(finalMarks)
                        : undefined,
                    hasComponents: true,
                    components,
                });
            }
            else if (isFirstRow) {
                console.debug(`[buildStudents]   -> Subject "${subjectGroup.name}" SKIPPED: components.length=0`);
            }
        }
        /**
         * Third extraction path: student identity fields via
         * columnMapping array (fieldKey directly identifies the field).
         *
         * Sometimes the detected.studentFields list is empty for a field
         * but the user or convertDetectedStructureToColumnMapping already
         * set ColumnMapping.fieldKey to the identity key directly.
         *
         * Uses mapping.excelColumn (authoritative Excel column index).
         * Never uses header text / indexOf().
         */
        for (const mapping of columnMappings) {
            const col = mapping.excelColumn;
            const key = mapping.fieldKey;
            if (typeof col !== 'number' ||
                col < 0 ||
                !key ||
                key === 'subject' ||
                key === 'gradeField' ||
                key === 'overallField' ||
                key === 'ignore') {
                continue;
            }
            if (fields[key] && String(fields[key]).trim() !== '')
                continue;
            const header = enhancedDetectedStructure.existingHeaders?.[col] || `Column_${col}`;
            const value = parseCellValue(getCellByColumn(row, col, header));
            fields[key] = value;
            if (isFirstRow) {
                console.debug('[buildStudents] student-field via columnMapping 3rd path:', {
                    col,
                    fieldKey: key,
                    value,
                    header,
                });
            }
        }
        if (isFirstRow) {
            console.debug('[buildStudents] Final student identity fields (Row[0]):', {
                fields,
                detectedClass: fields.class,
                detectedSection: fields.section,
                detectedName: fields.name,
                detectedRoll: fields.rollNo,
                detectedFather: fields.fatherName,
                detectedMother: fields.motherName,
            });
        }
        // Extract standalone grade fields
        for (const gradeField of detected.gradeFields) {
            const header = enhancedDetectedStructure.existingHeaders?.[gradeField.col] || `Column_${gradeField.col}`;
            const mapping = customMappings[gradeField.col];
            const authoritativeMapping = getAuthoritativeMapping(gradeField.col);
            if (authoritativeMapping?.fieldKey === 'gradeField' ||
                (!authoritativeMapping && mapping?.type === 'gradeField')) {
                const parsed = parseGradeCell(getCellByColumn(row, gradeField.col, header));
                gradeFields.push({
                    name: gradeField.name,
                    value: parsed.value,
                    rawValue: parsed.rawValue,
                });
            }
        }
        // Extract overall fields
        const overall = {};
        for (const overallField of detected.overallFields) {
            const header = enhancedDetectedStructure.existingHeaders?.[overallField.col] || `Column_${overallField.col}`;
            const mapping = customMappings[overallField.col];
            const authoritativeMapping = getAuthoritativeMapping(overallField.col);
            if (authoritativeMapping?.fieldKey === 'overallField' ||
                (!authoritativeMapping && mapping?.type === 'overallField')) {
                const value = parseCellValue(getCellByColumn(row, overallField.col, header));
                if (overallField.fieldType === 'attendance') {
                    overall.attendance = value;
                }
                else if (overallField.fieldType === 'remarks') {
                    overall.remarks = value;
                }
                else if (overallField.fieldType === 'total') {
                    overall.total = value;
                }
                else if (overallField.fieldType === 'percentage') {
                    overall.percentage = value;
                }
                else if (overallField.fieldType === 'position') {
                    overall.position = value;
                }
            }
        }
        const cls = fields.class || defaults.defaultClass;
        const sec = fields.section || defaults.defaultSection;
        return {
            studentId,
            rowNumber,
            rollNo: fields.rollNo || String(idx + 1),
            class: cls || undefined,
            section: sec || undefined,
            name: fields.name,
            fatherName: fields.fatherName || undefined,
            motherName: fields.motherName || undefined,
            dob: fields.dob || undefined,
            address: fields.address || undefined,
            attendance: overall.attendance || fields.attendance || undefined,
            photoFilename: fields.photoFilename || undefined,
            subjects,
            gradeFields: gradeFields.length > 0 ? gradeFields : undefined,
            overall: Object.keys(overall).length > 0 ? overall : undefined,
            teacherRemarks: overall.remarks || fields.teacherRemarks || undefined,
            principalRemarks: fields.principalRemarks || undefined,
            rawRow: row,
        };
    });
}
