import { CloudOff, Droplets, Gauge, Radio, Waves } from "lucide-react";
import type { FacilitySnapshot } from "./types";

export function FacilityStatus({ snapshot, stale }: { snapshot: FacilitySnapshot; stale: boolean }) {
  const totalFlow = snapshot.connections.reduce((sum, connection) => sum + (connection.active ? connection.flow_m3s : 0), 0);
  const reservoir = snapshot.assets.find((asset) => asset.id === "reservoir-a");
  const intake = snapshot.assets.find((asset) => asset.id === "raw-intake");
  const pump = snapshot.assets.find((asset) => asset.id === "pump-station");
  return (
    <div className="facility-status-strip">
      <div className={stale ? "facility-live is-stale" : "facility-live"}>
        {stale ? <CloudOff size={13} /> : <Radio size={13} />}
        {stale ? "DATA STALE" : "LIVE DIGITAL TWIN"}
      </div>
      <div><Droplets size={13} /><span>RESERVOIR</span><strong>{Number(reservoir?.metrics.level_percent ?? 0).toFixed(1)}%</strong></div>
      <div><Gauge size={13} /><span>PRESSURE</span><strong>{Number(pump?.metrics.pressure_bar ?? 0).toFixed(2)} bar</strong></div>
      <div><span>TURBIDITY</span><strong>{Number(intake?.metrics.turbidity_ntu ?? 0).toFixed(2)} NTU</strong></div>
      <div><Waves size={13} /><span>NETWORK FLOW</span><strong>{totalFlow.toFixed(1)} m³/s</strong></div>
    </div>
  );
}
