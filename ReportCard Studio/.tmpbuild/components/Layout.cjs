"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Layout;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: lucide_react_1.LayoutDashboard },
    { to: '/school-profile', label: 'School Profile', icon: lucide_react_1.GraduationCap },
    { to: '/import', label: 'Import Students', icon: lucide_react_1.Upload },
    { to: '/template', label: 'Report Template', icon: lucide_react_1.FileText },
    { to: '/generate', label: 'Generate Reports', icon: lucide_react_1.Printer },
];
const STEPS = [
    { step: 1, label: 'School Details', route: '/school-profile' },
    { step: 2, label: 'Upload Excel', route: '/import' },
    { step: 3, label: 'Map / Verify Data', route: '/import' },
    { step: 4, label: 'Upload Photos', route: '/import' },
    { step: 5, label: 'Preview & Validate', route: '/template' },
    { step: 6, label: 'Generate Reports', route: '/generate' },
    { step: 7, label: 'Download ZIP', route: '/generate' },
];
function routeToMaxStep(route) {
    if (route.startsWith('/school-profile'))
        return 1;
    if (route.startsWith('/import'))
        return 3;
    if (route.startsWith('/template'))
        return 5;
    if (route.startsWith('/generate'))
        return 7;
    return 0;
}
function Layout() {
    const location = (0, react_router_dom_1.useLocation)();
    const maxStep = routeToMaxStep(location.pathname);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen flex flex-col", children: [(0, jsx_runtime_1.jsxs)("header", { className: "bg-white border-b border-slate-200 sticky top-0 z-30", children: [(0, jsx_runtime_1.jsxs)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-lg font-semibold text-ink-900 leading-tight", children: "ReportCard Studio" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-ink-500 leading-tight", children: "Excel In. Professional Report Cards Out." })] })] }), (0, jsx_runtime_1.jsx)("nav", { className: "hidden md:flex items-center gap-1", children: NAV_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.NavLink, { to: item.to, className: ({ isActive }) => (0, clsx_1.default)('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive
                                            ? 'bg-brand-50 text-brand-700'
                                            : 'text-ink-700 hover:bg-slate-100'), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "h-4 w-4" }), item.label] }, item.to));
                                }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "md:hidden border-t border-slate-100 overflow-x-auto", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-7xl mx-auto px-4 flex gap-1 py-2 min-w-max", children: NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.NavLink, { to: item.to, className: ({ isActive }) => (0, clsx_1.default)('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap', isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-ink-700 bg-slate-50'), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "h-3.5 w-3.5" }), item.label] }, item.to));
                            }) }) })] }), maxStep > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "bg-white border-b border-slate-200", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto", children: (0, jsx_runtime_1.jsx)("ol", { className: "flex items-center gap-2 min-w-max", children: STEPS.map((s, i) => {
                            const done = s.step < maxStep;
                            const active = s.step === maxStep;
                            return ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)('step-badge shrink-0', done && 'bg-emerald-600 text-white', active && 'bg-brand-600 text-white', !done && !active && 'bg-slate-100 text-ink-500'), children: s.step }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)('text-xs font-medium whitespace-nowrap', (done || active) ? 'text-ink-800' : 'text-ink-500'), children: s.label }), i < STEPS.length - 1 && ((0, jsx_runtime_1.jsx)("div", { className: "w-4 sm:w-8 h-px bg-slate-200 shrink-0" }))] }, s.step));
                        }) }) }) })), (0, jsx_runtime_1.jsx)("main", { className: "flex-1", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", children: (0, jsx_runtime_1.jsx)(react_router_dom_1.Outlet, {}) }) }), (0, jsx_runtime_1.jsx)("footer", { className: "border-t border-slate-200 bg-white", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-ink-500 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "ReportCard Studio \u00B7 Phase 1 \u00B7 Report Generation Engine" }), (0, jsx_runtime_1.jsx)("span", { children: "Data stays local. No student data is uploaded anywhere." })] }) })] }));
}
