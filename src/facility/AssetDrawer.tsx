import { useEffect, useState } from "react";
import { Activity, Gauge, Power, RotateCcw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { AssetCommand, FacilityAsset } from "./types";

type AssetDrawerProps = {
  asset: FacilityAsset | null;
  disabled: boolean;
  onClose(): void;
  onCommand(command: AssetCommand): Promise<unknown>;
};

function metricLabel(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metricValue(key: string, value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "string") return value.toUpperCase();
  if (key.endsWith("percent")) return `${value}%`;
  if (key.endsWith("m3s")) return `${value} m³/s`;
  if (key.endsWith("bar")) return `${value} bar`;
  if (key.endsWith("ml")) return `${value} ML`;
  if (key.endsWith("ntu")) return `${value} NTU`;
  if (key === "ph") return `pH ${value}`;
  return String(value);
}

export function AssetDrawer({ asset, disabled, onClose, onCommand }: AssetDrawerProps) {
  const currentTarget = asset ? Number(asset.metrics.target_level_percent ?? asset.metrics.level_percent ?? asset.metrics.position_percent ?? 70) : 70;
  const [target, setTarget] = useState(currentTarget);
  useEffect(() => setTarget(currentTarget), [asset?.id, currentTarget]);

  if (!asset) return null;
  const isolated = asset.status === "isolated";
  const stopped = asset.status === "stopped";
  const closed = asset.status === "closed";

  return (
    <aside className="facility-drawer no-scrollbar" aria-label={`${asset.name} controls`} tabIndex={0}>
      <div className="facility-drawer-head">
        <div>
          <div className="facility-drawer-kicker">{asset.asset_type.replaceAll("_", " ")}</div>
          <h2>{asset.name}</h2>
        </div>
        <button type="button" className="facility-close" onClick={onClose} aria-label="Close asset controls"><X size={16} /></button>
      </div>

      <div className="facility-asset-state">
        <span className={`facility-state-light ${asset.status === "operational" ? "is-operational" : ""}`} />
        <div><strong>{asset.status.toUpperCase()}</strong><span><ShieldCheck size={12} /> {asset.security_status.toUpperCase()}</span></div>
      </div>

      <div className="facility-metrics">
        {Object.entries(asset.metrics).slice(0, 6).map(([key, value]) => (
          <div key={key} className="facility-metric">
            <span>{metricLabel(key)}</span>
            <strong>{metricValue(key, value)}</strong>
          </div>
        ))}
      </div>

      {asset.supported_commands.length > 0 && (
        <div className="facility-controls">
          <div className="facility-control-title"><SlidersHorizontal size={13} /> Authorized controls</div>
          {asset.asset_type === "reservoir" && (
            <button
              type="button"
              className={isolated ? "facility-command" : "facility-command facility-command-danger"}
              disabled={disabled}
              onClick={() => void onCommand({ action: "isolate", value: !isolated })}
            >
              {isolated ? <RotateCcw size={14} /> : <Power size={14} />}
              {isolated ? "Restore reservoir" : "Isolate reservoir"}
            </button>
          )}
          {asset.asset_type === "pump_station" && (
            <button type="button" className="facility-command" disabled={disabled} onClick={() => void onCommand({ action: stopped ? "start" : "stop" })}>
              <Power size={14} />{stopped ? "Start pumps" : "Stop pumps"}
            </button>
          )}
          {asset.asset_type === "valve" && (
            <button type="button" className="facility-command" disabled={disabled} onClick={() => void onCommand({ action: closed ? "open" : "close" })}>
              <Gauge size={14} />{closed ? "Open manifold" : "Close manifold"}
            </button>
          )}
          {asset.supported_commands.includes("set_target") && (
            <div className="facility-target">
              <div><span>Target setting</span><strong>{target.toFixed(0)}%</strong></div>
              <input
                type="range"
                min="10"
                max="95"
                value={target}
                disabled={disabled}
                onChange={(event) => setTarget(Number(event.target.value))}
                aria-label={`${asset.name} target setting`}
              />
              <button type="button" className="facility-command" disabled={disabled} onClick={() => void onCommand({ action: "set_target", value: target })}>
                <Activity size={14} />Apply target
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
