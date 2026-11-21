import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudSun, ScanSearch, Sparkles } from "lucide-react";
import { PageHeader, Status } from "../components/UI";
import { satelliteApi } from "../satellite/api";
import { defaultPolygon, SatelliteMap } from "../satellite/SatelliteMap";
import type { Coordinate, SatelliteAnalysisResult, SatelliteApi, SatelliteStatus } from "../satellite/types";

export function SatelliteVerification({ api = satelliteApi }: { api?: SatelliteApi }) {
  const [polygon, setPolygon] = useState<Coordinate[]>(defaultPolygon);
  const [status, setStatus] = useState<SatelliteStatus | null>(null);
  const [result, setResult] = useState<SatelliteAnalysisResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scadaLevel, setScadaLevel] = useState(82);
  const [periods, setPeriods] = useState({
    baseline_start: "2025-06-01", baseline_end: "2025-08-31",
    current_start: "2026-06-01", current_end: "2026-08-31",
  });
  useEffect(() => { void api.getStatus().then(setStatus).catch(() => setStatus(null)); }, [api]);

  const analyze = async () => {
    if (polygon.length < 3) { setError("Draw at least three polygon points."); return; }
    setPending(true); setError(null);
    try {
      setResult(await api.analyze({
        name: "Batlava source reservoir",
        polygon,
        ...periods,
        scada_level_percent: scadaLevel,
      }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Satellite analysis failed"); }
    finally { setPending(false); }
  };

  return <div className="animate-enter satellite-page">
    <PageHeader eyebrow="Physical ground truth" title="Satellite Verification" description="Draw an operational boundary, measure visible water change with Earth Engine, and compare independent evidence with SCADA telemetry." action={<Status tone={status?.mode === "live" ? "light" : "neutral"}>{status?.mode === "live" ? "Earth Engine live" : "Demo imagery mode"}</Status>} />
    <div className="satellite-layout">
      <section className="panel satellite-workspace">
        <SatelliteMap polygon={polygon} onChange={setPolygon} />
        <div className="satellite-periods">
          <fieldset><legend>Baseline imagery period</legend><label>From<input type="date" value={periods.baseline_start} onChange={(event) => setPeriods({ ...periods, baseline_start: event.target.value })} /></label><label>To<input type="date" value={periods.baseline_end} onChange={(event) => setPeriods({ ...periods, baseline_end: event.target.value })} /></label></fieldset>
          <fieldset><legend>Current imagery period</legend><label>From<input type="date" value={periods.current_start} onChange={(event) => setPeriods({ ...periods, current_start: event.target.value })} /></label><label>To<input type="date" value={periods.current_end} onChange={(event) => setPeriods({ ...periods, current_end: event.target.value })} /></label></fieldset>
        </div>
        <div className="satellite-controls">
          <div><span>SCADA reservoir level</span><strong>{scadaLevel}%</strong></div>
          <input type="range" min="20" max="100" value={scadaLevel} onChange={(event) => setScadaLevel(Number(event.target.value))} aria-label="SCADA reservoir level" />
          <button type="button" className="button-primary" disabled={pending || polygon.length < 3} onClick={() => void analyze()}><ScanSearch size={15} />{pending ? "Analyzing imagery…" : "Analyze selected area"}</button>
        </div>
      </section>
      <aside className="satellite-side">
        <div className="panel satellite-connection"><div className="eyebrow">Integration status</div><div><CloudSun size={17} /><span>Earth Engine</span><b>{status?.earth_engine_configured ? "Connected" : "Demo fallback"}</b></div><div><Sparkles size={17} /><span>Gemini explanation</span><b>{status?.gemini_configured ? "Connected" : "Deterministic"}</b></div><small>{status?.dataset ?? "COPERNICUS/S2_SR_HARMONIZED"}</small></div>
        {error && <div className="satellite-error"><AlertTriangle size={16} />{error}</div>}
        {!result && <div className="panel satellite-empty"><ScanSearch size={23} /><strong>Ready for verification</strong><p>The selected reservoir boundary will be compared across two satellite periods and checked against the SCADA level.</p></div>}
        {result && <div className={`panel satellite-result ${result.mismatch_detected ? "is-mismatch" : ""}`}>
          <div className="satellite-result-head">{result.mismatch_detected ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}<div><span>{result.mismatch_detected ? "Mismatch detected" : "Evidence consistent"}</span><strong>{result.change_percent > 0 ? "+" : ""}{result.change_percent}% water extent</strong></div></div>
          <div className="satellite-metrics"><div><span>Baseline</span><strong>{result.baseline_water_km2} km²</strong></div><div><span>Current</span><strong>{result.current_water_km2} km²</strong></div><div><span>SCADA</span><strong>{result.scada_level_percent}%</strong></div></div>
          <p>{result.observation}</p><div className="satellite-recommendation"><Sparkles size={14} /><ul>{result.recommendation.split(";").map((item) => item.trim()).filter(Boolean).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>
          <small>{result.source === "earth-engine" ? "Earth Engine measurement" : "Deterministic demo measurement"} · {result.explanation_source === "gemini" ? "Gemini explanation" : "policy explanation"} · confidence {Math.round(result.confidence * 100)}%</small>
        </div>}
      </aside>
    </div>
    {result && <section className="satellite-comparison"><article><span>Baseline · {periods.baseline_start} to {periods.baseline_end}</span>{result.baseline_image_url ? <img src={result.baseline_image_url} alt="Baseline satellite observation" /> : <div className="satellite-placeholder baseline"><b>Historical composite</b><small>{periods.baseline_start} — {periods.baseline_end}</small></div>}</article><article><span>Current · {periods.current_start} to {periods.current_end}</span>{result.current_image_url ? <img src={result.current_image_url} alt="Current satellite observation" /> : <div className="satellite-placeholder current"><b>Recent composite</b><small>{periods.current_start} — {periods.current_end}</small></div>}</article></section>}
  </div>;
}
