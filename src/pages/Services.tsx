import { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { sentinelApi, type HealthCheck, type ProtectedService, usePolling } from "../api";
import { PageHeader, Status } from "../components/UI";
import { protectionLanguage } from "../components/protectionLanguage";

export function Services() {
  const services = usePolling<ProtectedService[]>("/api/v1/services", []);
  const checks = usePolling<HealthCheck[]>("/api/v1/health-checks", []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const runCheck = async () => {
    setError(null);
    setBusy(true);
    try { await sentinelApi.runHealthCheck(); await checks.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Continuity check failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Operational resilience" title="Infrastructure" description="Protected services, essential transactions, live health, and post-enforcement continuity evidence." action={<button className="button-primary" disabled={busy} onClick={() => void runCheck()}><RefreshCw size={15} />{busy ? "Verifying…" : "Verify continuity"}</button>} />
      {error && <div className="mb-5 rounded-lg border border-white/[0.1] px-4 py-3 text-xs text-secondary" role="alert">{protectionLanguage(error)}</div>}
      <div className="panel overflow-hidden"><div className="table-scroll"><table className="data-table min-w-[760px]"><thead><tr><th>Service</th><th>Status</th><th>Latency</th><th>Health endpoint</th><th>Essential transactions</th></tr></thead><tbody>{services.data.map((service) => <tr key={service.service_id}><td><div className="font-medium text-primary">{service.name}</div><div className="mt-1 text-xs text-muted">{service.service_type}</div></td><td><Status tone={service.status === "healthy" ? "light" : "neutral"}>{service.status}</Status></td><td className="font-mono text-xs">{service.latency_ms} ms</td><td className="font-mono text-xs">{service.health_path}</td><td>{service.essential_paths.length}</td></tr>)}</tbody></table></div>{services.data.length === 0 && <div className="p-10 text-center text-sm text-muted">Infrastructure API unavailable.</div>}</div>
      <div className="mt-5 grid gap-5 md:grid-cols-3"><div className="panel p-6"><div className="eyebrow">Services healthy</div><div className="mt-4 text-2xl text-white">{services.data.filter((item) => item.status === "healthy").length} / {services.data.length}</div></div><div className="panel p-6"><div className="eyebrow">Latest verification</div><div className="mt-4 flex items-center gap-2 text-white"><CheckCircle2 size={19} />{checks.data[0]?.transaction_succeeded ? "Passed" : checks.data[0] ? "Failed" : "Pending"}</div><p className="mt-2 text-xs text-muted">{protectionLanguage(checks.data[0]?.detail ?? "Run a legitimate transaction check.")}</p></div><div className="panel p-6"><div className="eyebrow">Response time</div><div className="mt-4 text-2xl text-white">{checks.data[0]?.response_time_ms ?? "—"} ms</div><p className="mt-2 text-xs text-muted">Most recent continuity probe</p></div></div>
      <div className="panel mt-5 overflow-hidden"><div className="border-b border-white/[0.07] p-5"><div className="eyebrow">Continuity history</div></div><div className="table-scroll"><table className="data-table min-w-[720px]"><thead><tr><th>Time</th><th>Service</th><th>Result</th><th>Rule</th><th>Detail</th></tr></thead><tbody>{checks.data.map((check) => <tr key={check.check_id}><td className="font-mono text-[11px]">{new Date(check.checked_at).toLocaleString()}</td><td>{check.service_id}</td><td><Status tone={check.transaction_succeeded ? "light" : "neutral"}>{protectionLanguage(check.status)}</Status></td><td className="font-mono text-[10px]">{check.rule_id ?? "manual"}</td><td className="text-xs">{protectionLanguage(check.detail)}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}
