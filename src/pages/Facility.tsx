import { useEffect, useState } from "react";
import { Play, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { AssetDrawer } from "../facility/AssetDrawer";
import { FacilityScene } from "../facility/FacilityScene";
import { FacilityStatus } from "../facility/FacilityStatus";
import { useFacility } from "../facility/useFacility";
import type { FacilityApi } from "../facility/types";
import { PageHeader } from "../components/UI";
import { JuryAccess } from "../jury/JuryAccess";
import { juryApi } from "../jury/api";
import type { JuryApi, JuryRun } from "../jury/types";

export function Facility({ api, juryApiClient = juryApi }: { api?: FacilityApi; juryApiClient?: JuryApi }) {
  const facility = useFacility({ api });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [juryRun, setJuryRun] = useState<JuryRun | null>(null);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const status = await juryApiClient.getStatus();
        if (active) setJuryRun(status.active_run);
      } catch {
        // The facility retains its last confirmed visual state while reconnecting.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [juryApiClient]);

  const alertAssetId = facility.lastCommand && !facility.lastCommand.applied
    ? facility.lastCommand.asset.id
    : juryRun?.affected_asset_ids[0] ?? null;

  return (
    <div className="animate-enter facility-page">
      <PageHeader
        eyebrow="Dardania Water Services"
        title="Facility Digital Twin"
        description="Live SCADA operations, protected commands, and explainable containment across the complete treatment and distribution facility."
        action={
          <div className="flex flex-wrap gap-3">
            <button type="button" className="button-secondary" disabled={facility.commandPending} onClick={() => void facility.reset()}>
              <RotateCcw size={14} />Reset facility
            </button>
            <button type="button" className="button-primary" disabled={facility.commandPending} onClick={() => void facility.runScenario()} aria-label="Run compromised operator">
              <Play size={14} fill="currentColor" />{facility.commandPending ? "Running…" : "Run attack demo"}
            </button>
          </div>
        }
      />

      <section className={`facility-stage ${alertAssetId ? "facility-stage-alert" : ""}`}>
        {facility.snapshot ? (
          <>
            <FacilityStatus snapshot={facility.snapshot} stale={facility.isStale} />
            <FacilityScene
              snapshot={facility.snapshot}
              selectedId={facility.selectedId}
              alertAssetId={alertAssetId}
              reducedMotion={reducedMotion}
              onSelect={facility.selectAsset}
            />
            <AssetDrawer
              asset={facility.selectedAsset}
              disabled={facility.commandPending || facility.isStale}
              onClose={() => facility.selectAsset(null)}
              onCommand={(command) => facility.executeCommand(facility.selectedAsset!.id, command)}
            />
            <div className="facility-stage-hint"><Sparkles size={12} /> Click any asset to inspect telemetry and controls</div>
          </>
        ) : (
          <div className="facility-loading"><span /><strong>Synchronizing facility state</strong><small>{facility.error ?? "Connecting to SENTINEL security core…"}</small></div>
        )}

        {facility.lastCommand && (
          <div className={`facility-command-result ${facility.lastCommand.applied ? "is-allowed" : "is-blocked"}`} aria-live="polite">
            {facility.lastCommand.applied ? <Sparkles size={15} /> : <ShieldAlert size={15} />}
            <div>
              <strong>{facility.lastCommand.applied ? "Command applied" : "Command blocked by SENTINEL"}</strong>
              <span>{facility.lastCommand.decision.reason}</span>
            </div>
          </div>
        )}

        {juryRun && (
          <div className="facility-jury-alert" role="status">
            <div><ShieldAlert size={17} /><span>External jury event</span></div>
            <strong>Jury attack contained</strong>
            <p>{juryRun.scenario.replaceAll("-", " ")} · {juryRun.affected_asset_ids.map((id) => id.replaceAll("-", " ")).join(", ")}</p>
            <b>Risk {juryRun.risk_score}</b>
          </div>
        )}
      </section>

      {facility.scenario?.continuity_verified && (
        <div className="facility-continuity" role="status">
          <ShieldAlert size={18} />
          <div><strong>Attack contained. Legitimate operations continued.</strong><span>Critical command blocked with risk {facility.scenario.attack.decision.assessment?.risk_score ?? 94}; independent operator access remained available.</span></div>
        </div>
      )}
      <JuryAccess api={juryApiClient} />
    </div>
  );
}
