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
import { AttackConsole } from "./pages/AttackConsole";
import { SatelliteVerification } from "./pages/SatelliteVerification";
import { SectionLayout } from "./components/SectionLayout";

const Facility = lazy(() => import("./pages/Facility").then((module) => ({ default: module.Facility })));

export function App() {
  return (
    <Routes>
      <Route path="attack" element={<AttackConsole />} />
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="facility" element={<SectionLayout label="Facility" tabs={[["Digital Twin", "/facility", true], ["Satellite Verification", "/facility/satellite"], ["Services & Health", "/facility/services"]]} />}>
          <Route index element={<Suspense fallback={<div className="facility-route-loading">Loading digital twin…</div>}><Facility /></Suspense>} />
          <Route path="satellite" element={<SatelliteVerification />} />
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
    </Routes>
  );
}
