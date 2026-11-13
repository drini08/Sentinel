import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { activity } from "../data";
import { PageHeader, Status } from "../components/UI";

export function Logs() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => activity.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(query.toLowerCase()))), [query]);
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Evidence record" title="Activity Logs" description="Search the operational and security events recorded across protected services." action={<button className="button-secondary"><Download size={15} /> Export evidence</button>} />
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, actors, services…" /></label>
          <div className="font-mono text-[10px] tracking-[0.1em] text-muted">{filtered.length} EVENTS</div>
        </div>
        <div className="table-scroll">
          <table className="data-table min-w-[820px]">
            <thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Service</th><th>Result</th></tr></thead>
            <tbody>{filtered.map((row) => <tr key={`${row.time}-${row.event}`}><td className="font-mono text-[11px]">{row.time}</td><td className="text-primary">{row.event}</td><td>{row.actor}</td><td>{row.service}</td><td><Status tone={row.result === "Enforced" ? "light" : "neutral"}>{row.result}</Status></td></tr>)}</tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-12 text-center text-sm text-muted">No activity matches that search.</div>}
      </div>
    </div>
  );
}
