import { useState } from "react";
import { Ban, Plus, RefreshCw, ShieldOff, Undo2 } from "lucide-react";
import { sentinelApi, type FirewallRule, type Session, usePolling } from "../api";
import { PageHeader, Status } from "../components/UI";
import { protectionLanguage } from "../components/protectionLanguage";

export function Defense() {
  const rules = usePolling<FirewallRule[]>("/api/v1/firewall/rules", []);
  const sessions = usePolling<Session[]>("/api/v1/sessions", []);
  const [target, setTarget] = useState("203.0.113.44");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const act = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true); setMessage(null); setFailed(false);
    try { await operation(); setMessage(success); await Promise.all([rules.refresh(), sessions.refresh()]); }
    catch (reason) { setFailed(true); setMessage(reason instanceof Error ? reason.message : "Action failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Controlled defense" title="Defense Control" description="Manage scoped gateway restrictions and compromised sessions with complete, reversible audit history." action={<Status tone={rules.connected ? "light" : "muted"}>{rules.connected ? "Enforcing" : "Offline"}</Status>} />
      {message && <div className="mb-5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-xs text-secondary" role={failed ? "alert" : "status"}>{protectionLanguage(message)}</div>}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.7fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] p-5"><div className="eyebrow">Adaptive firewall rules</div><span className="font-mono text-[10px] text-muted">{rules.data.filter((rule) => rule.status === "active").length} ACTIVE</span></div>
          <div className="table-scroll"><table className="data-table min-w-[780px]"><thead><tr><th>Target</th><th>Action</th><th>Status</th><th>Expires</th><th>Reason</th><th /></tr></thead><tbody>{rules.data.map((rule) => <tr key={rule.rule_id}><td><div className="font-mono text-xs text-primary">{rule.target_value}</div><div className="mt-1 text-[10px] text-muted">{rule.target_type}</div></td><td>{rule.action}</td><td><Status tone={rule.status === "active" ? "light" : "muted"}>{rule.status}</Status></td><td className="font-mono text-[10px]">{new Date(rule.expires_at).toLocaleTimeString()}</td><td className="max-w-xs text-xs">{protectionLanguage(rule.justification)}</td><td>{rule.status === "active" && <button disabled={busy} className="icon-button" aria-label="Remove rule" onClick={() => void act(() => sentinelApi.removeRule(rule.rule_id), "Rule removed.")}><Undo2 size={14} /></button>}</td></tr>)}</tbody></table></div>
          {rules.data.length === 0 && <div className="p-10 text-center text-sm text-muted">No firewall rules have been created.</div>}
        </section>
        <aside className="space-y-5">
          <div className="panel p-6"><div className="eyebrow">New scoped rule</div><label className="mt-5 block text-xs text-muted">Source IP<input className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-3 font-mono text-xs text-white outline-none" value={target} onChange={(event) => setTarget(event.target.value)} /></label><button disabled={busy || !target} className="button-primary mt-4 w-full" onClick={() => void act(() => sentinelApi.createRule({ target_type: "ip", target_value: target, action: "block", justification: "Operator-confirmed malicious simulation source.", duration_seconds: 900 }), "Scoped rule enforced and continuity verified.")}><Plus size={14} /> Enforce for 15 min</button><button disabled={busy} className="button-secondary mt-3 w-full" onClick={() => void act(sentinelApi.runRollbackDemo, "Unsafe rule detected and automatically rolled back.")}><RefreshCw size={14} /> Run rollback test</button></div>
          <div className="panel p-6"><div className="eyebrow">Restricted sessions</div><div className="mt-4 space-y-3">{sessions.data.filter((item) => item.status !== "active").map((session) => <div key={session.session_id} className="rounded-lg border border-white/[0.07] p-4"><div className="flex items-center gap-2 text-xs text-white"><ShieldOff size={14} />{session.user_id}</div><div className="mt-1 truncate font-mono text-[10px] text-muted">{session.session_id}</div><button disabled={busy} className="button-secondary mt-3 w-full" onClick={() => void act(() => sentinelApi.controlSession(session.session_id, "restore", "Operator verified remediation and credential reset."), "Session access restored.")}>Restore access</button></div>)}{sessions.data.filter((item) => item.status !== "active").length === 0 && <div className="flex items-center gap-2 text-xs text-muted"><Ban size={14} />No restricted sessions</div>}</div></div>
        </aside>
      </div>
    </div>
  );
}
