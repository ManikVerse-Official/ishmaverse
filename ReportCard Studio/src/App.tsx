import type { ReactElement } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SchoolProfile from './pages/SchoolProfile';
import ImportStudents from './pages/ImportStudents';
import ReportTemplate from './pages/ReportTemplate';
import GenerateReports from './pages/GenerateReports';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import { useEntitlement } from './store/entitlementStore';

/**
 * Every working screen requires a signed-in account.
 *
 * The free tries are counted per account (and per IP server-side), so the tool
 * has to know who is generating. Without this, clearing browser storage would
 * hand out unlimited free generations. `/login` and `/pricing` stay public.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  const account = useEntitlement((s) => s.account);
  const location = useLocation();

  if (!account) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="school-profile"
          element={
            <RequireAuth>
              <SchoolProfile />
            </RequireAuth>
          }
        />
        <Route
          path="import"
          element={
            <RequireAuth>
              <ImportStudents />
            </RequireAuth>
          }
        />
        <Route
          path="template"
          element={
            <RequireAuth>
              <ReportTemplate />
            </RequireAuth>
          }
        />
        <Route
          path="generate"
          element={
            <RequireAuth>
              <GenerateReports />
            </RequireAuth>
          }
        />
        <Route path="pricing" element={<Pricing />} />
        <Route path="login" element={<Login />} />
      </Route>
    </Routes>
  );
}
