"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GenerateReports;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const appStore_1 = require("../store/appStore");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const bulkGenerator_1 = require("../services/bulkGenerator");
const validationEngine_1 = require("../services/validationEngine");
const ReportCardPreview_1 = __importDefault(require("../components/report/ReportCardPreview"));
const photoMatcher_1 = require("../services/photoMatcher");
const pdfGenerator_1 = require("../services/pdfGenerator");
function GenerateReports() {
    const students = (0, appStore_1.useAppStore)((s) => s.students);
    const school = (0, appStore_1.useAppStore)((s) => s.schoolProfile);
    const photoMap = (0, appStore_1.useAppStore)((s) => s.photoMap);
    const validation = (0, appStore_1.useAppStore)((s) => s.validation);
    const setValidation = (0, appStore_1.useAppStore)((s) => s.setValidation);
    const generation = (0, appStore_1.useAppStore)((s) => s.generation);
    const setGen = (0, appStore_1.useAppStore)((s) => s.setGenerationProgress);
    const resetGen = (0, appStore_1.useAppStore)((s) => s.resetGeneration);
    const [mode, setMode] = (0, react_1.useState)('valid');
    const abortRef = (0, react_1.useRef)(null);
    if (validation === null && students.length > 0) {
        const v = (0, validationEngine_1.validateStudents)(students);
        setValidation(v);
    }
    const readyCount = (0, react_1.useMemo)(() => {
        if (!validation)
            return 0;
        const badIds = new Set(validation.issues.filter((i) => i.severity === 'error').map((i) => i.studentId));
        return students.filter((s) => !badIds.has(s.studentId)).length;
    }, [validation, students]);
    const chosenStudents = (0, react_1.useMemo)(() => {
        if (mode === 'all' || !validation)
            return students;
        const badIds = new Set(validation.issues.filter((i) => i.severity === 'error').map((i) => i.studentId));
        return students.filter((s) => !badIds.has(s.studentId));
    }, [mode, students, validation]);
    const start = async () => {
        if (chosenStudents.length === 0)
            return;
        resetGen();
        const controller = new AbortController();
        abortRef.current = controller;
        setGen({
            status: 'running',
            total: chosenStudents.length,
            completed: 0,
            failed: 0,
            results: [],
        });
        try {
            const { blob, filename, results } = await (0, bulkGenerator_1.generateAllAndZip)({
                students: chosenStudents,
                school,
                photoMap,
                batchSize: 5,
                signal: controller.signal,
                onProgress: ({ completed, failed, total, current }) => {
                    setGen({
                        completed,
                        failed,
                        total,
                        current: current
                            ? { studentId: current.studentId, name: current.name, rollNo: current.rollNo }
                            : undefined,
                    });
                },
                onStudentComplete: (res) => {
                    setGen({ results: [...generation.results, res] });
                },
            });
            const url = URL.createObjectURL(blob);
            setGen({
                status: 'complete',
                results,
                zipBlobUrl: url,
                zipFileName: filename,
            });
        }
        catch (e) {
            setGen({
                status: 'error',
            });
        }
        finally {
            abortRef.current = null;
        }
    };
    const stop = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        setGen({ status: 'error' });
    };
    const downloadZip = () => {
        if (generation.zipBlobUrl && generation.zipFileName) {
            const a = document.createElement('a');
            a.href = generation.zipBlobUrl;
            a.download = generation.zipFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
    const downloadFailed = () => {
        const failed = generation.results.filter((r) => !r.success);
        if (failed.length === 0)
            return;
        const lines = ['Row,Roll,Name,Reason'];
        for (const f of failed) {
            const name = JSON.stringify(f.name).replace(/^"|"$/g, '');
            const reason = JSON.stringify(f.error || '').replace(/^"|"$/g, '');
            lines.push([f.rowNumber, f.rollNo, name, reason].join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        (0, bulkGenerator_1.downloadBlob)(blob, 'failed_students.csv');
    };
    const progressPct = generation.total > 0
        ? Math.round(((generation.completed + generation.failed) / generation.total) * 100)
        : 0;
    if (students.length === 0) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-ink-900", children: "Generate Reports" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-ink-500", children: "Batch-generate one PDF per student and package all into a single ZIP." })] }), (0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body py-16 text-center text-ink-500", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Upload, { className: "h-10 w-10 mx-auto text-ink-300 mb-3" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-ink-800", children: "No students available" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm mt-1 max-w-md mx-auto", children: "Complete the \u201CImport Students\u201D workflow to start by importing an Excel file first." })] }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-ink-900", children: "Generate Reports" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-ink-500", children: ["One PDF per student \u00B7 Filename", ' ', (0, jsx_runtime_1.jsx)("code", { className: "bg-slate-100 px-1 rounded text-xs", children: `{rollNo}_{name}.pdf` }), " \u00B7 All packaged into a single ZIP."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [generation.status === 'complete' && generation.zipBlobUrl && ((0, jsx_runtime_1.jsxs)("button", { onClick: downloadZip, className: "btn-primary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4" }), " Download ", generation.zipFileName] })), generation.status === 'running' ? ((0, jsx_runtime_1.jsxs)("button", { onClick: stop, className: "btn-danger", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Square, { className: "h-4 w-4" }), " Cancel"] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: start, className: "btn-primary", disabled: chosenStudents.length === 0, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Play, { className: "h-4 w-4" }), generation.status === 'complete'
                                                ? 'Re-generate'
                                                : `Generate ${chosenStudents.length} Reports`] }), generation.status !== 'idle' && ((0, jsx_runtime_1.jsxs)("button", { onClick: resetGen, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "h-4 w-4" }), " Reset"] }))] }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card lg:col-span-2 space-y-4 p-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3 text-sm", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-ink-800", children: "Include students:" }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "mode", checked: mode === 'valid', onChange: () => setMode('valid'), className: "text-brand-600" }), "Only records with no errors (", readyCount, ")"] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "mode", checked: mode === 'all', onChange: () => setMode('all'), className: "text-brand-600" }), "All records (", students.length, ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2 text-sm", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-ink-800", children: generation.status === 'running' ? 'Generating Report Cards...' : 'Generation Progress' }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ink-600 tabular-nums", children: [progressPct, "%"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full h-3 bg-slate-100 rounded-full overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)('h-full transition-all duration-300', generation.status === 'error'
                                                ? 'bg-red-500'
                                                : generation.status === 'complete' && generation.failed > 0
                                                    ? 'bg-amber-500'
                                                    : 'bg-brand-600'), style: { width: `${progressPct}%` } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex flex-wrap gap-4 text-sm text-ink-600", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold tabular-nums", children: generation.completed + generation.failed }), ' ', "/ ", generation.total || chosenStudents.length, " completed"] }), (0, jsx_runtime_1.jsxs)("span", { className: generation.failed > 0 ? 'text-red-700 font-semibold' : '', children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-4 w-4 inline mr-1 align-[-2px]" }), generation.failed, " errors"] }), generation.current && generation.status === 'running' && ((0, jsx_runtime_1.jsxs)("span", { className: "text-ink-700 truncate max-w-xs", children: ["Now: ", (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: generation.current.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ink-500", children: [" \u00B7 Roll ", generation.current.rollNo] })] }))] })] }), generation.results.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-ink-800", children: "Results" }), generation.failed > 0 && ((0, jsx_runtime_1.jsxs)("button", { onClick: downloadFailed, className: "btn-secondary !py-1 !px-3 text-xs", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileDown, { className: "h-3.5 w-3.5" }), " Export Failed CSV"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-64 overflow-auto border border-slate-200 rounded-lg", children: (0, jsx_runtime_1.jsxs)("table", { className: "table", children: [(0, jsx_runtime_1.jsx)("thead", { className: "sticky top-0 bg-white", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Row" }), (0, jsx_runtime_1.jsx)("th", { children: "Roll" }), (0, jsx_runtime_1.jsx)("th", { children: "Name" }), (0, jsx_runtime_1.jsx)("th", { children: "File" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: generation.results.map((r, i) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: "text-xs text-ink-500 font-mono", children: r.rowNumber }), (0, jsx_runtime_1.jsx)("td", { className: "font-medium", children: r.rollNo }), (0, jsx_runtime_1.jsx)("td", { className: "truncate max-w-[220px]", children: r.name }), (0, jsx_runtime_1.jsx)("td", { className: "font-mono text-xs max-w-[240px] truncate", children: r.fileName || '—' }), (0, jsx_runtime_1.jsx)("td", { children: r.success ? ((0, jsx_runtime_1.jsxs)("span", { className: "badge-success", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-3 w-3" }), " Generated"] })) : ((0, jsx_runtime_1.jsxs)("span", { className: "badge-error", title: r.error, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-3 w-3" }), " Failed"] })) })] }, i))) })] }) })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "card space-y-3 p-5", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-ink-900", children: "Validation Summary" }), validation ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Students" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: students.length })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Errors" }), (0, jsx_runtime_1.jsx)("span", { className: validation.errorCount > 0 ? 'text-red-700 font-semibold' : 'text-ink-800 font-semibold', children: validation.errorCount })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Warnings" }), (0, jsx_runtime_1.jsx)("span", { className: validation.warningCount > 0 ? 'text-amber-700 font-semibold' : 'text-ink-800 font-semibold', children: validation.warningCount })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between pt-2 mt-2 border-t border-slate-100", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "To generate" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-700", children: chosenStudents.length })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "ZIP filename" }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-xs truncate max-w-[180px]", title: (0, pdfGenerator_1.buildZipFilename)(students[0]?.class, students[0]?.section), children: (0, pdfGenerator_1.buildZipFilename)(students[0]?.class, students[0]?.section) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Photos available" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: Object.keys(photoMap).length > 0 ? 'YES' : 'none' })] })] })) : ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-ink-500", children: "Validating..." })), validation && !validation.isValid && ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0" }), (0, jsx_runtime_1.jsx)("span", { children: "Some students have validation errors. By default, only valid records are generated. Switch to \u201CAll records\u201D if you want to include them anyway." })] }))] })] }), chosenStudents[0] && ((0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Sample Preview (first student in queue)" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-ink-500", children: "Actual PDFs are print-ready and follow this layout with clean A4 margins." })] }), (0, jsx_runtime_1.jsx)("div", { className: "card-body overflow-auto max-h-[720px]", children: (0, jsx_runtime_1.jsx)("div", { style: { transform: 'scale(0.75)', width: '133.333%', transformOrigin: 'top left' }, children: (0, jsx_runtime_1.jsx)(ReportCardPreview_1.default, { student: chosenStudents[0], school: school, photoDataUrl: (0, photoMatcher_1.resolvePhotoForStudent)(photoMap, chosenStudents[0].rollNo, chosenStudents[0].photoFilename, chosenStudents[0].name) }) }) })] }))] }));
}
