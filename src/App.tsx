import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Overview } from "./pages/Overview";
import { Incidents } from "./pages/Incidents";
import { Services } from "./pages/Services";
import { Policies } from "./pages/Policies";
import { Logs } from "./pages/Logs";
import { Lab } from "./pages/Lab";
import { Settings } from "./pages/Settings";
import { Threats } from "./pages/Threats";
import { Defense } from "./pages/Defense";

const Facility = lazy(() => import("./pages/Facility").then((module) => ({ default: module.Facility })));

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="threats" element={<Threats />} />
        <Route path="defense" element={<Defense />} />
        <Route path="facility" element={<Suspense fallback={<div className="facility-route-loading">Loading digital twin…</div>}><Facility /></Suspense>} />
        <Route path="services" element={<Services />} />
        <Route path="policies" element={<Policies />} />
        <Route path="logs" element={<Logs />} />
        <Route path="lab" element={<Lab />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
