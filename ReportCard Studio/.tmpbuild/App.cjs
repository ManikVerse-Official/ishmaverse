"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_router_dom_1 = require("react-router-dom");
const Layout_1 = __importDefault(require("./components/Layout"));
const Dashboard_1 = __importDefault(require("./pages/Dashboard"));
const SchoolProfile_1 = __importDefault(require("./pages/SchoolProfile"));
const ImportStudents_1 = __importDefault(require("./pages/ImportStudents"));
const ReportTemplate_1 = __importDefault(require("./pages/ReportTemplate"));
const GenerateReports_1 = __importDefault(require("./pages/GenerateReports"));
function App() {
    return ((0, jsx_runtime_1.jsx)(react_router_dom_1.Routes, { children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(Layout_1.default, {}), children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { index: true, element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/dashboard", replace: true }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "dashboard", element: (0, jsx_runtime_1.jsx)(Dashboard_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "school-profile", element: (0, jsx_runtime_1.jsx)(SchoolProfile_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "import", element: (0, jsx_runtime_1.jsx)(ImportStudents_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "template", element: (0, jsx_runtime_1.jsx)(ReportTemplate_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "generate", element: (0, jsx_runtime_1.jsx)(GenerateReports_1.default, {}) })] }) }));
}
