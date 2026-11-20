import { Link } from "react-router-dom";
import { DefenseNetwork } from "../components/Visuals";
import { Eyebrow } from "../components/UI";

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
            <span>4 services protected</span>
            <span>41.2 m³/s uninterrupted</span>
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
