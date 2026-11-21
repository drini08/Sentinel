import { useEffect } from "react";
import { Link } from "react-router-dom";
import { DefenseNetwork } from "../components/Visuals";
import { Eyebrow } from "../components/UI";
import { type Dashboard, usePolling } from "../api";

const capabilities = [
  {
    number: "01",
    title: "Observe",
    description: "Builds a live view of every request, service, and operational signal.",
  },
  {
    number: "02",
    title: "Understand",
    description: "Finds behavior that does not belong without slowing normal work.",
  },
  {
    number: "03",
    title: "Contain",
    description: "Blocks malicious commands and isolates only the compromised session.",
  },
  {
    number: "04",
    title: "Continue",
    description: "Keeps verified operations running while the threat is handled.",
  },
];

export function Overview() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        window.clearInterval(timer);
        return;
      }
      window.scrollBy({ top: 1, behavior: "auto" });
    }, 55);
    return () => window.clearInterval(timer);
  }, []);

  const dashboard = usePolling<Dashboard | null>("/api/v1/dashboard", null);
  const incidentLabel = dashboard.data
    ? `${dashboard.data.active_incidents} active incident${dashboard.data.active_incidents === 1 ? "" : "s"}`
    : null;
  return (
    <div className="animate-enter overview-v2 overview-apple">
      <section className="overview-hero">
        <div className="overview-hero-copy">
          <Eyebrow>Critical operations command</Eyebrow>
          <h1 aria-label="Critical infrastructure. Continuously defended.">Critical infrastructure.<br /><span>Continuously defended.</span></h1>
          <p>See every protected system, understand every threat, and keep essential services moving.</p>
          <div className="overview-actions">
            <Link to="/facility" className="button-primary" aria-label="Open facility">Open facility</Link>
            <Link to="/lab" className="button-secondary" aria-label="Run attack demo">Run attack demo</Link>
          </div>
          <div className="overview-proof">
            {dashboard.connected && dashboard.data ? <>
              <span>{dashboard.data.protected_services} services protected</span>
              <span>{incidentLabel}</span>
              <span>{dashboard.data.continuity_ok ? "Continuity verified" : "Continuity at risk"}</span>
            </> : <span>Live posture unavailable</span>}
          </div>
        </div>
        <DefenseNetwork />
      </section>

      <section className="overview-explainer" aria-labelledby="what-it-does">
        <header className="overview-explainer-head">
          <div>
            <Eyebrow>Operational defense</Eyebrow>
            <h2 id="what-it-does">What it does</h2>
          </div>
          <p>Protection built around how critical systems actually operate.</p>
        </header>

        <div className="overview-capabilities">
          {capabilities.map((capability) => (
            <article className="overview-capability" key={capability.number}>
              <span>{capability.number}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
