import { useState } from "react";
import { ArrowRight, Check, Clock3, FileText, ShieldBan } from "lucide-react";
import { incidents } from "../data";
import { Eyebrow, PageHeader, Status } from "../components/UI";

export function Incidents() {
  const [selected, setSelected] = useState(incidents[0]);
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Investigations" title="Incidents" description="Review evidence, understand SENTINEL decisions, and verify containment outcomes." />
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.5fr]">
        <div className="panel overflow-hidden">
          <div className="border-b border-white/[0.07] px-6 py-5"><Eyebrow>Incident queue · {incidents.length}</Eyebrow></div>
          <div>
            {incidents.map((incident) => (
              <button key={incident.id} onClick={() => setSelected(incident)} className={`incident-row w-full text-left ${selected.id === incident.id ? "incident-row-active" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-primary">{incident.title}</div>
                    <div className="mt-1 text-xs text-muted">{incident.service}</div>
                  </div>
                  <span className="font-mono text-[10px] text-muted">{incident.score}</span>
                </div>
                <div className="mt-4 flex items-center justify-between"><Status tone={incident.status === "Contained" ? "light" : "neutral"}>{incident.status}</Status><time className="text-[11px] text-muted">{incident.time}</time></div>
              </button>
            ))}
          </div>
        </div>

        <article className="panel min-w-0 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-start">
            <div>
              <div className="font-mono text-[11px] tracking-[0.12em] text-muted">{selected.id}</div>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.035em] text-white">{selected.title}</h2>
              <p className="mt-2 text-sm text-secondary">{selected.summary}</p>
            </div>
            <div className="risk-score"><span>RISK</span><strong>{selected.score}</strong></div>
          </div>

          <div className="grid gap-7 py-7 sm:grid-cols-3">
            <div><Eyebrow>Service</Eyebrow><p className="mt-3 text-sm text-primary">{selected.service}</p></div>
            <div><Eyebrow>Source</Eyebrow><p className="mt-3 font-mono text-xs text-primary">{selected.source}</p></div>
            <div><Eyebrow>Outcome</Eyebrow><div className="mt-3"><Status tone="light">{selected.status}</Status></div></div>
          </div>

          <div className="border-t border-white/[0.07] pt-7">
            <Eyebrow>Decision evidence</Eyebrow>
            <div className="mt-5 space-y-3">
              {[
                ["Behavioral deviation", "Administrative mutation is outside this session’s 30-day profile.", "42"],
                ["Request sequence", "Three privileged endpoints were accessed within an 11-second window.", "31"],
                ["Access context", "Operation originated from an unrecognized network and device.", "21"],
              ].map(([title, text, points]) => (
                <div key={title} className="evidence-row">
                  <FileText size={17} strokeWidth={1.5} className="mt-0.5 text-secondary" />
                  <div><div className="text-sm text-primary">{title}</div><p className="mt-1 text-xs leading-5 text-muted">{text}</p></div>
                  <div className="font-mono text-xs text-secondary">+{points}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 border-t border-white/[0.07] pt-7">
            <Eyebrow>Containment sequence</Eyebrow>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[[ShieldBan, "Request blocked", "10:24:16"], [Clock3, "Session revoked", "10:24:18"], [Check, "Continuity verified", "10:24:21"]].map(([Icon, label, time]) => {
                const IconComponent = Icon as typeof Check;
                return <div className="sequence-step" key={String(label)}><IconComponent size={17} strokeWidth={1.6} /><span>{String(label)}</span><time>{String(time)}</time></div>;
              })}
            </div>
          </div>
          <button className="button-secondary mt-7">Open full investigation <ArrowRight size={15} /></button>
        </article>
      </div>
    </div>
  );
}
