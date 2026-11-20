import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { type AuditEntry, usePolling } from "../api";
import { PageHeader, Status } from "../components/UI";

export function Logs() {
  const [query, setQuery] = useState("");
  const audit = usePolling<AuditEntry[]>("/api/v1/audit?limit=500", []);
  const filtered = useMemo(() => audit.data.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))), [audit.data, query]);
  const exportEvidence = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "sentinel-audit.json"; link.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Immutable evidence record" title="Activity & Audit" description="Search security events, decisions, policy changes, defensive actions, and continuity outcomes." action={<button className="button-secondary" onClick={exportEvidence}><Download size={15} /> Export evidence</button>} />
      <div className="panel overflow-hidden"><div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, actors, entities…" /></label><div className="flex items-center gap-4"><Status tone={audit.connected ? "light" : "muted"}>{audit.connected ? "Live" : "Offline"}</Status><div className="font-mono text-[10px] text-muted">{filtered.length} RECORDS</div></div></div>
        <div className="table-scroll"><table className="data-table min-w-[940px]"><thead><tr><th>Time</th><th>Category</th><th>Action</th><th>Actor</th><th>Entity</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.audit_id}><td className="font-mono text-[11px]">{new Date(row.timestamp).toLocaleString()}</td><td>{row.category}</td><td className="text-primary">{row.action.replaceAll("_", " ")}</td><td>{row.actor}</td><td className="font-mono text-[10px]">{row.entity_type}:{row.entity_id}</td><td><Status tone={row.outcome === "enforced" || row.outcome === "healthy" ? "light" : "neutral"}>{row.outcome}</Status></td><td className="max-w-sm text-xs">{row.detail}</td></tr>)}</tbody></table></div>
        {filtered.length === 0 && <div className="p-12 text-center text-sm text-muted">No audit records match that search.</div>}
      </div>
    </div>
  );
}
