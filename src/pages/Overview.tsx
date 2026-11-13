import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Metric, Eyebrow, Status } from "../components/UI";
import { Orbit, Terrain } from "../components/Visuals";
import { activity, incidents } from "../data";

export function Overview() {
  const critical = incidents[0];
  return (
    <div className="animate-enter">
      <section className="relative mb-9 min-h-[118px] overflow-hidden">
        <Terrain />
        <div className="relative z-10 pt-3">
          <Eyebrow>Command center</Eyebrow>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-white sm:text-[40px]">Infrastructure Defense</h1>
          <p className="mt-2 text-[15px] text-secondary">Real-time protection for critical services.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Protected services" value="4" detail="ALL ONLINE" />
        <Metric label="Active incidents" value="1" detail="1 CRITICAL" />
        <Metric label="Contained threats" value="7" detail="24H" />
        <Metric label="System health" value="98%" detail="NOMINAL" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.38fr_1fr]">
        <div className="panel relative min-h-[352px] overflow-hidden p-7 lg:p-8">
          <Eyebrow>Security posture</Eyebrow>
          <div className="relative z-10 mt-16">
            <div className="text-6xl font-medium tracking-[-0.055em] text-white sm:text-7xl">High</div>
            <div className="mt-4 text-xs tracking-[0.25em] text-secondary">THREAT LEVEL</div>
          </div>
          <div className="absolute bottom-2 right-2 top-10 w-[68%] sm:w-[62%]"><Orbit /></div>
        </div>

        <div className="grid gap-4">
          <Link to="/incidents" className="panel group flex min-h-[155px] items-center justify-between p-7 transition-colors hover:border-white/30">
            <div>
              <Eyebrow>Critical incident</Eyebrow>
              <h2 className="mt-4 text-lg font-medium tracking-[-0.025em] text-white">{critical.title}</h2>
              <p className="mt-1 text-sm text-muted">{critical.service} · {critical.time}</p>
            </div>
            <ArrowUpRight className="text-secondary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" size={21} strokeWidth={1.5} />
          </Link>
          <div className="panel min-h-[180px] p-7">
            <div className="flex items-center justify-between"><Eyebrow>Recent activity</Eyebrow><Status tone="light">Live</Status></div>
            <div className="mt-5 space-y-4">
              {activity.slice(0, 3).map((item, i) => (
                <div key={item.time} className="grid grid-cols-[16px_1fr_auto] items-center gap-3 text-xs sm:text-sm">
                  <span className={`grid h-4 w-4 place-items-center rounded-full ${i === 0 ? "bg-white text-black" : "bg-white/10 text-muted"}`}>{i === 0 && <Check size={10} strokeWidth={3} />}</span>
                  <span className={i === 0 ? "text-primary" : "text-secondary"}>{item.event}</span>
                  <time className="font-mono text-[11px] text-muted">{item.time.slice(0, 5)}</time>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] px-5 py-4 text-xs text-secondary">
        <ShieldCheck size={17} strokeWidth={1.6} className="text-white" />
        <span>Protection is active. Legitimate traffic continues across all monitored services.</span>
      </div>
    </div>
  );
}
