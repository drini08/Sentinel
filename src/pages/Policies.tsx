import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { sentinelApi, type Policy, usePolling } from "../api";
import { Eyebrow, PageHeader, Status } from "../components/UI";

export function Policies() {
  const policies = usePolling<Policy[]>("/api/v1/policies", []);
  const policy = policies.data[0];
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = async (changes: Partial<Policy>) => {
    if (!policy) return;
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      await sentinelApi.updatePolicy(policy.policy_id, changes);
      await policies.refresh();
      setMessage("Policy saved to the backend and audit log.");
    } catch (reason) {
      setFailed(true);
      setMessage(reason instanceof Error ? reason.message : "Policy update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-enter">
      <PageHeader
        eyebrow="Decision framework"
        title="Protection Policies"
        description="Control detection thresholds and authorize scoped, reversible response behavior."
        action={<Status tone={policies.connected ? "light" : "muted"}>{policies.connected ? "Connected" : "Offline"}</Status>}
      />
      {message && <div className="mb-5 rounded-lg border border-white/[0.1] px-4 py-3 text-xs text-secondary" role={failed ? "alert" : "status"}>{message}</div>}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_.62fr]">
        <div className="panel divide-y divide-white/[0.07]">
          {policy ? <>
            {[
              ["Moderate threshold", "moderate_threshold", policy.moderate_threshold],
              ["High threshold", "high_threshold", policy.high_threshold],
              ["Critical threshold", "critical_threshold", policy.critical_threshold],
            ].map(([label, key, value]) => (
              <div key={String(key)} className="grid gap-4 p-6 sm:grid-cols-[180px_1fr_auto] sm:items-center lg:p-7">
                <div><div className="text-sm font-medium text-primary">{label}</div><p className="mt-1 text-xs text-muted">Risk score required for this response tier.</p></div>
                <input
                  aria-label={String(label)}
                  type="range"
                  min="0"
                  max="100"
                  value={Number(value)}
                  disabled={busy}
                  onChange={(event) => void update({ [String(key)]: Number(event.target.value) } as Partial<Policy>)}
                />
                <span className="w-8 font-mono text-sm text-primary">{Number(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-6 p-6 lg:p-7">
              <div><div className="text-sm font-medium text-primary">Automatic scoped protection</div><p className="mt-1.5 text-xs leading-5 text-muted">Permit corroborated session and source restrictions for critical activity.</p></div>
              <button disabled={busy} aria-label="Automatic scoped protection" className={`toggle ${policy.automatic_containment ? "toggle-on" : ""}`} role="switch" aria-checked={policy.automatic_containment} onClick={() => void update({ automatic_containment: !policy.automatic_containment })}><span /></button>
            </div>
            <div className="flex items-center justify-between gap-6 p-6 lg:p-7">
              <div><div className="text-sm font-medium text-primary">Require corroborating evidence</div><p className="mt-1.5 text-xs leading-5 text-muted">A score alone cannot authorize a high-impact defensive action.</p></div>
              <button disabled={busy} aria-label="Require corroborating evidence" className={`toggle ${policy.require_corroboration ? "toggle-on" : ""}`} role="switch" aria-checked={policy.require_corroboration} onClick={() => void update({ require_corroboration: !policy.require_corroboration })}><span /></button>
            </div>
          </> : <div className="p-12 text-center text-sm text-muted">Policy configuration is unavailable.</div>}
        </div>
        <aside className="panel h-fit p-6 lg:p-7">
          <ShieldCheck size={19} className="text-secondary" />
          <div className="mt-5"><Eyebrow>Safety boundaries</Eyebrow></div>
          <ul className="mt-5 space-y-4 text-xs leading-5 text-secondary">
            <li>Infrastructure-wide targets are rejected.</li>
            <li>Essential control-plane endpoints cannot be blocked.</li>
            <li>Operator role is required for manual changes.</li>
            <li>Failed continuity checks automatically roll rules back.</li>
            <li>Every change is retained in the audit record.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
