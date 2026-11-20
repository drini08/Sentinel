import { useEffect, useState } from "react";
import { Check, Clock3, FileText, ShieldBan } from "lucide-react";
import { sentinelApi, type ApiIncident, usePolling } from "../api";
import { Eyebrow, PageHeader, Status } from "../components/UI";

export function Incidents() {
  const feed = usePolling<ApiIncident[]>("/api/v1/incidents", []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!selectedId && feed.data[0]) setSelectedId(feed.data[0].incident_id); }, [feed.data, selectedId]);
  const selected = feed.data.find((item) => item.incident_id === selectedId) ?? feed.data[0];
  const update = async (status: ApiIncident["status"]) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try { await sentinelApi.updateIncident(selected.incident_id, status); await feed.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Incident update failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Investigations" title="Incidents" description="Review evidence, understand SENTINEL decisions, control status, and verify containment outcomes." action={<Status tone={feed.connected ? "light" : "muted"}>{feed.connected ? "Live" : "Offline"}</Status>} />
      {error && <div className="mb-5 rounded-lg border border-white/[0.1] px-4 py-3 text-xs text-secondary" role="alert">{error}</div>}
      {feed.data.length === 0 ? <div className="panel p-16 text-center"><ShieldBan className="mx-auto text-muted" /><h2 className="mt-4 text-lg text-white">No incidents recorded</h2><p className="mt-2 text-sm text-muted">Run a simulation to exercise detection, decision, containment, and verification.</p></div> :
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.5fr]">
        <div className="panel overflow-hidden"><div className="border-b border-white/[0.07] px-6 py-5"><Eyebrow>Incident queue · {feed.data.length}</Eyebrow></div>{feed.data.map((incident) => <button key={incident.incident_id} onClick={() => setSelectedId(incident.incident_id)} className={`incident-row w-full text-left ${selected?.incident_id === incident.incident_id ? "incident-row-active" : ""}`}><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-primary">{incident.title}</div><div className="mt-1 text-xs text-muted">{incident.service_id}</div></div><span className="font-mono text-[10px] text-muted">{incident.risk.risk_score}</span></div><div className="mt-4 flex items-center justify-between"><Status tone={incident.status === "contained" ? "light" : "neutral"}>{incident.status}</Status><time className="text-[11px] text-muted">{new Date(incident.created_at).toLocaleString()}</time></div></button>)}</div>
        {selected && <article className="panel min-w-0 p-6 sm:p-8"><div className="flex justify-between gap-5 border-b border-white/[0.07] pb-7"><div><div className="font-mono text-[11px] text-muted">{selected.incident_id}</div><h2 className="mt-3 text-2xl font-medium text-white">{selected.title}</h2><p className="mt-2 text-sm text-secondary">{selected.summary}</p></div><div className="risk-score"><span>RISK</span><strong>{selected.risk.risk_score}</strong></div></div>
          <div className="grid gap-7 py-7 sm:grid-cols-3"><div><Eyebrow>Service</Eyebrow><p className="mt-3 text-sm text-primary">{selected.service_id}</p></div><div><Eyebrow>Session</Eyebrow><p className="mt-3 font-mono text-xs text-primary">{selected.session_id}</p></div><div><Eyebrow>Outcome</Eyebrow><div className="mt-3"><Status tone="light">{selected.status}</Status></div></div></div>
          <div className="border-t border-white/[0.07] pt-7"><Eyebrow>Decision evidence</Eyebrow><div className="mt-5 space-y-3">{selected.risk.signals.map((signal) => <div key={signal.code} className="evidence-row"><FileText size={17} className="text-secondary" /><div><div className="text-sm text-primary">{signal.label}</div><p className="mt-1 text-xs leading-5 text-muted">{signal.evidence}</p></div><div className="font-mono text-xs text-secondary">+{signal.score}</div></div>)}</div></div>
          <div className="mt-7 border-t border-white/[0.07] pt-7"><Eyebrow>Containment sequence</Eyebrow><div className="mt-5 grid gap-3 md:grid-cols-3">{[[ShieldBan,"Request blocked"],[Clock3,"Session restricted"],[Check,"Continuity verified"]].map(([Icon,label]) => { const C = Icon as typeof Check; return <div className="sequence-step" key={String(label)}><C size={17}/><span>{String(label)}</span></div>; })}</div></div>
          <div className="mt-7 flex flex-wrap gap-3"><button disabled={busy} className="button-secondary" onClick={() => void update("investigating")}>Mark investigating</button><button disabled={busy} className="button-primary" onClick={() => void update("resolved")}>Resolve incident</button></div>
        </article>}
      </div>}
    </div>
  );
}
