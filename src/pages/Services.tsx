import { ArrowUpRight, Plus } from "lucide-react";
import { services } from "../data";
import { PageHeader, Status } from "../components/UI";

export function Services() {
  return (
    <div className="animate-enter">
      <PageHeader eyebrow="Protection scope" title="Protected Services" description="Applications and APIs currently observed and enforced by the SENTINEL gateway." action={<button className="button-primary"><Plus size={15} /> Add service</button>} />
      <div className="panel overflow-hidden">
        <div className="table-scroll">
          <table className="data-table min-w-[760px]">
            <thead><tr><th>Service</th><th>Status</th><th>Requests / 24h</th><th>Latency</th><th>Policies</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.name}>
                  <td><div className="font-medium text-primary">{service.name}</div><div className="mt-1 text-xs text-muted">{service.type}</div></td>
                  <td><Status tone={service.status === "Protected" ? "light" : "neutral"}>{service.status}</Status></td>
                  <td className="font-mono text-xs">{service.requests}</td>
                  <td className="font-mono text-xs">{service.latency}</td>
                  <td>{service.policies}</td>
                  <td><button className="icon-button ml-auto" aria-label={`Open ${service.name}`}><ArrowUpRight size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div className="panel p-6"><div className="eyebrow">Gateway availability</div><div className="mt-4 text-2xl text-white">99.98%</div><p className="mt-2 text-xs text-muted">Across all protected routes</p></div>
        <div className="panel p-6"><div className="eyebrow">Requests evaluated</div><div className="mt-4 text-2xl text-white">141.1k</div><p className="mt-2 text-xs text-muted">During the last 24 hours</p></div>
        <div className="panel p-6"><div className="eyebrow">Continuity impact</div><div className="mt-4 text-2xl text-white">0.02%</div><p className="mt-2 text-xs text-muted">Requests selectively restricted</p></div>
      </div>
    </div>
  );
}
