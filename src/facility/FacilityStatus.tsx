import { CloudOff, Radio, Waves } from "lucide-react";
import type { FacilitySnapshot } from "./types";

export function FacilityStatus({ snapshot, stale }: { snapshot: FacilitySnapshot; stale: boolean }) {
  const totalFlow = snapshot.connections.reduce((sum, connection) => sum + (connection.active ? connection.flow_m3s : 0), 0);
  const operational = snapshot.assets.filter((asset) => asset.status === "operational").length;
  return (
    <div className="facility-status-strip">
      <div className={stale ? "facility-live is-stale" : "facility-live"}>
        {stale ? <CloudOff size={13} /> : <Radio size={13} />}
        {stale ? "DATA STALE" : "LIVE DIGITAL TWIN"}
      </div>
      <div><span>REVISION</span><strong>{String(snapshot.revision).padStart(3, "0")}</strong></div>
      <div><span>ASSETS</span><strong>{operational}/{snapshot.assets.length} NOMINAL</strong></div>
      <div><Waves size={13} /><span>NETWORK FLOW</span><strong>{totalFlow.toFixed(1)} m³/s</strong></div>
    </div>
  );
}
