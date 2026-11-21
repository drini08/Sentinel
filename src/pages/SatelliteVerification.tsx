import { useEffect, useState } from "react";
import { AlertTriangle, CloudSun, ScanSearch, Sparkles } from "lucide-react";
import { PageHeader, Status } from "../components/UI";
import { satelliteApi } from "../satellite/api";
import { SatelliteMap } from "../satellite/SatelliteMap";
import type { Coordinate, SatelliteAnalysisResult, SatelliteApi, SatelliteStatus } from "../satellite/types";

export function SatelliteVerification({ api = satelliteApi }: { api?: SatelliteApi }) {
  const [polygon, setPolygon] = useState<Coordinate[]>([]);
  const [draftPolygon, setDraftPolygon] = useState<Coordinate[] | null>(null);
  const [status, setStatus] = useState<SatelliteStatus | null>(null);
  const [result, setResult] = useState<SatelliteAnalysisResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scadaLevel, setScadaLevel] = useState<number | "">("");
  const [analyzedVertices, setAnalyzedVertices] = useState(0);
  const [periods, setPeriods] = useState({
    baseline_start: "2025-08-01", baseline_end: "2025-11-22",
    current_start: "2026-08-01", current_end: "2026-11-22",
  });
  useEffect(() => { void api.getStatus().then(setStatus).catch(() => setStatus(null)); }, [api]);

  const changePolygon = (next: Coordinate[]) => {
    setPolygon(next);
    setResult(null);
    setAnalyzedVertices(0);
  };

  const changeDraft = (next: Coordinate[] | null) => {
    setDraftPolygon(next);
    if (next !== null) {
      setResult(null);
      setAnalyzedVertices(0);
    }
  };

  const analyze = async () => {
    const selectedPolygon = draftPolygon ?? polygon;
    if (selectedPolygon.length < 3) { setError("Draw at least three polygon points."); return; }
    if (Object.values(periods).some((period) => !period)) { setError("Select both imagery periods."); return; }
    if (scadaLevel === "") { setError("Enter the current SCADA reservoir level."); return; }
    setPending(true); setError(null);
    try {
      const analysis = await api.analyze({
        polygon: selectedPolygon,
        ...periods,
        scada_level_percent: scadaLevel,
      });
      setResult(analysis);
      setAnalyzedVertices(selectedPolygon.length);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Satellite analysis failed"); }
    finally { setPending(false); }
  };

  return <div className="animate-enter satellite-page">
    <PageHeader eyebrow="Physical ground truth" title="Satellite Intelligence" description="Draw an operational boundary, measure visible water change with Earth Engine, and compare independent evidence with SCADA telemetry." action={<Status tone={status?.mode === "live" ? "light" : "neutral"}>{status?.mode === "live" ? "Live analysis ready" : "Live analysis unavailable"}</Status>} />
    <div className="satellite-layout">
      <section className="panel satellite-workspace">
        <SatelliteMap polygon={polygon} onChange={changePolygon} onDraftChange={changeDraft} />
        <div className="satellite-periods">
          <fieldset><legend>Baseline imagery period</legend><label>From<input type="date" value={periods.baseline_start} onChange={(event) => setPeriods({ ...periods, baseline_start: event.target.value })} /></label><label>To<input type="date" value={periods.baseline_end} onChange={(event) => setPeriods({ ...periods, baseline_end: event.target.value })} /></label></fieldset>
          <fieldset><legend>Current imagery period</legend><label>From<input type="date" value={periods.current_start} onChange={(event) => setPeriods({ ...periods, current_start: event.target.value })} /></label><label>To<input type="date" value={periods.current_end} onChange={(event) => setPeriods({ ...periods, current_end: event.target.value })} /></label></fieldset>
        </div>
        <div className="satellite-controls">
          <label><span>SCADA reservoir level</span><input type="number" min="0" max="100" value={scadaLevel} placeholder="Enter SCADA %" onChange={(event) => setScadaLevel(event.target.value === "" ? "" : Number(event.target.value))} aria-label="SCADA reservoir level" /></label>
          <button type="button" className="button-primary" disabled={pending || status?.mode !== "live" || (draftPolygon ?? polygon).length < 3 || scadaLevel === "" || Object.values(periods).some((period) => !period)} onClick={() => void analyze()}><ScanSearch size={15} />{pending ? "Analyzing imagery…" : draftPolygon ? "Analyze drawn area" : "Analyze selected area"}</button>
        </div>
      </section>
      <aside className="satellite-side">
        <div className="panel satellite-connection"><div className="eyebrow">Integration status</div><div><CloudSun size={17} /><span>Earth Engine</span><b>{status?.earth_engine_configured ? "Connected" : "Unavailable"}</b></div><div><Sparkles size={17} /><span>Gemini explanation</span><b>{status?.gemini_configured ? "Connected" : "Unavailable"}</b></div>{status?.dataset && <small>{status.dataset}</small>}</div>
        {error && <div className="satellite-error"><AlertTriangle size={16} />{error}</div>}
        {!result && <div className="panel satellite-empty"><ScanSearch size={23} /><strong>Ready for verification</strong><p>The selected reservoir boundary will be compared across two satellite periods and checked against the SCADA level.</p></div>}
        {result && <div className="panel satellite-result">
          <div className="satellite-result-head"><CloudSun size={20} /><div><span>Live satellite measurement</span><strong>{result.change_percent > 0 ? "+" : ""}{result.change_percent}% water extent</strong></div></div>
          <div className="satellite-metrics"><div><span>Baseline</span><strong>{result.baseline_water_km2} km²</strong></div><div><span>Current</span><strong>{result.current_water_km2} km²</strong></div><div><span>SCADA</span><strong>{result.scada_level_percent}%</strong></div></div>
          <p>{result.observation}</p><div className="satellite-recommendation"><Sparkles size={14} /><ul>{result.recommendation.split(";").map((item) => item.trim()).filter(Boolean).slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>
          <small>Earth Engine measurement · Gemini explanation · {analyzedVertices} submitted vertices · area {result.analysis_id.slice(4, 10)}</small>
        </div>}
      </aside>
    </div>
  </div>;
}
