import { useState } from "react";
import { Check, Play, RotateCcw, ShieldBan } from "lucide-react";
import { Eyebrow, PageHeader } from "../components/UI";
import { facilityApi } from "../facility/api";
import type { FacilityApi, SimulationStep } from "../facility/types";

const previewSteps: SimulationStep[] = [
  { sequence: 1, event: "Behavioral baseline", outcome: "Four legitimate telemetry reads" },
  { sequence: 2, event: "Compromised operator", outcome: "Administrative pump command from a new context" },
  { sequence: 3, event: "Explainable risk assessment", outcome: "Deterministic risk signals" },
  { sequence: 4, event: "Selective containment", outcome: "Suspicious session restricted" },
  { sequence: 5, event: "Continuity verification", outcome: "Independent legitimate operation" },
];

export function Lab({ api = facilityApi }: { api?: Pick<FacilityApi, "runScenario"> }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<SimulationStep[]>(previewSteps);
  const [continuityVerified, setContinuityVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setProgress(0);
    setRunning(true);
    setError(null);
    try {
      const result = await api.runScenario();
      setSteps(result.steps);
      setProgress(result.steps.length);
      setContinuityVerified(result.continuity_verified);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  };
  const reset = () => {
    setRunning(false);
    setProgress(0);
    setSteps(previewSteps);
    setContinuityVerified(false);
    setError(null);
  };

  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Controlled environment" title="Simulation Lab" description="Run a reproducible attack scenario and observe detection, containment, and continuity in sequence." />
      <div className="grid gap-5 lg:grid-cols-[.72fr_1.4fr]">
        <aside className="panel h-fit p-6 lg:p-7">
          <Eyebrow>Scenario 01</Eyebrow>
          <h2 className="mt-4 text-xl font-medium tracking-[-0.03em] text-white">Compromised employee session</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">A valid session attempts restricted administrative operations against the Dardania Water API.</p>
          <dl className="mt-7 space-y-4 border-t border-white/[0.07] pt-6 text-xs"><div className="flex justify-between"><dt className="text-muted">Target</dt><dd className="text-primary">Water API</dd></div><div className="flex justify-between"><dt className="text-muted">Expected risk</dt><dd className="font-mono text-primary">90–96</dd></div><div className="flex justify-between"><dt className="text-muted">Policy</dt><dd className="text-primary">Selective contain</dd></div></dl>
          <div className="mt-7 flex gap-3"><button onClick={() => void run()} disabled={running} className="button-primary flex-1"><Play size={14} fill="currentColor" />{running ? "Running…" : progress === steps.length ? "Run again" : "Run scenario"}</button><button onClick={reset} className="icon-button" aria-label="Reset simulation"><RotateCcw size={15} /></button></div>
          {error && <p className="mt-4 text-xs text-red-300" role="alert">{error}</p>}
        </aside>

        <section className="panel min-h-[520px] p-6 lg:p-8">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-6"><Eyebrow>Execution trace</Eyebrow><div className={`simulation-state ${running ? "simulation-running" : ""}`}><i />{running ? "IN PROGRESS" : progress === steps.length ? "COMPLETE" : "READY"}</div></div>
          <div className="relative mt-8 space-y-1 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-white/[0.08]">
            {steps.map((step, index) => {
              const complete = index < progress;
              const active = index === progress && running;
              return <div key={step.sequence} className={`lab-step ${complete ? "lab-step-complete" : ""} ${active ? "lab-step-active" : ""}`}><span className="lab-node">{complete ? <Check size={12} strokeWidth={3} /> : index + 1}</span><div><div className="text-sm text-primary">{step.event}</div><div className="mt-1 font-mono text-[10px] text-muted">{complete ? step.outcome : "—"}</div></div>{step.event === "Selective containment" && complete && <ShieldBan className="ml-auto text-white" size={17} />}</div>;
            })}
          </div>
          {continuityVerified && <div className="mt-7 rounded-lg border border-white/[0.12] bg-white/[0.04] p-5"><div className="flex items-center gap-3 text-sm text-white"><Check className="rounded-full bg-white p-1 text-black" size={21} strokeWidth={3} />Attack contained. Service remained available.</div><p className="ml-8 mt-2 text-xs text-muted">Only the compromised session was restricted; a legitimate facility command succeeded immediately afterward.</p></div>}
        </section>
      </div>
    </div>
  );
}
