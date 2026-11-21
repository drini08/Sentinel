import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { SectionLayout } from "./components/SectionLayout";

const Overview = lazy(() => import("./pages/Overview").then((module) => ({ default: module.Overview })));
const Incidents = lazy(() => import("./pages/Incidents").then((module) => ({ default: module.Incidents })));
const Services = lazy(() => import("./pages/Services").then((module) => ({ default: module.Services })));
const Policies = lazy(() => import("./pages/Policies").then((module) => ({ default: module.Policies })));
const Logs = lazy(() => import("./pages/Logs").then((module) => ({ default: module.Logs })));
const Lab = lazy(() => import("./pages/Lab").then((module) => ({ default: module.Lab })));
const Settings = lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));
const Threats = lazy(() => import("./pages/Threats").then((module) => ({ default: module.Threats })));
const Defense = lazy(() => import("./pages/Defense").then((module) => ({ default: module.Defense })));
const AttackConsole = lazy(() => import("./pages/AttackConsole").then((module) => ({ default: module.AttackConsole })));
const SatelliteVerification = lazy(() => import("./pages/SatelliteVerification").then((module) => ({ default: module.SatelliteVerification })));
const VisualInspection = lazy(() => import("./pages/VisualInspection").then((module) => ({ default: module.VisualInspection })));
const Facility = lazy(() => import("./pages/Facility").then((module) => ({ default: module.Facility })));

export function App() {
  return (
    <Suspense fallback={<div className="route-loading"><span />Loading SENTINEL…</div>}><Routes>
      <Route path="attack" element={<AttackConsole />} />
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="facility" element={<SectionLayout label="Facility" tabs={[["Infrastructure View", "/facility", true], ["Satellite Intelligence", "/facility/satellite"], ["Visual Inspection", "/facility/inspection"], ["Services & Health", "/facility/services"]]} />}>
          <Route index element={<Facility />} />
          <Route path="satellite" element={<SatelliteVerification />} />
          <Route path="inspection" element={<VisualInspection />} />
          <Route path="services" element={<Services />} />
        </Route>
        <Route path="security" element={<SectionLayout label="Security" tabs={[["Threats", "/security/threats"], ["Incidents", "/security/incidents"], ["Defense", "/security/defense"], ["Policies", "/security/policies"], ["Audit Logs", "/security/logs"]]} />}>
          <Route index element={<Navigate to="threats" replace />} />
          <Route path="threats" element={<Threats />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="defense" element={<Defense />} />
          <Route path="policies" element={<Policies />} />
          <Route path="logs" element={<Logs />} />
        </Route>
        <Route path="demo" element={<SectionLayout label="Demo" tabs={[["Attack Lab", "/demo", true], ["Jury Console", "/attack"]]} />}>
          <Route index element={<Lab />} />
        </Route>
        <Route path="threats" element={<Navigate to="/security/threats" replace />} />
        <Route path="incidents" element={<Navigate to="/security/incidents" replace />} />
        <Route path="defense" element={<Navigate to="/security/defense" replace />} />
        <Route path="services" element={<Navigate to="/facility/services" replace />} />
        <Route path="policies" element={<Navigate to="/security/policies" replace />} />
        <Route path="logs" element={<Navigate to="/security/logs" replace />} />
        <Route path="lab" element={<Navigate to="/demo" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes></Suspense>
  );
}
