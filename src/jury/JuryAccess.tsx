import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, RotateCcw, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { juryApi } from "./api";
import type { JuryApi, JuryRun } from "./types";

export function buildJuryAttackUrl(publicUrl: string | undefined, origin: string) {
  const base = (publicUrl?.trim() || origin).replace(/\/+$/, "");
  return base.endsWith("/attack") ? base : `${base}/attack`;
}

export function JuryAccess({
  api = juryApi,
  publicUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined,
}: { api?: JuryApi; publicUrl?: string }) {
  const attackUrl = useMemo(() => buildJuryAttackUrl(publicUrl, window.location.origin), [publicUrl]);
  const [run, setRun] = useState<JuryRun | null>(null);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const status = await api.getStatus();
        if (active) { setRun(status.active_run); setConnected(true); }
      } catch {
        if (active) setConnected(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api]);

  const copy = async () => {
    await navigator.clipboard?.writeText(attackUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const reset = async () => {
    if (!api.reset) return;
    const status = await api.reset();
    setRun(status.active_run);
  };

  return (
    <section className="jury-access">
      <div className="jury-access-copy">
        <p className="eyebrow">Live jury access</p>
        <h2>Let the room attack the facility.</h2>
        <p>Put this QR on the presentation screen. The jury lands directly on three controlled attack vectors while this console shows the defense live.</p>
        <div className="jury-url-row">
          <code>{attackUrl}</code>
          <button type="button" onClick={() => void copy()} aria-label="Copy jury URL">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
        </div>
        <div className="jury-access-actions">
          <a className="button-primary" href={attackUrl} target="_blank" rel="noreferrer" aria-label="Open jury console">Open jury console <ExternalLink size={13} /></a>
          {run && <button type="button" className="button-secondary" onClick={() => void reset()}><RotateCcw size={13} /> Reset demo</button>}
        </div>
      </div>
      <div className="jury-qr-panel">
        <div className="jury-qr"><QRCode value={attackUrl} size={178} bgColor="#f5f5f2" fgColor="#11151a" level="M" /></div>
        <div className="jury-qr-status"><span><i className={connected ? "is-connected" : ""} />{connected ? "Backend connected" : "Backend unavailable"}</span><Smartphone size={14} /></div>
        {run ? <div className="jury-last-run"><span>Latest attack</span><strong>{run.scenario.replaceAll("-", " ")}</strong><small>{run.status} · risk {run.risk_score}</small></div> : <div className="jury-last-run"><span>Demo state</span><strong>Waiting for jury</strong><small>Scan to open attack controls</small></div>}
      </div>
    </section>
  );
}
