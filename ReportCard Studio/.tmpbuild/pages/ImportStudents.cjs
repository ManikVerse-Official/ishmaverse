"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportStudents;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const appStore_1 = require("../store/appStore");
const excelParser_1 = require("../services/excelParser");
const mappingEngine_1 = require("../services/mappingEngine");
const normalizationEngine_1 = require("../services/normalizationEngine");
const validationEngine_1 = require("../services/validationEngine");
const photoMatcher_1 = require("../services/photoMatcher");
const dynamicExcelParser_1 = require("../services/dynamicExcelParser");
const dynamicMappingEngine_1 = require("../services/dynamicMappingEngine");
function ImportStudents() {
    const workbook = (0, appStore_1.useAppStore)((s) => s.workbook);
    const setWorkbook = (0, appStore_1.useAppStore)((s) => s.setWorkbook);
    const setActiveSheet = (0, appStore_1.useAppStore)((s) => s.setActiveSheet);
    const columnMapping = (0, appStore_1.useAppStore)((s) => s.columnMapping);
    const setColumnMapping = (0, appStore_1.useAppStore)((s) => s.setColumnMapping);
    const setStudents = (0, appStore_1.useAppStore)((s) => s.setStudents);
    const setValidation = (0, appStore_1.useAppStore)((s) => s.setValidation);
    const validation = (0, appStore_1.useAppStore)((s) => s.validation);
    const students = (0, appStore_1.useAppStore)((s) => s.students);
    const defaultClass = (0, appStore_1.useAppStore)((s) => s.defaultClass);
    const defaultSection = (0, appStore_1.useAppStore)((s) => s.defaultSection);
    const setDefaultClass = (0, appStore_1.useAppStore)((s) => s.setDefaultClass);
    const setDefaultSection = (0, appStore_1.useAppStore)((s) => s.setDefaultSection);
    const photoMap = (0, appStore_1.useAppStore)((s) => s.photoMap);
    const setPhotoMap = (0, appStore_1.useAppStore)((s) => s.setPhotoMap);
    const resetWorkflow = (0, appStore_1.useAppStore)((s) => s.resetWorkflow);
    const setDetectedStructure = (0, appStore_1.useAppStore)((s) => s.setDetectedStructure);
    const setStructureMapping = (0, appStore_1.useAppStore)((s) => s.setStructureMapping);
    const structureMapping = (0, appStore_1.useAppStore)((s) => s.structureMapping);
    const [tab, setTab] = (0, react_1.useState)('upload');
    const [fileError, setFileError] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [photoLoading, setPhotoLoading] = (0, react_1.useState)(false);
    const [photoFile, setPhotoFile] = (0, react_1.useState)(null);
    const [sourceFile, setSourceFile] = (0, react_1.useState)(null);
    const [dynamicParserFailed, setDynamicParserFailed] = (0, react_1.useState)(false);
    const fileRef = (0, react_1.useRef)(null);
    const photoRef = (0, react_1.useRef)(null);
    const tabs = [
        {
            id: 'upload',
            label: '1. Upload Excel',
            desc: 'Drop your file',
        },
        {
            id: 'mapping',
            label: '2. Column Mapping',
            desc: 'Map fields',
        },
        {
            id: 'subjects',
            label: '3. Subject Config',
            desc: 'Names & max marks',
        },
        {
            id: 'photos',
            label: '4. Photos (Optional)',
            desc: 'Match from ZIP',
        },
        {
            id: 'preview',
            label: '5. Preview & Validate',
            desc: 'Check & confirm',
        },
    ];
    /*
     * IMPORTANT:
     * Every PT/NB/SEA/SA/SA2/TOTAL column can still be present
     * in columnMapping, but subjectCount is based on unique
     * subject-group names.
     */
    const summary = (0, react_1.useMemo)(() => {
        const base = (0, mappingEngine_1.summarizeMappings)(columnMapping);
        const uniqueSubjects = new Set(columnMapping
            .filter((m) => m.fieldKey === 'subject')
            .map((m) => (m.subjectName || m.columnName).trim())
            .filter(Boolean));
        return {
            ...base,
            subjectCount: uniqueSubjects.size,
        };
    }, [columnMapping]);
    const handleFile = async (file) => {
        setSourceFile(file);
        setFileError(null);
        setLoading(true);
        setDynamicParserFailed(false);
        try {
            const wb = await (0, excelParser_1.parseWorkbookFromFile)(file);
            try {
                const detectedStructure = await (0, dynamicExcelParser_1.parseDynamicStructure)(file);
                setDetectedStructure(detectedStructure);
                const detectedMapping = (0, dynamicMappingEngine_1.createStructureMappingFromDetected)(detectedStructure);
                setStructureMapping(detectedMapping);
                const hasName = detectedStructure.studentFields.some((f) => f.fieldType === 'name');
                const hasSubjects = detectedStructure.subjectGroups.length > 0;
                if (!hasName || !hasSubjects) {
                    console.warn('Dynamic structure detection low confidence: using fallback.');
                    setDynamicParserFailed(true);
                    setWorkbook(wb);
                    setColumnMapping((0, mappingEngine_1.autoMapColumns)(wb.headers));
                }
                else {
                    const mappings = (0, dynamicMappingEngine_1.convertDetectedStructureToColumnMapping)(detectedStructure, wb.headers);
                    const structureMappingData = (0, dynamicMappingEngine_1.createStructureMappingFromDetected)(detectedStructure);
                    setWorkbook(wb);
                    setColumnMapping(mappings);
                    setStructureMapping(structureMappingData);
                    console.log('Detected structure:', (0, dynamicMappingEngine_1.summarizeDetectedStructure)(detectedStructure));
                }
            }
            catch (dynamicError) {
                console.warn('Dynamic structure detection failed, using fallback:', dynamicError);
                setDynamicParserFailed(true);
                setDetectedStructure(null);
                setStructureMapping(null);
                setWorkbook(wb);
                setColumnMapping((0, mappingEngine_1.autoMapColumns)(wb.headers));
            }
            setPhotoMap({});
            setPhotoFile(null);
            setTab('mapping');
        }
        catch (e) {
            setFileError(e.message ||
                'Failed to parse Excel file');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };
    const handleSwitchSheet = async (name) => {
        if (!workbook || !sourceFile)
            return;
        setLoading(true);
        try {
            const parsed = await (0, excelParser_1.parseSheetFromFileByName)(sourceFile, name);
            let nextDetected = null;
            let nextMappings;
            try {
                nextDetected = await (0, dynamicExcelParser_1.parseDynamicStructure)(sourceFile, name);
                setDetectedStructure(nextDetected);
                setStructureMapping((0, dynamicMappingEngine_1.createStructureMappingFromDetected)(nextDetected));
                const hasName = nextDetected.studentFields.some((field) => field.fieldType === 'name');
                const hasAcademic = nextDetected.subjectGroups.length > 0 ||
                    nextDetected.gradeFields.length > 0;
                if (hasName && hasAcademic) {
                    nextMappings =
                        (0, dynamicMappingEngine_1.convertDetectedStructureToColumnMapping)(nextDetected, parsed.headers);
                    setDynamicParserFailed(false);
                }
                else {
                    nextMappings = (0, mappingEngine_1.autoMapColumns)(parsed.headers);
                    setDynamicParserFailed(true);
                }
            }
            catch {
                nextDetected = null;
                setDetectedStructure(null);
                setStructureMapping(null);
                setDynamicParserFailed(true);
                nextMappings = (0, mappingEngine_1.autoMapColumns)(parsed.headers);
            }
            setActiveSheet(name);
            setColumnMapping(nextMappings);
            setWorkbook({
                ...workbook,
                activeSheet: name,
                headers: parsed.headers,
                rows: parsed.rows,
            });
        }
        catch (error) {
            setFileError(error.message ||
                `Failed to switch to worksheet: ${name}`);
        }
        finally {
            setLoading(false);
        }
    };
    /*
     * Changing one component's subject name changes
     * the complete subject group.
     */
    const setFieldForColumn = (columnIndex, value) => {
        const current = columnMapping[columnIndex];
        if (!current)
            return;
        const oldGroupName = current.subjectName || current.columnName;
        setColumnMapping(columnMapping.map((m, index) => {
            if (index === columnIndex) {
                return {
                    ...m,
                    fieldKey: value,
                    subjectName: value === 'subject'
                        ? m.subjectName || m.columnName
                        : undefined,
                    maxMarks: value === 'subject'
                        ? m.maxMarks ?? 100
                        : undefined,
                };
            }
            if (value === 'subject' &&
                m.fieldKey === 'subject' &&
                (m.subjectName || m.columnName) === oldGroupName) {
                return {
                    ...m,
                    subjectName: current.subjectName ||
                        current.columnName ||
                        oldGroupName,
                };
            }
            return m;
        }));
    };
    const updateSubjectName = (columnIndex, name) => {
        const current = columnMapping[columnIndex];
        const oldName = current?.subjectName || current?.columnName;
        setColumnMapping(columnMapping.map((m) => {
            if (m.fieldKey !== 'subject') {
                return m;
            }
            const groupName = m.subjectName || m.columnName;
            return groupName === oldName
                ? {
                    ...m,
                    subjectName: name,
                }
                : m;
        }));
    };
    const updateMaxMarks = (columnIndex, max) => {
        const current = columnMapping[columnIndex];
        const oldName = current?.subjectName || current?.columnName;
        setColumnMapping(columnMapping.map((m) => {
            if (m.fieldKey !== 'subject') {
                return m;
            }
            const groupName = m.subjectName || m.columnName;
            return groupName === oldName
                ? {
                    ...m,
                    maxMarks: max,
                }
                : m;
        }));
    };
    const addSubjectRow = () => {
        const colName = `Custom_Subject_${Date.now()}`;
        setColumnMapping([
            ...columnMapping,
            {
                columnName: colName,
                fieldKey: 'subject',
                subjectName: 'New Subject',
                maxMarks: 100,
            },
        ]);
    };
    /*
     * Removing one subject means removing its complete
     * subject group, not just one component.
     */
    const removeMappingRow = (columnIndex) => {
        const current = columnMapping[columnIndex];
        const groupName = current?.subjectName || current?.columnName;
        setColumnMapping(columnMapping.filter((m) => {
            if (m.fieldKey !== 'subject') {
                return true;
            }
            return ((m.subjectName || m.columnName) !==
                groupName);
        }));
    };
    /*
     * Dynamic structure builder is used whenever the
     * advanced detector succeeded.
     *
     * This preserves PT/NB/SEA/SA2/TOTAL inside one
     * SubjectMark instead of creating duplicate subjects.
     */
    const buildStudentsAndValidate = () => {
        if (!workbook)
            return;
        const stds = structureMapping?.detected
            ? (0, normalizationEngine_1.buildStudentsFromDynamicStructure)(workbook.rows, structureMapping.detected, structureMapping, {
                defaultClass,
                defaultSection,
            }, workbook.headers, columnMapping)
            : (0, normalizationEngine_1.buildStudentsFromRows)(workbook.rows, columnMapping, {
                defaultClass,
                defaultSection,
            });
        setStudents(stds);
        const v = (0, validationEngine_1.validateStudents)(stds);
        setValidation(v);
        setTab('preview');
    };
    const handlePhotoZip = async (file) => {
        setPhotoLoading(true);
        try {
            const m = await (0, photoMatcher_1.loadPhotoZip)(file);
            setPhotoMap(m);
            setPhotoFile(file);
        }
        catch (e) {
            setFileError(e.message ||
                'Failed to read photo zip');
        }
        finally {
            setPhotoLoading(false);
        }
    };
    const handlePhotoFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handlePhotoZip(file);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-ink-900", children: "Import Students" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-ink-500", children: "Upload student data, map columns, configure subjects, attach photos, validate records." })] }), workbook && ((0, jsx_runtime_1.jsxs)("button", { onClick: resetWorkflow, className: "btn-ghost", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-4 w-4" }), "Start Over"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2 overflow-x-auto pb-1 -mx-2 px-2", children: tabs.map((t, i) => {
                    const locked = i > 0 && !workbook;
                    const active = tab === t.id;
                    return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => !locked && setTab(t.id), disabled: locked, className: (0, clsx_1.default)('text-left rounded-lg border px-4 py-3 min-w-[170px] shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed', active
                            ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)('text-xs font-semibold', active
                                    ? 'text-brand-700'
                                    : 'text-ink-500'), children: t.label }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm font-semibold text-ink-900 mt-0.5", children: t.desc })] }, t.id));
                }) }), tab === 'upload' && ((0, jsx_runtime_1.jsx)(UploadTab, { loading: loading, fileError: fileError, onFile: handleFile, fileRef: fileRef, onFileChange: handleFileChange })), tab === 'mapping' && workbook && ((0, jsx_runtime_1.jsx)(MappingTab, { headers: workbook.headers, rows: workbook.rows, sheetNames: workbook.sheetNames, activeSheet: workbook.activeSheet, fileName: workbook.fileName, mappings: columnMapping, onSwitchSheet: handleSwitchSheet, onSetField: setFieldForColumn, onContinue: () => setTab('subjects'), summary: summary, detectedStructure: structureMapping?.detected ?? null, dynamicParserFailed: dynamicParserFailed })), tab === 'subjects' && workbook && ((0, jsx_runtime_1.jsx)(SubjectsTab, { workbook: workbook, mappings: columnMapping, onUpdateName: updateSubjectName, onUpdateMax: updateMaxMarks, onRemove: removeMappingRow, onAddSubject: addSubjectRow, onBack: () => setTab('mapping'), onContinue: () => setTab('photos'), defaultClass: defaultClass, defaultSection: defaultSection, setDefaultClass: setDefaultClass, setDefaultSection: setDefaultSection })), tab === 'photos' && workbook && ((0, jsx_runtime_1.jsx)(PhotosTab, { photoMap: photoMap, photoFile: photoFile, loading: photoLoading, photoRef: photoRef, onChange: handlePhotoFileChange, onPhotoDrop: handlePhotoZip, onBack: () => setTab('subjects'), onContinue: buildStudentsAndValidate, onClear: () => {
                    setPhotoMap({});
                    setPhotoFile(null);
                } })), tab === 'preview' && workbook && ((0, jsx_runtime_1.jsx)(PreviewTab, { students: students, validation: validation, workbook: workbook, onBack: () => setTab('photos'), onRefresh: buildStudentsAndValidate, photoMap: photoMap }))] }));
}
function UploadTab({ loading, fileError, onFile, fileRef, onFileChange, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "card lg:col-span-2", onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file)
                        onFile(file);
                }, children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body", children: [(0, jsx_runtime_1.jsxs)("label", { htmlFor: "excel-input", className: "block cursor-pointer", onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file)
                                    onFile(file);
                            }, children: [(0, jsx_runtime_1.jsx)("div", { className: "border-2 border-dashed border-slate-300 hover:border-brand-400 rounded-xl p-12 text-center transition-colors bg-slate-50/50", children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-2 text-ink-600", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-10 w-10 text-brand-600 animate-spin" }), (0, jsx_runtime_1.jsx)("div", { className: "font-semibold", children: "Parsing workbook..." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "h-14 w-14 mx-auto rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-7 w-7" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-4 text-lg font-semibold text-ink-900", children: "Drop your Excel / CSV file here" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-sm text-ink-500", children: ["or", ' ', (0, jsx_runtime_1.jsx)("span", { className: "text-brand-600 font-semibold", children: "browse to choose" }), ' ', "from your computer"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-xs text-ink-500", children: "Supports .xlsx \u00B7 .xls \u00B7 .csv \u2014 reads the first worksheet by default." })] })) }), (0, jsx_runtime_1.jsx)("input", { ref: fileRef, id: "excel-input", type: "file", className: "hidden", accept: ".xlsx,.xls,.csv", onChange: onFileChange })] }), fileError && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" }), (0, jsx_runtime_1.jsx)("span", { children: fileError })] }))] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { className: "card-header", children: (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Expected Format" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body text-xs space-y-3 text-ink-700", children: [(0, jsx_runtime_1.jsx)("p", { children: "Header row should be the first or near-top non-empty row." }), (0, jsx_runtime_1.jsx)("p", { children: "Auto-detected columns:" }), (0, jsx_runtime_1.jsxs)("ul", { className: "space-y-1 text-ink-600 pl-4 list-disc", children: [(0, jsx_runtime_1.jsx)("li", { children: "Name / Student Name" }), (0, jsx_runtime_1.jsx)("li", { children: "Roll No / Roll Number" }), (0, jsx_runtime_1.jsx)("li", { children: "Class / Section" }), (0, jsx_runtime_1.jsx)("li", { children: "Father / Mother Name" }), (0, jsx_runtime_1.jsx)("li", { children: "DOB / Date of Birth" }), (0, jsx_runtime_1.jsx)("li", { children: "Attendance %" }), (0, jsx_runtime_1.jsx)("li", { children: "Photo filename" })] }), (0, jsx_runtime_1.jsx)("p", { children: "Other columns are classified by the dynamic structure detector." }), (0, jsx_runtime_1.jsxs)("p", { className: "pt-2 border-t border-slate-100", children: ["Special mark values:", ' ', (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-100 px-1 rounded", children: "AB / Absent" }), ",", ' ', (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-100 px-1 rounded", children: "EX / Exempt" }), ",", ' ', (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-100 px-1 rounded", children: "Medical" }), "."] })] })] })] }));
}
function MappingTab({ headers, rows, sheetNames, activeSheet, fileName, mappings, onSwitchSheet, onSetField, onContinue, summary, detectedStructure, dynamicParserFailed, }) {
    const fieldOptions = (0, mappingEngine_1.getCoreFieldOptions)();
    const getDetectedRole = (columnIndex) => {
        // First check the actual mapping to determine the role
        const mapping = mappings[columnIndex];
        if (!mapping)
            return null;
        if (mapping.fieldKey === 'gradeField') {
            return 'Grade / Co-scholastic';
        }
        if (mapping.fieldKey === 'overallField') {
            if (mapping.overallFieldType === 'total')
                return 'Overall Total';
            if (mapping.overallFieldType === 'percentage')
                return 'Overall %';
            if (mapping.overallFieldType === 'position')
                return 'Overall Position';
            return 'Overall';
        }
        if (mapping.fieldKey === 'subject') {
            return 'Subject';
        }
        if (mapping.fieldKey !== 'ignore') {
            return 'Field';
        }
        // Fallback to detected structure if available
        if (!detectedStructure)
            return null;
        if (detectedStructure.studentFields?.some((f) => f.excelColumn === columnIndex)) {
            return 'Field';
        }
        const overall = detectedStructure.overallFields?.find((f) => f.col === columnIndex);
        if (overall) {
            if (overall.fieldType === 'total')
                return 'Overall Total';
            if (overall.fieldType === 'percentage')
                return 'Overall %';
            if (overall.fieldType === 'position')
                return 'Overall Position';
            return 'Overall';
        }
        if (detectedStructure.gradeFields?.some((f) => f.col === columnIndex)) {
            return 'Grade / Co-scholastic';
        }
        if (detectedStructure.subjectGroups?.some((g) => (g.components ?? []).some((c) => c.col === columnIndex))) {
            return 'Subject';
        }
        return null;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [dynamicParserFailed && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0" }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Advanced structure detection had low confidence on this workbook." }), ' ', "Please review mappings carefully."] })] })), (0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body grid grid-cols-1 md:grid-cols-3 gap-4 items-start", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "label", children: "Uploaded File" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-4 w-4 text-brand-600" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate font-medium text-ink-800", children: fileName })] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-xs text-ink-500", children: [rows.length, " data rows"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "label", children: "Worksheet" }), (0, jsx_runtime_1.jsx)("select", { value: activeSheet, onChange: (e) => onSwitchSheet(e.target.value), className: "input", children: sheetNames.map((n) => ((0, jsx_runtime_1.jsx)("option", { value: n, children: n }, n))) }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-xs text-ink-500", children: [headers.length, " columns"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "label", children: "\u00A0" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [summary.missing.length > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: "badge-warning flex-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-3 w-3" }), "Missing:", ' ', summary.missing.join(', ')] })) : ((0, jsx_runtime_1.jsxs)("span", { className: "badge-success flex-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3 w-3" }), "Required fields mapped"] })), (0, jsx_runtime_1.jsxs)("span", { className: "badge-info", children: [summary.subjectCount, " subjects"] })] })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Column Mapping" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500", children: "Excel Column \u2192 Internal Field / Subject" })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-[460px] overflow-auto", children: (0, jsx_runtime_1.jsxs)("table", { className: "table", children: [(0, jsx_runtime_1.jsx)("thead", { className: "sticky top-0 bg-white", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { className: "w-1/4", children: "Excel Column" }), (0, jsx_runtime_1.jsx)("th", { className: "w-1/4", children: "Map to..." }), (0, jsx_runtime_1.jsx)("th", { children: "First Row Preview" }), (0, jsx_runtime_1.jsx)("th", { className: "w-24", children: "Auto-Match" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: (() => {
                                        /*
                                         * SUBJECT GROUP DISPLAY
                                         *
                                         * The internal mapping is column-level because every Excel
                                         * column must remain addressable. The UI, however, should
                                         * present PT/NB/SEA/SA2/TOTAL as ONE subject group.
                                         *
                                         * This avoids showing:
                                         *   English
                                         *   English
                                         *   English
                                         *   English
                                         *
                                         * while keeping every underlying component mapping intact.
                                         */
                                        const rendered = new Set();
                                        return mappings.map((m, columnIndex) => {
                                            if (m.fieldKey === 'subject') {
                                                const groupName = (m.subjectName ||
                                                    m.columnName).trim();
                                                if (rendered.has(`subject:${groupName}`)) {
                                                    return null;
                                                }
                                                rendered.add(`subject:${groupName}`);
                                                const groupColumns = mappings.filter((candidate) => candidate.fieldKey === 'subject' &&
                                                    (candidate.subjectName ||
                                                        candidate.columnName).trim() === groupName);
                                                const componentCount = groupColumns.length;
                                                const samples = Array.from(new Set(groupColumns.flatMap((column) => rows
                                                    .map((row) => String(row[column.columnName] ??
                                                    ''))
                                                    .filter(Boolean)))).slice(0, 3);
                                                return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold text-sm", children: groupName }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] text-ink-400 mt-0.5", children: [componentCount, ' ', "component", componentCount === 1
                                                                            ? ''
                                                                            : 's', " linked"] })] }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("select", { value: "subject", disabled: true, className: "input !py-1.5 text-sm bg-slate-50 cursor-not-allowed", children: (0, jsx_runtime_1.jsx)("option", { value: "subject", children: "Subject Marks" }) }), (0, jsx_runtime_1.jsx)("span", { className: "badge-info text-[10px] shrink-0", children: "Grouped" })] }) }), (0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-600", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "px-1.5 py-0.5 rounded bg-slate-100 font-medium", children: groupName }), componentCount > 1 && ((0, jsx_runtime_1.jsxs)("span", { className: "px-1.5 py-0.5 rounded bg-brand-50 text-brand-700", children: [componentCount, " components"] })), samples.length > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "text-ink-400 ml-1", children: samples.join(' · ') }))] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: "badge-info text-[10px]", children: "Subject" }) })] }, `subject-group:${groupName}`));
                                            }
                                            const firstVal = rows[0]?.[m.columnName];
                                            return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: "font-mono text-xs", children: m.columnName }), (0, jsx_runtime_1.jsx)("td", { children: m.fieldKey === 'gradeField' ? ((0, jsx_runtime_1.jsx)("div", { className: "input !py-1.5 text-sm bg-amber-50 text-amber-800 border-amber-200", children: "Grade / Co-scholastic" })) : m.fieldKey === 'overallField' ? ((0, jsx_runtime_1.jsx)("div", { className: "input !py-1.5 text-sm bg-blue-50 text-blue-800 border-blue-200", children: m.overallFieldType === 'total'
                                                                ? 'Overall Total'
                                                                : m.overallFieldType === 'percentage'
                                                                    ? 'Overall Percentage'
                                                                    : m.overallFieldType === 'position'
                                                                        ? 'Overall Position'
                                                                        : 'Overall Field' })) : ((0, jsx_runtime_1.jsx)("select", { value: m.fieldKey, onChange: (e) => onSetField(columnIndex, e.target.value), className: "input !py-1.5 text-sm", children: fieldOptions.map((fo) => ((0, jsx_runtime_1.jsx)("option", { value: fo.value, children: fo.label }, fo.value))) })) }), (0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-600 truncate max-w-[240px]", children: String(firstVal ?? '—') }), (0, jsx_runtime_1.jsx)("td", { children: (() => {
                                                            const role = getDetectedRole(columnIndex);
                                                            if (role === 'Grade / Co-scholastic') {
                                                                return ((0, jsx_runtime_1.jsx)("span", { className: "badge-warning text-[10px]", children: "Grade / Co-scholastic" }));
                                                            }
                                                            if (role?.startsWith('Overall')) {
                                                                return ((0, jsx_runtime_1.jsx)("span", { className: "badge-info text-[10px]", children: role }));
                                                            }
                                                            if (role === 'Subject') {
                                                                return ((0, jsx_runtime_1.jsx)("span", { className: "badge-info text-[10px]", children: "Subject" }));
                                                            }
                                                            if (role === 'Field') {
                                                                return ((0, jsx_runtime_1.jsx)("span", { className: "badge-success text-[10px]", children: "Field" }));
                                                            }
                                                            return ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-ink-400", children: "Ignored" }));
                                                        })() })] }, m.columnName));
                                        });
                                    })() })] }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-end", children: (0, jsx_runtime_1.jsxs)("button", { onClick: onContinue, className: "btn-primary", disabled: summary.missing.length > 0 ||
                        summary.subjectCount === 0, children: ["Continue to Subjects", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" })] }) })] }));
}
function SubjectsTab({ workbook, mappings, onUpdateName, onUpdateMax, onRemove, onAddSubject, onBack, onContinue, defaultClass, defaultSection, setDefaultClass, setDefaultSection, }) {
    /*
     * GROUPING:
     *
     * English PT
     * English NB
     * English SEA
     * English SA2
     * English TOTAL
     *
     * become one visual subject:
     *
     * English
     */
    const subjects = (0, react_1.useMemo)(() => {
        const groups = new Map();
        for (const mapping of mappings) {
            // Co-scholastic grade fields are NOT academic subjects.
            // They stay in DetectedStructure.gradeFields and are consumed
            // separately by buildStudentsFromDynamicStructure().
            if (mapping.fieldKey !== 'subject') {
                continue;
            }
            const name = (mapping.subjectName ||
                mapping.columnName).trim();
            if (!name)
                continue;
            const existing = groups.get(name) || [];
            existing.push(mapping);
            groups.set(name, existing);
        }
        return Array.from(groups.entries()).map(([name, columns]) => ({
            name,
            columns,
            representative: columns[0],
        }));
    }, [mappings]);
    const updateGroupName = (oldName, newName) => {
        const target = newName.trim();
        if (!target)
            return;
        const group = subjects.find((s) => s.name === oldName);
        if (!group)
            return;
        onUpdateName(group.representative.excelColumn ??
            mappings.indexOf(group.representative), target);
    };
    const updateGroupMax = (oldName, max) => {
        const group = subjects.find((s) => s.name === oldName);
        if (!group)
            return;
        onUpdateMax(group.representative.excelColumn ??
            mappings.indexOf(group.representative), max);
    };
    const removeGroup = (name) => {
        const group = subjects.find((s) => s.name === name);
        if (!group)
            return;
        onRemove(group.representative.excelColumn ??
            mappings.indexOf(group.representative));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Default Class / Section" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500 mt-1", children: "Used for rows missing Class or Section." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body grid grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "label", children: "Default Class" }), (0, jsx_runtime_1.jsx)("input", { className: "input", placeholder: "e.g. 8", value: defaultClass, onChange: (e) => setDefaultClass(e.target.value) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "label", children: "Default Section" }), (0, jsx_runtime_1.jsx)("input", { className: "input", placeholder: "e.g. A", value: defaultSection, onChange: (e) => setDefaultSection(e.target.value) })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { className: "card-header", children: (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Quick Legend" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body text-xs text-ink-700 space-y-2", children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Present:" }), " Numbers contribute to totals."] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "AB / Absent:" }), " Status preserved."] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "EX / Exempt:" }), " Skipped from totals."] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Medical:" }), " Treated similarly to exempt."] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Dynamic Subject Configuration" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500 mt-1", children: "Each subject group appears once. Component columns remain linked internally." })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: onAddSubject, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }), "Add Subject"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-auto", children: (0, jsx_runtime_1.jsxs)("table", { className: "table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Subject Group" }), (0, jsx_runtime_1.jsx)("th", { children: "Components" }), (0, jsx_runtime_1.jsx)("th", { children: "Subject Name" }), (0, jsx_runtime_1.jsx)("th", { className: "w-28", children: "Max Marks" }), (0, jsx_runtime_1.jsx)("th", { className: "w-32", children: "Sample" }), (0, jsx_runtime_1.jsx)("th", { className: "w-12" })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [subjects.map((group) => {
                                            const representative = group.representative;
                                            const samples = Array.from(new Set(group.columns.flatMap((column) => workbook.rows
                                                .map((row) => String(row[column.columnName] ?? ''))
                                                .filter(Boolean)))).slice(0, 3);
                                            return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: "font-semibold text-sm", children: group.name }), (0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-500", children: (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1 max-w-[300px]", children: group.columns.map((column) => {
                                                                const component = column.columnName
                                                                    .split(' | ')
                                                                    .pop() ||
                                                                    column.columnName;
                                                                return ((0, jsx_runtime_1.jsx)("span", { className: "px-1.5 py-0.5 rounded bg-slate-100 font-mono", title: column.columnName, children: component }, column.columnName));
                                                            }) }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { className: "input !py-1.5", value: group.name, onChange: (e) => updateGroupName(group.name, e.target.value) }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, className: "input !py-1.5", value: representative.maxMarks ??
                                                                100, onChange: (e) => updateGroupMax(group.name, Number(e.target.value) || 100) }) }), (0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-600", children: samples.length
                                                            ? samples.join(' · ')
                                                            : ((0, jsx_runtime_1.jsx)("span", { className: "text-ink-400", children: "\u2014" })) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("button", { onClick: () => removeGroup(group.name), className: "p-1 text-ink-400 hover:text-red-600", title: `Remove ${group.name}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) })] }, group.name));
                                        }), subjects.length === 0 && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 6, className: "py-12 text-center text-ink-500 text-sm", children: "No subjects mapped." }) }))] })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: onBack, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "h-4 w-4 rotate-90" }), "Back to Mapping"] }), (0, jsx_runtime_1.jsxs)("button", { onClick: onContinue, className: "btn-primary", disabled: subjects.length === 0, children: ["Continue to Photos", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" })] })] })] }));
}
function PhotosTab({ photoMap, photoFile, loading, photoRef, onChange, onPhotoDrop, onBack, onContinue, onClear, }) {
    const count = Object.keys(photoMap).length;
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onPhotoDrop(file);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "card lg:col-span-2", children: (0, jsx_runtime_1.jsx)("div", { className: "card-body", children: (0, jsx_runtime_1.jsxs)("label", { htmlFor: "photo-input", className: "block cursor-pointer", onDragOver: (e) => e.preventDefault(), onDrop: handleDrop, children: [(0, jsx_runtime_1.jsx)("div", { className: "border-2 border-dashed border-slate-300 hover:border-brand-400 rounded-xl p-10 text-center bg-slate-50/50 transition-colors", children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-2 text-ink-600", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-10 w-10 text-brand-600 animate-spin" }), (0, jsx_runtime_1.jsx)("div", { className: "font-semibold", children: "Reading photos from ZIP..." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "h-14 w-14 mx-auto rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Package, { className: "h-7 w-7" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-4 text-lg font-semibold text-ink-900", children: "Drop Student Photos ZIP" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-sm text-ink-500", children: ["or", ' ', (0, jsx_runtime_1.jsx)("span", { className: "text-brand-600 font-semibold", children: "browse to select" }), ' ', "a ZIP file"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-xs text-ink-500", children: "Naming: match by RollNo.jpg, or use a Photo column." })] })) }), (0, jsx_runtime_1.jsx)("input", { ref: photoRef, id: "photo-input", type: "file", accept: ".zip", className: "hidden", onChange: onChange })] }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Photo Matching" }), count > 0 && ((0, jsx_runtime_1.jsxs)("button", { onClick: onClear, className: "btn-ghost !py-1 !px-2 text-xs", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5" }), "Clear"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body text-sm space-y-2 text-ink-700", children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: count }), " distinct photo file", count === 1 ? '' : 's', " loaded."] }), photoFile && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-xs text-ink-600", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Package, { className: "h-4 w-4" }), photoFile.name] })), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500 border-t border-slate-100 pt-2 mt-2", children: "Matching logic:" }), (0, jsx_runtime_1.jsxs)("ol", { className: "list-decimal pl-4 text-xs text-ink-600 space-y-1", children: [(0, jsx_runtime_1.jsx)("li", { children: "Exact photo filename" }), (0, jsx_runtime_1.jsx)("li", { children: "Roll number" }), (0, jsx_runtime_1.jsx)("li", { children: "Student name" })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500 pt-2", children: "Missing photos show a blank photo box." })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: onBack, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "h-4 w-4 rotate-90" }), "Back to Subjects"] }), (0, jsx_runtime_1.jsxs)("button", { onClick: onContinue, className: "btn-primary", children: ["Preview & Validate", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" })] })] })] }));
}
function PreviewTab({ students, validation, workbook, onBack, onRefresh, photoMap, }) {
    const [selectedId, setSelectedId] = (0, react_1.useState)(students[0]?.studentId || '');
    const selected = students.find((s) => s.studentId === selectedId) || students[0];
    const selectedIssues = validation?.issues.filter((i) => i.studentId ===
        selected?.studentId) ?? [];
    const exportErrors = () => {
        if (!validation ||
            validation.issues.length === 0) {
            return;
        }
        const lines = [
            'Row,Student,RollNo,Severity,Field,Message',
        ];
        for (const i of validation.issues) {
            const stu = students.find((s) => s.studentId === i.studentId);
            lines.push([
                i.rowNumber ?? '',
                stu?.name ?? '',
                stu?.rollNo ?? '',
                i.severity,
                i.field ?? '',
                JSON.stringify(i.message).replace(/^"|"$/g, ''),
            ].join(','));
        }
        const blob = new Blob([lines.join('\n')], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
            'validation_errors.csv';
        a.click();
        URL.revokeObjectURL(url);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [validation ? ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold uppercase tracking-wide text-ink-500", children: "Total Students" }), (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold mt-1 text-ink-900", children: students.length })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold uppercase tracking-wide text-ink-500", children: "Status" }), (0, jsx_runtime_1.jsx)("div", { className: `text-2xl font-bold mt-1 ${validation.isValid
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'}`, children: validation.isValid
                                        ? 'VALID'
                                        : 'HAS ISSUES' })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold uppercase tracking-wide text-red-500", children: "Errors" }), (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold mt-1 text-red-700", children: validation.errorCount })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold uppercase tracking-wide text-amber-600", children: "Warnings" }), (0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold mt-1 text-amber-700", children: validation.warningCount })] }) })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsx)("div", { className: "card-body text-sm text-ink-600", children: "Building preview..." }) })), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 xl:grid-cols-12 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card xl:col-span-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Student List & Validation" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: onRefresh, className: "btn-secondary !py-1.5 !px-3 text-xs", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-3.5 w-3.5" }), "Re-run"] }), validation &&
                                                validation.issues.length > 0 && ((0, jsx_runtime_1.jsx)("button", { onClick: exportErrors, className: "btn-secondary !py-1.5 !px-3 text-xs", children: "Export Errors CSV" }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-[560px] overflow-auto", children: (0, jsx_runtime_1.jsxs)("table", { className: "table", children: [(0, jsx_runtime_1.jsx)("thead", { className: "sticky top-0 bg-white z-10", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { className: "w-12", children: "Row" }), (0, jsx_runtime_1.jsx)("th", { children: "Roll" }), (0, jsx_runtime_1.jsx)("th", { children: "Name" }), (0, jsx_runtime_1.jsx)("th", { className: "w-20", children: "Issues" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: students.map((s) => {
                                                const issues = validation?.issues.filter((i) => i.studentId ===
                                                    s.studentId) ?? [];
                                                const err = issues.filter((i) => i.severity ===
                                                    'error').length;
                                                const warn = issues.filter((i) => i.severity ===
                                                    'warning').length;
                                                const active = s.studentId ===
                                                    selected?.studentId;
                                                return ((0, jsx_runtime_1.jsxs)("tr", { onClick: () => setSelectedId(s.studentId), className: (0, clsx_1.default)('cursor-pointer', active &&
                                                        'bg-brand-50/60'), children: [(0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-500 font-mono", children: s.rowNumber }), (0, jsx_runtime_1.jsx)("td", { className: "font-medium", children: s.rollNo }), (0, jsx_runtime_1.jsx)("td", { className: "truncate max-w-[200px]", children: s.name }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-1", children: [err > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "badge-error", children: [err, "E"] })), warn > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "badge-warning", children: [warn, "W"] })), err === 0 &&
                                                                        warn === 0 && ((0, jsx_runtime_1.jsx)("span", { className: "badge-success", children: "OK" }))] }) })] }, s.studentId));
                                            }) })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card xl:col-span-7", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: selected
                                            ? `${selected.rollNo} · ${selected.name}`
                                            : 'No student selected' }), selected && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-ink-500", children: ["Row ", selected.rowNumber, " \u00B7", ' ', workbook.fileName] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body space-y-4", children: [selected &&
                                        selectedIssues.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 rounded-lg bg-red-50 border border-red-200", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold text-red-800 mb-2", children: "Issues for this student:" }), (0, jsx_runtime_1.jsx)("ul", { className: "space-y-1 text-sm text-red-800", children: selectedIssues.map((i, idx) => ((0, jsx_runtime_1.jsxs)("li", { className: "flex gap-2 items-start", children: [i.severity ===
                                                            'error' ? ((0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0 text-amber-600" })), (0, jsx_runtime_1.jsxs)("span", { children: [i.field && ((0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-xs mr-2", children: ["[", i.field, "]"] })), i.message] })] }, idx))) })] })), selected && ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm", children: [(0, jsx_runtime_1.jsx)(Detail, { label: "Class / Section", value: `${selected.class ?? '—'}${selected.section
                                                    ? ` - ${selected.section}`
                                                    : ''}` }), (0, jsx_runtime_1.jsx)(Detail, { label: "Roll No", value: selected.rollNo }), (0, jsx_runtime_1.jsx)(Detail, { label: "Father's Name", value: selected.fatherName }), (0, jsx_runtime_1.jsx)(Detail, { label: "Mother's Name", value: selected.motherName }), (0, jsx_runtime_1.jsx)(Detail, { label: "Attendance", value: selected.attendance }), (0, jsx_runtime_1.jsx)(Detail, { label: "Photo Filename", value: selected.photoFilename })] })), selected && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2", children: "Subjects & Marks" }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-auto border border-slate-200 rounded", children: (0, jsx_runtime_1.jsxs)("table", { className: "table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Subject" }), (0, jsx_runtime_1.jsx)("th", { className: "w-24", children: "Marks" }), (0, jsx_runtime_1.jsx)("th", { className: "w-24", children: "Max" }), (0, jsx_runtime_1.jsx)("th", { className: "w-24", children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: selected.subjects.map((s, i) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: s.name }), (0, jsx_runtime_1.jsx)("td", { className: (0, clsx_1.default)(s.status !==
                                                                            'present' &&
                                                                            'text-ink-500 italic'), children: s.status ===
                                                                            'present'
                                                                            ? s.marks ??
                                                                                '—'
                                                                            : s.rawValue ??
                                                                                s.status }), (0, jsx_runtime_1.jsx)("td", { children: s.maxMarks }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)('badge', s.status ===
                                                                                'present'
                                                                                ? 'badge-info'
                                                                                : 'badge-warning'), children: s.status }) })] }, i))) })] }) })] })), selected && ((0, jsx_runtime_1.jsx)("div", { className: "pt-2 border-t border-slate-100 text-xs text-ink-500", children: Object.keys(photoMap)
                                            .length > 0
                                            ? selected.photoFilename &&
                                                photoMap[selected.photoFilename]
                                                ? ((0, jsx_runtime_1.jsxs)("span", { className: "text-emerald-700 flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Image, { className: "h-3.5 w-3.5" }), "Photo matched by filename"] }))
                                                : photoMap[selected.rollNo] ||
                                                    photoMap[`${selected.rollNo}.jpg`]
                                                    ? ((0, jsx_runtime_1.jsxs)("span", { className: "text-emerald-700 flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Image, { className: "h-3.5 w-3.5" }), "Photo matched by roll number"] }))
                                                    : ((0, jsx_runtime_1.jsxs)("span", { className: "text-amber-700 flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Image, { className: "h-3.5 w-3.5" }), "No photo matched"] }))
                                            : 'No photo ZIP uploaded — blank photo box on report.' })), selected &&
                                        validation?.isValid && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4" }), "This student record is valid."] }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: onBack, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "h-4 w-4 rotate-90" }), "Back to Photos"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 text-xs text-ink-500", children: ["When you are happy with the data, proceed to ", (0, jsx_runtime_1.jsx)("strong", { children: "Generate Reports" }), "."] })] })] }));
}
function Detail({ label, value, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 border-b border-slate-100 py-1", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ink-500 w-32 shrink-0", children: [label, ":"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-ink-900 truncate", children: value || '—' })] }));
}
