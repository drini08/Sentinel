import { useState } from "react";
import { Activity, ArrowLeft, Check, RadioTower, ShieldCheck, TerminalSquare, UserRoundCog, Waves } from "lucide-react";
import { Mark } from "../components/Brand";
import { Link } from "react-router-dom";
import { juryApi } from "../jury/api";
import type { JuryApi, JuryRun, JuryScenario } from "../jury/types";

const attacks: Array<{
  scenario: JuryScenario;
  number: string;
  title: string;
  target: string;
  description: string;
  icon: typeof RadioTower;
}> = [
  {
    scenario: "sensor-spoofing",
    number: "01",
    title: "Sensor spoofing",
    target: "Reservoir telemetry",
    description: "Inject forged level readings to conceal unsafe water conditions.",
    icon: RadioTower,
  },
  {
    scenario: "command-injection",
    number: "02",
    title: "Command injection",
    target: "Chemical dosing",
    description: "Attempt an unauthorized process override against treatment controls.",
    icon: TerminalSquare,
  },
  {
    scenario: "compromised-operator",
    number: "03",
    title: "Compromised operator",
    target: "High-lift pumps",
    description: "Use a stolen session from a hostile network to stop distribution.",
    icon: UserRoundCog,
  },
];

function labelAsset(assetId: string) {
  return assetId.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

export function AttackConsole({ api = juryApi }: { api?: JuryApi }) {
  const [pending, setPending] = useState<JuryScenario | null>(null);
  const [run, setRun] = useState<JuryRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launch = async (scenario: JuryScenario) => {
    const requestId = `jury-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    setPending(scenario);
    setRun(null);
    setError(null);
    try {
      let result = await api.trigger(scenario, requestId);
      for (let attempt = 0; result.status === "running" && api.getRun && attempt < 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        result = await api.getRun(requestId);
      }
      setRun(result);
    } catch (reason) {
      if (api.getRun) {
        try {
          setRun(await api.getRun(requestId));
          return;
        } catch {
          // The initial error is more useful when the recovery lookup also fails.
        }
      }
      setError(reason instanceof Error ? reason.message : "The simulation service is unavailable");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="attack-console">
      <div className="attack-console-noise" aria-hidden="true" />
      <header className="attack-topbar">
        <Link to="/" className="attack-brand" aria-label="Return to operator console">
          <span><Mark className="h-[18px] w-[18px]" /></span>
          <strong>Sentinel</strong>
        </Link>
        <div className="attack-live"><i /> Live facility link</div>
      </header>

      <section className="attack-intro">
        <div>
          <p className="attack-kicker">Jury attack terminal</p>
          <h1>Choose where<br />to strike.</h1>
        </div>
        <p>Launch a controlled attack against the live water facility. Watch the defense detect, contain, and preserve operations in real time.</p>
      </section>

      <section className="attack-grid" aria-label="Available attack simulations">
        {attacks.map((attack) => {
          const Icon = attack.icon;
          const isPending = pending === attack.scenario;
          return (
            <button
              type="button"
              className="attack-card"
              key={attack.scenario}
              disabled={pending !== null}
              onClick={() => void launch(attack.scenario)}
              aria-label={`Launch ${attack.title}`}
            >
              <span className="attack-number">{attack.number}</span>
              <span className="attack-icon"><Icon size={22} /></span>
              <span className="attack-target">{attack.target}</span>
              <strong>{isPending ? "Launching attack…" : attack.title}</strong>
              <span className="attack-description">{attack.description}</span>
              <span className="attack-launch">{isPending ? <Activity size={15} /> : <Waves size={15} />} {isPending ? "Transmitting" : "Launch simulation"}</span>
            </button>
          );
        })}
      </section>

      {error && <div className="attack-error" role="alert"><strong>Attack not launched</strong><span>{error}</span></div>}

      {run && (
        <section className={`attack-result ${run.status === "contained" ? "is-contained" : "is-failed"}`} aria-live="polite">
          <div className="attack-result-head">
            <div className="attack-result-icon"><ShieldCheck size={25} /></div>
            <div><span>Sentinel response</span><h2>{run.status === "contained" ? "Attack contained" : "Defense failed"}</h2></div>
            <strong>Risk {run.risk_score}</strong>
          </div>
          <div className="attack-result-body">
            <div className="attack-timeline">
              {run.steps.map((step) => (
                <div key={step.sequence} className="attack-step">
                  <span>{String(step.sequence).padStart(2, "0")}</span>
                  <div><strong>{step.event}</strong><p>{step.outcome}</p></div>
                </div>
              ))}
            </div>
            <div className="attack-proof">
              <p>Protected assets</p>
              <strong>{run.affected_asset_ids.map(labelAsset).join(", ")}</strong>
              {run.defense_actions.map((action) => <span key={action}><Check size={13} />{action}</span>)}
              <div><i className={run.continuity_verified ? "is-ok" : ""} />Water service continuity {run.continuity_verified ? "verified" : "unverified"}</div>
            </div>
          </div>
        </section>
      )}

      <footer className="attack-footer"><Link to="/"><ArrowLeft size={13} /> Operator console</Link><span>Controlled simulation environment</span></footer>
    </main>
  );
}
