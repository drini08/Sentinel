import { useEffect, useRef, useState } from "react";
import { Check, Play, RotateCcw, ShieldBan } from "lucide-react";
import { Eyebrow, PageHeader } from "../components/UI";

const steps = [
  "Legitimate traffic baseline established",
  "Compromised employee session introduced",
  "Administrative anomaly detected · risk 94",
  "Malicious request blocked at gateway",
  "Suspicious session selectively contained",
  "Legitimate service continuity verified",
];

export function Lab() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    setProgress(0); setRunning(true);
    timer.current = window.setInterval(() => setProgress((value) => {
      if (value >= steps.length) { if (timer.current) window.clearInterval(timer.current); setRunning(false); return value; }
      return value + 1;
    }), 650);
  };
  const reset = () => { if (timer.current) window.clearInterval(timer.current); setRunning(false); setProgress(0); };

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Controlled environment" title="Simulation Lab" description="Run a reproducible attack scenario and observe detection, containment, and continuity in sequence." />
      <div className="grid gap-5 lg:grid-cols-[.72fr_1.4fr]">
        <aside className="panel h-fit p-6 lg:p-7">
          <Eyebrow>Scenario 01</Eyebrow>
          <h2 className="mt-4 text-xl font-medium tracking-[-0.03em] text-white">Compromised employee session</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">A valid session attempts restricted administrative operations against the Dardania Water API.</p>
          <dl className="mt-7 space-y-4 border-t border-white/[0.07] pt-6 text-xs"><div className="flex justify-between"><dt className="text-muted">Target</dt><dd className="text-primary">Water API</dd></div><div className="flex justify-between"><dt className="text-muted">Expected risk</dt><dd className="font-mono text-primary">90–96</dd></div><div className="flex justify-between"><dt className="text-muted">Policy</dt><dd className="text-primary">Selective contain</dd></div></dl>
          <div className="mt-7 flex gap-3"><button onClick={run} disabled={running} className="button-primary flex-1"><Play size={14} fill="currentColor" />{running ? "Running…" : progress === steps.length ? "Run again" : "Run scenario"}</button><button onClick={reset} className="icon-button" aria-label="Reset simulation"><RotateCcw size={15} /></button></div>
        </aside>

        <section className="panel min-h-[520px] p-6 lg:p-8">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-6"><Eyebrow>Execution trace</Eyebrow><div className={`simulation-state ${running ? "simulation-running" : ""}`}><i />{running ? "IN PROGRESS" : progress === steps.length ? "COMPLETE" : "READY"}</div></div>
          <div className="relative mt-8 space-y-1 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-white/[0.08]">
            {steps.map((step, index) => {
              const complete = index < progress;
              const active = index === progress && running;
              return <div key={step} className={`lab-step ${complete ? "lab-step-complete" : ""} ${active ? "lab-step-active" : ""}`}><span className="lab-node">{complete ? <Check size={12} strokeWidth={3} /> : index + 1}</span><div><div className="text-sm text-primary">{step}</div><div className="mt-1 font-mono text-[10px] text-muted">{complete ? `T+0${index * 2}.${index + 1}s` : "—"}</div></div>{index === 4 && complete && <ShieldBan className="ml-auto text-white" size={17} />}</div>;
            })}
          </div>
          {progress === steps.length && <div className="mt-7 rounded-lg border border-white/[0.12] bg-white/[0.04] p-5"><div className="flex items-center gap-3 text-sm text-white"><Check className="rounded-full bg-white p-1 text-black" size={21} strokeWidth={3} />Attack contained. Service remained available.</div><p className="ml-8 mt-2 text-xs text-muted">Only the compromised session was revoked; 184 legitimate requests completed during the scenario.</p></div>}
        </section>
      </div>
    </div>
  );
}
