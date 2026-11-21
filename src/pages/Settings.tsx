import { useState } from "react";
import { sentinelApi, type Policy, usePolling } from "../api";
import { PageHeader, Status } from "../components/UI";

export function Settings() {
  const policies = usePolling<Policy[]>("/api/v1/policies", []);
  const policy = policies.data[0];
  const [message, setMessage] = useState<string | null>(null);
  const update = async (changes: Partial<Policy>) => {
    if (!policy) return;
    try { await sentinelApi.updatePolicy(policy.policy_id, changes); setMessage("Policy saved to the backend and audit log."); await policies.refresh(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Update failed"); }
  };
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Console and policy configuration" title="Settings" description="Configure deterministic detection thresholds and authorized response behavior." action={<Status tone={policies.connected ? "light" : "muted"}>{policies.connected ? "Connected" : "Offline"}</Status>} />
      {message && <div className="mb-5 rounded-lg border border-white/[0.1] p-4 text-xs text-secondary">{message}</div>}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.7fr]">
        <div className="panel divide-y divide-white/[0.07]">{policy ? <>
          {[{ label: "Moderate threshold", key: "moderate_threshold", value: policy.moderate_threshold }, { label: "High threshold", key: "high_threshold", value: policy.high_threshold }, { label: "Critical threshold", key: "critical_threshold", value: policy.critical_threshold }].map((item) => <div key={item.key} className="grid gap-4 p-6 sm:grid-cols-[180px_1fr_auto] sm:items-center"><div className="eyebrow">{item.label}</div><input type="range" min="0" max="100" value={item.value} onChange={(event) => void update({ [item.key]: Number(event.target.value) } as Partial<Policy>)} /><span className="w-8 font-mono text-sm text-white">{item.value}</span></div>)}
          <div className="flex items-center justify-between p-6"><div><div className="text-sm text-white">Automatic scoped protection</div><p className="mt-1 text-xs text-muted">Permits only corroborated, policy-authorized session and source restrictions.</p></div><button className={`toggle ${policy.automatic_containment ? "toggle-on" : ""}`} role="switch" aria-checked={policy.automatic_containment} onClick={() => void update({ automatic_containment: !policy.automatic_containment })}><span /></button></div>
          <div className="flex items-center justify-between p-6"><div><div className="text-sm text-white">Require corroborating evidence</div><p className="mt-1 text-xs text-muted">Scores alone cannot authorize high-impact defensive actions.</p></div><button className={`toggle ${policy.require_corroboration ? "toggle-on" : ""}`} role="switch" aria-checked={policy.require_corroboration} onClick={() => void update({ require_corroboration: !policy.require_corroboration })}><span /></button></div>
        </> : <div className="p-10 text-sm text-muted">Policy configuration unavailable.</div>}</div>
        <aside className="panel h-fit p-6"><div className="eyebrow">Safety boundaries</div><ul className="mt-5 space-y-4 text-xs leading-5 text-secondary"><li>Infrastructure-wide targets are rejected.</li><li>Essential SENTINEL control-plane endpoints cannot be blocked.</li><li>Operator or admin role is required for manual changes.</li><li>Failed continuity checks automatically roll back firewall rules.</li><li>Audit records are append-only inside the application.</li></ul><div className="mt-6 border-t border-white/[0.07] pt-5 font-mono text-[10px] text-muted">SIMULATED INFRASTRUCTURE ONLY</div></aside>
      </div>
    </div>
  );
}
