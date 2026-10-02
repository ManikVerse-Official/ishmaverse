"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDetectedStructureToColumnMapping = convertDetectedStructureToColumnMapping;
exports.createStructureMappingFromDetected = createStructureMappingFromDetected;
exports.updateStructureMapping = updateStructureMapping;
exports.confirmStructureMapping = confirmStructureMapping;
exports.convertStructureMappingToColumnMapping = convertStructureMappingToColumnMapping;
exports.validateStructureMapping = validateStructureMapping;
exports.summarizeDetectedStructure = summarizeDetectedStructure;
exports.getStructureSummaryText = getStructureSummaryText;
const PROTECTED_FIELD_TYPES = new Set([
    'rollNo',
    'name',
    'fatherName',
    'motherName',
    'dob',
    'class',
    'section',
    'attendance',
    'photo',
    'remarks',
    'position',
    'address',
]);
/**
 * Get protected Excel columns.
 *
 * A protected column must NEVER accidentally become a subject.
 */
function getProtectedColumns(detected) {
    const protectedCols = new Set();
    if (!detected) {
        return protectedCols;
    }
    // Student fields only - these must never become subjects
    for (const field of detected.studentFields ?? []) {
        if (Number.isInteger(field.excelColumn) &&
            field.confidence >= 0.70 &&
            PROTECTED_FIELD_TYPES.has(field.fieldType)) {
            protectedCols.add(field.excelColumn);
        }
    }
    return protectedCols;
}
/**
 * Convert detected field type → internal FieldKey.
 */
function mapFieldTypeToFieldKey(fieldType) {
    const mapping = {
        rollNo: 'rollNo',
        name: 'name',
        fatherName: 'fatherName',
        motherName: 'motherName',
        dob: 'dob',
        class: 'class',
        section: 'section',
        attendance: 'attendance',
        photo: 'photoFilename',
        remarks: 'teacherRemarks',
        address: 'address',
        // These are not student fields in the generated report mapping.
        position: 'ignore',
        total: 'ignore',
        percentage: 'ignore',
        ignore: 'ignore',
    };
    return mapping[fieldType] ?? null;
}
/**
 * Find student field by exact Excel column index.
 *
 * NEVER search by header text.
 */
function getStudentFieldAt(detected, excelCol) {
    return detected?.studentFields?.find((field) => field.excelColumn === excelCol);
}
/**
 * Find overall field by exact Excel column index.
 */
function getOverallFieldAt(detected, excelCol) {
    return detected?.overallFields?.find((field) => field.col === excelCol);
}
/**
 * Get stable display name for a subject component.
 *
 * Examples:
 * English - PT
 * English - NB
 * English - SA2
 * English - TOTAL
 *
 * This prevents duplicate "English" entries from becoming
 * indistinguishable in the mapping layer.
 */
function buildSubjectName(groupName, _componentName) {
    // IMPORTANT: PT/NB/SEA/SA2/TOTAL are components, not subjects.
    // Every component in the same detected group must carry the SAME
    // subjectName so the UI and downstream normalization can group them.
    const group = String(groupName ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    return group || 'Subject';
}
/**
 * Convert a single student field into ColumnMapping.
 */
function makeStudentMapping(header, fieldType, excelCol) {
    const fieldKey = mapFieldTypeToFieldKey(fieldType);
    return {
        columnName: header,
        fieldKey: fieldKey ?? 'ignore',
        excelColumn: excelCol, // Store column index for stability
    };
}
/**
 * Convert a protected overall field.
 */
function makeOverallMapping(header, fieldType, excelCol) {
    const baseMapping = {
        columnName: header,
        excelColumn: excelCol, // Store column index for stability
    };
    switch (fieldType) {
        case 'attendance':
            return {
                ...baseMapping,
                fieldKey: 'attendance',
            };
        case 'remarks':
            return {
                ...baseMapping,
                fieldKey: 'teacherRemarks',
            };
        case 'total':
            return {
                ...baseMapping,
                fieldKey: 'overallField',
                overallFieldType: 'total',
            };
        case 'percentage':
            return {
                ...baseMapping,
                fieldKey: 'overallField',
                overallFieldType: 'percentage',
            };
        case 'position':
            return {
                ...baseMapping,
                fieldKey: 'overallField',
                overallFieldType: 'position',
            };
        case 'address':
            return {
                ...baseMapping,
                fieldKey: 'address',
            };
        default:
            return {
                ...baseMapping,
                fieldKey: 'ignore',
            };
    }
}
/**
 * Convert detected structure into the old ColumnMapping format.
 *
 * IMPORTANT:
 * We iterate by Excel column INDEX.
 * We do NOT use header.indexOf(), because duplicate headers are valid.
 */
function convertDetectedStructureToColumnMapping(detected, existingHeaders) {
    const mappings = [];
    const protectedCols = getProtectedColumns(detected);
    /**
     * Build direct lookup maps by Excel column index.
     */
    const studentFieldsByCol = new Map();
    const overallFieldsByCol = new Map();
    for (const field of detected.studentFields ?? []) {
        studentFieldsByCol.set(field.excelColumn, field);
    }
    for (const field of detected.overallFields ?? []) {
        overallFieldsByCol.set(field.col, field);
    }
    /**
     * Subject component lookup by Excel column.
     */
    const subjectComponentsByCol = new Map();
    for (const subjectGroup of detected.subjectGroups ?? []) {
        for (const component of subjectGroup.components ?? []) {
            subjectComponentsByCol.set(component.col, {
                groupName: subjectGroup.name,
                componentName: component.name,
                maxMarks: component.maxMarks,
                isTotal: component.isTotal,
            });
        }
    }
    /**
     * Grade field lookup.
     */
    const gradeFieldsByCol = new Map();
    for (const gradeField of detected.gradeFields ?? []) {
        gradeFieldsByCol.set(gradeField.col, {
            name: gradeField.name,
        });
    }
    /**
     * Process EVERY Excel column exactly once.
     *
     * This is the most important change.
     */
    for (let col = 0; col < existingHeaders.length; col++) {
        const header = String(existingHeaders[col] ?? `Column_${col + 1}`).trim();
        const studentField = studentFieldsByCol.get(col);
        const overallField = overallFieldsByCol.get(col);
        const subjectComponent = subjectComponentsByCol.get(col);
        const gradeField = gradeFieldsByCol.get(col);
        /**
         * ---------------------------------------------------------
         * 1. STUDENT FIELD HAS HIGHEST PRIORITY
         * ---------------------------------------------------------
         */
        if (studentField) {
            mappings.push(makeStudentMapping(header, studentField.fieldType, col));
            continue;
        }
        /**
         * ---------------------------------------------------------
         * 2. PROTECTED COLUMN SAFETY (before subject/overall)
         *
         * Even if a parser accidentally also classified the column
         * as a subject/grade/overall field, never allow it to become
         * anything other than ignored.
         * ---------------------------------------------------------
         */
        if (protectedCols.has(col)) {
            mappings.push({
                columnName: header,
                fieldKey: 'ignore',
                excelColumn: col,
            });
            continue;
        }
        /**
         * ---------------------------------------------------------
         * 3. GENUINE SUBJECT COMPONENT
         *
         * Subject components MUST take precedence over overall field
         * detection. A per-subject TOTAL column (e.g. "English | TOTAL")
         * is part of the subject group, NOT the standalone overall total.
         * ---------------------------------------------------------
         */
        if (subjectComponent) {
            const subjectName = buildSubjectName(subjectComponent.groupName, subjectComponent.componentName);
            /**
             * Do NOT hard-code maxMarks to 100.
             * Preserve the parser's detected value.
             */
            const detectedMaxMarks = typeof subjectComponent.maxMarks === 'number'
                ? subjectComponent.maxMarks
                : undefined;
            const mapping = {
                columnName: header,
                fieldKey: 'subject',
                subjectName,
                excelColumn: col, // Store column index for stability
            };
            if (detectedMaxMarks !== undefined &&
                Number.isFinite(detectedMaxMarks)) {
                mapping.maxMarks = detectedMaxMarks;
            }
            mappings.push(mapping);
            continue;
        }
        /**
         * ---------------------------------------------------------
         * 4. GRADE FIELD
         *
         * MV / GK / Drawing etc. remain grade/co-scholastic fields.
         * They are NOT treated as numeric subjects.
         * These are standalone grade columns that are NOT part of
         * any subject group.
         * ---------------------------------------------------------
         */
        if (gradeField) {
            mappings.push({
                columnName: header,
                fieldKey: 'gradeField',
                subjectName: gradeField.name,
                maxMarks: 0,
                excelColumn: col,
            });
            continue;
        }
        /**
         * ---------------------------------------------------------
         * 5. OVERALL FIELD (standalone, outside subject groups)
         *
         * Only overall columns that are NOT part of a subject group
         * should be classified here. The subject group check above
         * already captured any per-subject TOTAL.
         * ---------------------------------------------------------
         */
        if (overallField) {
            mappings.push(makeOverallMapping(header, overallField.fieldType, col));
            continue;
        }
        /**
         * ---------------------------------------------------------
         * 6. UNKNOWN COLUMN
         *
         * Unknown columns must NOT automatically become subjects.
         *
         * This is critical for dynamic school workbooks because
         * columns like Address, House, Category, Remarks, etc.
         * may appear in different schools.
         * ---------------------------------------------------------
         */
        mappings.push({
            columnName: header,
            fieldKey: 'ignore',
            excelColumn: col,
        });
    }
    /**
     * Already in exact Excel column order.
     *
     * DO NOT sort using:
     * existingHeaders.indexOf(...)
     *
     * because duplicate headers return the first occurrence.
     */
    return mappings;
}
/**
 * Create editable structure mapping.
 */
function createStructureMappingFromDetected(detected) {
    const customMappings = {};
    const protectedCols = getProtectedColumns(detected);
    /**
     * Student fields.
     */
    for (const field of detected.studentFields ?? []) {
        customMappings[field.excelColumn] = {
            type: 'studentField',
            mappedTo: field.fieldType,
        };
    }
    /**
     * Subject groups.
     */
    for (const subjectGroup of detected.subjectGroups ?? []) {
        for (const component of subjectGroup.components ?? []) {
            const col = component.col;
            /**
             * Protected columns always win.
             */
            if (protectedCols.has(col)) {
                const studentField = getStudentFieldAt(detected, col);
                const overallField = getOverallFieldAt(detected, col);
                if (studentField) {
                    customMappings[col] = {
                        type: 'studentField',
                        mappedTo: studentField.fieldType,
                    };
                    continue;
                }
                if (overallField) {
                    customMappings[col] = {
                        type: 'overallField',
                        mappedTo: overallField.fieldType,
                    };
                    continue;
                }
                customMappings[col] = {
                    type: 'ignore',
                };
                continue;
            }
            customMappings[col] = {
                type: 'subject',
                mappedTo: buildSubjectName(subjectGroup.name, component.name),
            };
        }
    }
    /**
     * Grade fields.
     */
    for (const gradeField of detected.gradeFields ?? []) {
        const col = gradeField.col;
        if (protectedCols.has(col)) {
            const studentField = getStudentFieldAt(detected, col);
            const overallField = getOverallFieldAt(detected, col);
            if (studentField) {
                customMappings[col] = {
                    type: 'studentField',
                    mappedTo: studentField.fieldType,
                };
                continue;
            }
            if (overallField) {
                customMappings[col] = {
                    type: 'overallField',
                    mappedTo: overallField.fieldType,
                };
                continue;
            }
            customMappings[col] = {
                type: 'ignore',
            };
            continue;
        }
        customMappings[col] = {
            type: 'gradeField',
            mappedTo: gradeField.name,
        };
    }
    /**
     * Overall fields.
     */
    for (const overallField of detected.overallFields ?? []) {
        customMappings[overallField.col] = {
            type: 'overallField',
            mappedTo: overallField.fieldType,
        };
    }
    return {
        detected,
        confirmed: false,
        customMappings,
    };
}
/**
 * Update one mapping.
 */
function updateStructureMapping(structureMapping, excelCol, newType, newMappedTo) {
    return {
        ...structureMapping,
        customMappings: {
            ...structureMapping.customMappings,
            [excelCol]: {
                type: newType,
                ...(newMappedTo !== undefined
                    ? { mappedTo: newMappedTo }
                    : {}),
            },
        },
        confirmed: false,
    };
}
/**
 * Confirm mapping.
 */
function confirmStructureMapping(structureMapping) {
    return {
        ...structureMapping,
        confirmed: true,
    };
}
/**
 * Convert editable structure mapping → ColumnMapping[].
 */
function convertStructureMappingToColumnMapping(structureMapping, existingHeaders) {
    const mappings = [];
    const detected = structureMapping.detected;
    const protectedCols = getProtectedColumns(detected);
    const enhancedStructureMapping = {
        ...structureMapping,
        detected: {
            ...detected,
            existingHeaders,
        },
    };
    /**
     * Process by Excel index.
     *
     * Never search duplicate header strings.
     */
    for (let col = 0; col < existingHeaders.length; col++) {
        const header = String(existingHeaders[col] ?? `Column_${col + 1}`).trim();
        const customMapping = structureMapping.customMappings[col];
        /**
         * No explicit mapping → safe default = ignore.
         */
        if (!customMapping) {
            mappings.push({
                columnName: header,
                fieldKey: 'ignore',
                excelColumn: col,
            });
            continue;
        }
        switch (customMapping.type) {
            /**
             * -------------------------------------------------------
             * STUDENT FIELD
             * -------------------------------------------------------
             */
            case 'studentField': {
                const mappedTo = customMapping.mappedTo ?? 'ignore';
                const fieldKey = mapFieldTypeToFieldKey(mappedTo);
                mappings.push({
                    columnName: header,
                    fieldKey: fieldKey ?? 'ignore',
                    excelColumn: col,
                });
                break;
            }
            /**
             * -------------------------------------------------------
             * SUBJECT
             * -------------------------------------------------------
             */
            case 'subject': {
                /**
                 * Protected fields can never be manually/automatically
                 * converted into subjects through stale detection data.
                 */
                if (protectedCols.has(col)) {
                    const studentField = getStudentFieldAt(detected, col);
                    const overallField = getOverallFieldAt(detected, col);
                    if (studentField) {
                        mappings.push(makeStudentMapping(header, studentField.fieldType, col));
                        break;
                    }
                    if (overallField) {
                        mappings.push(makeOverallMapping(header, overallField.fieldType, col));
                        break;
                    }
                    mappings.push({
                        columnName: header,
                        fieldKey: 'ignore',
                        excelColumn: col,
                    });
                    break;
                }
                /**
                 * Use the exact subject identity selected by the user.
                 */
                const subjectName = customMapping.mappedTo?.trim() ||
                    header;
                /**
                 * Recover max marks from detected structure.
                 */
                const detectedComponent = detected.subjectGroups
                    ?.flatMap((group) => group.components ?? [])
                    .find((component) => component.col === col);
                const mapping = {
                    columnName: header,
                    fieldKey: 'subject',
                    subjectName,
                    excelColumn: col,
                };
                if (detectedComponent &&
                    typeof detectedComponent.maxMarks ===
                        'number' &&
                    Number.isFinite(detectedComponent.maxMarks)) {
                    mapping.maxMarks =
                        detectedComponent.maxMarks;
                }
                mappings.push(mapping);
                break;
            }
            /**
             * -------------------------------------------------------
             * GRADE FIELD
             * -------------------------------------------------------
             */
            case 'gradeField': {
                // Grade / co-scholastic fields (for example MV/GK/DRAW) are not
                // numeric subjects. Use the new gradeField type.
                mappings.push({
                    columnName: header,
                    fieldKey: 'gradeField',
                    subjectName: customMapping.mappedTo || header,
                    maxMarks: 0, // Grade fields don't have numeric max marks
                    excelColumn: col, // Store column index for stability
                });
                break;
            }
            case 'overallField': {
                mappings.push(makeOverallMapping(header, customMapping.mappedTo ?? 'ignore', col));
                break;
            }
            /**
             * -------------------------------------------------------
             * IGNORE
             * -------------------------------------------------------
             */
            case 'ignore':
            default: {
                mappings.push({
                    columnName: header,
                    fieldKey: 'ignore',
                    excelColumn: col,
                });
                break;
            }
        }
    }
    return {
        mappings,
        enhancedStructureMapping,
    };
}
/**
 * Validate mapping before continuing to Subject Config.
 */
function validateStructureMapping(structureMapping, existingHeaders) {
    const issues = [];
    const detected = structureMapping.detected;
    if (!detected) {
        issues.push('No detected Excel structure is available.');
        return {
            valid: false,
            issues,
        };
    }
    /**
     * Student name is required.
     */
    const hasName = detected.studentFields?.some((field) => field.fieldType === 'name' &&
        field.excelColumn >= 0 &&
        field.excelColumn <
            existingHeaders.length) ?? false;
    if (!hasName) {
        issues.push('Student Name column was not detected.');
    }
    /**
     * Roll number is recommended but not always mandatory.
     */
    const hasRoll = detected.studentFields?.some((field) => field.fieldType === 'rollNo' &&
        field.excelColumn >= 0 &&
        field.excelColumn <
            existingHeaders.length) ?? false;
    if (!hasRoll) {
        issues.push('Roll Number column was not detected. You can map Sr. No. or another identifier manually.');
    }
    /**
     * At least one genuine academic structure.
     */
    const academicCount = (detected.subjectGroups?.length ?? 0) +
        (detected.gradeFields?.length ?? 0);
    if (academicCount === 0) {
        issues.push('No academic subject or grade fields were detected.');
    }
    /**
     * Check that protected fields are not mapped as subjects.
     */
    const protectedCols = getProtectedColumns(detected);
    for (const [colText, customMapping,] of Object.entries(structureMapping.customMappings ?? {})) {
        const col = Number(colText);
        if (!protectedCols.has(col)) {
            continue;
        }
        if (customMapping.type === 'subject' ||
            customMapping.type === 'gradeField') {
            issues.push(`Protected column ${col + 1} is incorrectly mapped as academic data.`);
        }
    }
    return {
        valid: issues.length === 0,
        issues,
    };
}
/**
 * Human-readable structure summary.
 */
function summarizeDetectedStructure(detected) {
    const issues = [];
    const studentFields = detected.studentFields ?? [];
    const subjectGroups = detected.subjectGroups ?? [];
    const gradeFields = detected.gradeFields ?? [];
    const overallFields = detected.overallFields ?? [];
    if (studentFields.length === 0) {
        issues.push('No student fields detected (name, roll no, etc.)');
    }
    if (subjectGroups.length === 0 &&
        gradeFields.length === 0) {
        issues.push('No academic subject or grade fields detected');
    }
    const hasName = studentFields.some((field) => field.fieldType === 'name');
    const hasRoll = studentFields.some((field) => field.fieldType === 'rollNo');
    if (!hasName) {
        issues.push('Student name field not detected');
    }
    if (!hasRoll) {
        issues.push('Roll number field not detected');
    }
    /**
     * Check duplicate Excel column assignments.
     */
    const usedColumns = new Set();
    for (const field of studentFields) {
        if (usedColumns.has(field.excelColumn)) {
            issues.push(`Duplicate mapping detected at Excel column ${field.excelColumn + 1}`);
        }
        usedColumns.add(field.excelColumn);
    }
    for (const group of subjectGroups) {
        for (const component of group.components ?? []) {
            if (usedColumns.has(component.col)) {
                /**
                 * A column may already be a protected field.
                 * That is okay; it should not be duplicated as subject.
                 */
                const isProtected = getProtectedColumns(detected).has(component.col);
                if (!isProtected) {
                    issues.push(`Duplicate subject mapping detected at Excel column ${component.col + 1}`);
                }
            }
            usedColumns.add(component.col);
        }
    }
    const confidence = typeof detected.confidence === 'number'
        ? detected.confidence
        : 0;
    return {
        studentFieldCount: studentFields.length,
        subjectGroupCount: subjectGroups.length,
        gradeFieldCount: gradeFields.length,
        overallFieldCount: overallFields.length,
        confidence,
        issues,
    };
}
/**
 * Human-readable summary text.
 */
function getStructureSummaryText(detected) {
    const summary = summarizeDetectedStructure(detected);
    const parts = [];
    if (summary.studentFieldCount > 0) {
        parts.push(`${summary.studentFieldCount} student field${summary.studentFieldCount > 1
            ? 's'
            : ''}`);
    }
    if (summary.subjectGroupCount > 0) {
        const totalComponents = detected.subjectGroups.reduce((sum, group) => sum +
            (group.components?.length ?? 0), 0);
        parts.push(`${summary.subjectGroupCount} subject group${summary.subjectGroupCount > 1
            ? 's'
            : ''} (${totalComponents} component${totalComponents > 1
            ? 's'
            : ''})`);
    }
    if (summary.gradeFieldCount > 0) {
        parts.push(`${summary.gradeFieldCount} grade field${summary.gradeFieldCount > 1
            ? 's'
            : ''}`);
    }
    if (summary.overallFieldCount > 0) {
        parts.push(`${summary.overallFieldCount} overall field${summary.overallFieldCount > 1
            ? 's'
            : ''}`);
    }
    if (parts.length === 0) {
        return 'No structure detected';
    }
    const confidenceText = summary.confidence >= 0.80
        ? 'High'
        : summary.confidence >= 0.50
            ? 'Medium'
            : 'Low';
    return `Detected: ${parts.join(', ')} (Confidence: ${confidenceText})`;
}
