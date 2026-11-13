import { PageHeader } from "../components/UI";

export function Settings() {
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Console configuration" title="Settings" description="Operator preferences and development environment configuration." />
      <div className="panel max-w-3xl divide-y divide-white/[0.07]">
        {[
          ["Environment", "Simulation", "This console is connected to synthetic infrastructure only."],
          ["Decision mode", "Policy controlled", "High-risk containment follows explicit configured policies."],
          ["Evidence retention", "30 days", "Incident and activity evidence retained for operator review."],
          ["Real-time updates", "Enabled", "Receive gateway and detection events as they occur."],
        ].map(([label, value, detail]) => <div key={label} className="grid gap-3 p-6 sm:grid-cols-[170px_1fr]"><div className="eyebrow pt-1">{label}</div><div><div className="text-sm text-primary">{value}</div><p className="mt-1.5 text-xs leading-5 text-muted">{detail}</p></div></div>)}
      </div>
    </div>
  );
}
