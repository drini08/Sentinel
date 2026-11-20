import { Activity, FileSearch } from "lucide-react";
import { PageHeader, Status } from "../components/UI";
import { type Detection, type Policy, usePolling } from "../api";

export function Threats() {
  const { data: detections, connected } = usePolling<Detection[]>("/api/v1/detections", []);
  const policies = usePolling<Policy[]>("/api/v1/policies", []);
  const policy = policies.data[0];
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Threat understanding" title="Threat Intelligence" description="Explainable rule, behavioral, velocity, and access-context detections from protected traffic." action={<Status tone={connected ? "light" : "muted"}>{connected ? "Live" : "Offline"}</Status>} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <div className="panel overflow-hidden">
          <div className="table-scroll">
            <table className="data-table min-w-[760px]">
              <thead><tr><th>Observed</th><th>Risk</th><th>Classification</th><th>Evidence</th><th>Recommendation</th></tr></thead>
              <tbody>{detections.map((item) => <tr key={item.assessment_id}><td className="font-mono text-[11px]">{new Date(item.created_at).toLocaleTimeString()}</td><td className="font-mono text-primary">{item.risk_score}</td><td><Status tone={item.level === "critical" ? "light" : "neutral"}>{item.level}</Status></td><td>{item.signals.length} correlated signals</td><td className="max-w-sm text-xs">{item.recommendation}</td></tr>)}</tbody>
            </table>
          </div>
          {detections.length === 0 && <div className="p-12 text-center"><FileSearch className="mx-auto text-muted" /><p className="mt-3 text-sm text-secondary">No detections recorded yet.</p><p className="mt-1 text-xs text-muted">Run the compromised-session scenario to generate explainable evidence.</p></div>}
        </div>
        <aside className="panel h-fit p-6">
          <Activity size={18} className="text-white" />
          <h2 className="mt-4 text-lg text-white">Hybrid detection</h2>
          <p className="mt-2 text-xs leading-5 text-muted">Deterministic rules, request velocity, behavioral context, and cross-signal correlation. Enforcement never depends on a generative model.</p>
          {policy ? <dl className="mt-6 space-y-3 border-t border-white/[0.07] pt-5 text-xs"><div className="flex justify-between"><dt className="text-muted">Critical</dt><dd>{policy.critical_threshold}–100</dd></div><div className="flex justify-between"><dt className="text-muted">High</dt><dd>{policy.high_threshold}–{policy.critical_threshold - 1}</dd></div><div className="flex justify-between"><dt className="text-muted">Moderate</dt><dd>{policy.moderate_threshold}–{policy.high_threshold - 1}</dd></div></dl> : <p className="mt-6 border-t border-white/[0.07] pt-5 text-xs text-muted">Policy thresholds unavailable</p>}
        </aside>
      </div>
    </div>
  );
}
