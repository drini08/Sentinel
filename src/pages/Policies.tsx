import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { policies as initialPolicies } from "../data";
import { Eyebrow, PageHeader } from "../components/UI";

export function Policies() {
  const [policies, setPolicies] = useState(initialPolicies);
  const toggle = (index: number) => setPolicies((current) => current.map((policy, i) => i === index ? { ...policy, enabled: !policy.enabled } : policy));
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Decision framework" title="Protection Policies" description="Define when suspicious activity is observed, restricted, or escalated for operator approval." action={<button className="button-primary"><Plus size={15} /> New policy</button>} />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_.62fr]">
        <div className="panel divide-y divide-white/[0.07]">
          {policies.map((policy, index) => (
            <div key={policy.name} className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-7">
              <div className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/[0.09] bg-white/[0.025] text-secondary"><SlidersHorizontal size={16} /></span>
                <div><h2 className="text-sm font-medium text-primary">{policy.name}</h2><p className="mt-1.5 max-w-xl text-xs leading-5 text-muted">{policy.description}</p><div className="mt-3 font-mono text-[10px] tracking-[0.08em] text-secondary">{policy.scope}</div></div>
              </div>
              <button onClick={() => toggle(index)} className={`toggle ${policy.enabled ? "toggle-on" : ""}`} role="switch" aria-checked={policy.enabled} aria-label={`Toggle ${policy.name}`}><span /></button>
            </div>
          ))}
        </div>
        <aside className="panel h-fit p-6 lg:p-7">
          <Eyebrow>Policy posture</Eyebrow>
          <div className="mt-6 text-4xl font-medium tracking-[-0.04em] text-white">03</div>
          <p className="mt-2 text-xs text-muted">Active enforcement rules</p>
          <div className="my-6 h-px bg-white/[0.07]" />
          <dl className="space-y-4 text-xs"><div className="flex justify-between"><dt className="text-muted">Auto-contain</dt><dd className="text-primary">Critical only</dd></div><div className="flex justify-between"><dt className="text-muted">Operator approval</dt><dd className="text-primary">Required</dd></div><div className="flex justify-between"><dt className="text-muted">Last revision</dt><dd className="font-mono text-primary">10:21</dd></div></dl>
        </aside>
      </div>
    </div>
  );
}
