"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportTemplate;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const appStore_1 = require("../store/appStore");
const ReportCardPreview_1 = __importDefault(require("../components/report/ReportCardPreview"));
const photoMatcher_1 = require("../services/photoMatcher");
const calculationEngine_1 = require("../services/calculationEngine");
const validationEngine_1 = require("../services/validationEngine");
const lucide_react_1 = require("lucide-react");
const pdfGenerator_1 = require("../services/pdfGenerator");
const bulkGenerator_1 = require("../services/bulkGenerator");
function ReportTemplate() {
    const students = (0, appStore_1.useAppStore)((s) => s.students);
    const school = (0, appStore_1.useAppStore)((s) => s.schoolProfile);
    const photoMap = (0, appStore_1.useAppStore)((s) => s.photoMap);
    const validation = (0, appStore_1.useAppStore)((s) => s.validation);
    const setValidation = (0, appStore_1.useAppStore)((s) => s.setValidation);
    const [idx, setIdx] = (0, react_1.useState)(0);
    const [downloading, setDownloading] = (0, react_1.useState)(false);
    const student = students[idx];
    (0, react_1.useMemo)(() => {
        if (students.length > 0 && !validation) {
            const v = (0, validationEngine_1.validateStudents)(students);
            setValidation(v);
        }
    }, [students.length, validation, setValidation, students]);
    if (students.length === 0) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-ink-900", children: "Report Template" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-ink-500", children: "Preview the holistic report-card layout and inspect every field before generating." })] }), (0, jsx_runtime_1.jsx)(EmptyState, {})] }));
    }
    const photo = student
        ? (0, photoMatcher_1.resolvePhotoForStudent)(photoMap, student.rollNo, student.photoFilename, student.name)
        : undefined;
    const totals = student ? (0, calculationEngine_1.computeTotals)(student) : null;
    const studentIssues = validation?.issues.filter((i) => i.studentId === student?.studentId) ?? [];
    const downloadOne = async () => {
        if (!student)
            return;
        setDownloading(true);
        try {
            const blob = await (0, pdfGenerator_1.generateStudentPdfBlob)({ student, school, photoDataUrl: photo });
            const used = new Set();
            const fname = (0, pdfGenerator_1.buildPdfFilename)(student.rollNo, student.name, used);
            (0, bulkGenerator_1.downloadBlob)(blob, fname);
        }
        finally {
            setDownloading(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-ink-900", children: "Report Template" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-ink-500", children: "Preview the report layout. Navigate between students to check each record." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setIdx((i) => Math.max(0, i - 1)), disabled: idx === 0, className: "px-2 py-2 text-ink-600 hover:bg-slate-50 disabled:opacity-40", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-ink-700 px-3 min-w-[110px] text-center font-medium", children: [idx + 1, " / ", students.length] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIdx((i) => Math.min(students.length - 1, i + 1)), disabled: idx >= students.length - 1, className: "px-2 py-2 text-ink-600 hover:bg-slate-50 disabled:opacity-40", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: downloadOne, disabled: downloading, className: "btn-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4" }), downloading ? 'Generating...' : 'Download This PDF'] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-4 w-4 text-brand-600" }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Current Student" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body text-sm space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Name:" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium truncate text-right", children: student?.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Roll No:" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: student?.rollNo })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Class / Sec:" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-medium", children: [student?.class, student?.section ? ` - ${student.section}` : ''] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: "Attendance:" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: student?.attendance || '—' })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { className: "card-header", children: (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Totals Preview" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card-body space-y-2 text-sm", children: [(0, jsx_runtime_1.jsx)(SumRow, { label: "Subjects Count", value: `${student?.subjects.length ?? 0}` }), (0, jsx_runtime_1.jsx)(SumRow, { label: "Present", value: `${totals?.presentSubjects ?? 0}` }), (0, jsx_runtime_1.jsx)(SumRow, { label: "Grand Total", value: `${totals?.totalMarks ?? 0} / ${totals?.totalMax ?? 0}`, strong: true }), (0, jsx_runtime_1.jsx)(SumRow, { label: "Percentage", value: totals && totals.percentage !== null && totals.percentage !== undefined ? `${totals.percentage}%` : '—' }), (0, jsx_runtime_1.jsx)(SumRow, { label: "Overall Grade", value: totals?.overallGrade ?? '—' }), (0, jsx_runtime_1.jsx)(SumRow, { label: "Result", value: totals && totals.percentage !== null && totals.percentage !== undefined
                                                    ? totals.passed
                                                        ? 'PROMOTED'
                                                        : 'NEEDS IMPROVEMENT'
                                                    : '—', highlight: totals?.passed })] })] }), studentIssues.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { className: "card-header", children: (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Validation for This Student" }) }), (0, jsx_runtime_1.jsx)("div", { className: "card-body space-y-2 text-xs", children: studentIssues.map((i, idx2) => ((0, jsx_runtime_1.jsxs)("div", { className: `p-2 rounded-lg border ${i.severity === 'error'
                                                ? 'border-red-200 bg-red-50 text-red-800'
                                                : 'border-amber-200 bg-amber-50 text-amber-800'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "font-semibold uppercase", children: [i.severity, " \u00B7 ", i.type] }), (0, jsx_runtime_1.jsx)("div", { children: i.message })] }, idx2))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { className: "card-header", children: (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-ink-900", children: "Jump to Student" }) }), (0, jsx_runtime_1.jsx)("div", { className: "card-body", children: (0, jsx_runtime_1.jsx)("select", { className: "input", value: idx, onChange: (e) => setIdx(Number(e.target.value)), children: students.map((s, i) => ((0, jsx_runtime_1.jsxs)("option", { value: i, children: [s.rollNo, " \u00B7 ", s.name] }, s.studentId))) }) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-3 overflow-auto max-h-[calc(100vh-180px)] pr-2 pb-8", children: (0, jsx_runtime_1.jsx)(ReportCardPreview_1.default, { student: student, school: school, photoDataUrl: photo }) })] })] }));
}
function EmptyState() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "card", children: (0, jsx_runtime_1.jsxs)("div", { className: "card-body py-16 text-center text-ink-500", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-10 w-10 mx-auto text-ink-300 mb-3" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-ink-800", children: "No students loaded yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm mt-1 max-w-md mx-auto", children: "Complete the \u201CImport Students\u201D workflow first. You will then be able to preview each student report card in this tab before final generation." })] }) }));
}
function SumRow({ label, value, strong, highlight, }) {
    let cls = 'text-ink-800';
    if (highlight)
        cls = 'text-emerald-700 font-bold';
    else if (strong)
        cls = 'text-ink-900 font-bold';
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between border-b border-slate-100 py-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ink-500", children: label }), (0, jsx_runtime_1.jsx)("span", { className: cls, children: value })] }));
}
