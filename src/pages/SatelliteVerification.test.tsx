import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { FacilityApi, FacilityAsset } from "../facility/types";
import type { Coordinate, SatelliteApi } from "../satellite/types";
import { SatelliteVerification } from "./SatelliteVerification";

const vertices: Coordinate[] = [[21.34, 42.81], [21.35, 42.82], [21.36, 42.81]];

vi.mock("../satellite/SatelliteMap", () => ({
  SatelliteMap({ onChange, onDrawingChange }: {
    onChange: (polygon: Coordinate[]) => void;
    onDrawingChange: (drawing: boolean) => void;
  }) {
    const [draft, setDraft] = useState<Coordinate[] | null>(null);
    const endDrawing = () => {
      setDraft(null);
      onDrawingChange(false);
    };
    return (
      <>
        {draft === null ? (
          <button onClick={() => { setDraft([]); onDrawingChange(true); }}>Draw new polygon</button>
        ) : (
          <>
            <button onClick={() => setDraft([...draft, vertices[draft.length]])} disabled={draft.length >= vertices.length}>
              Add vertex
            </button>
            <button onClick={() => { onChange(draft); endDrawing(); }} disabled={draft.length < 3}>
              Finish polygon
            </button>
            <button onClick={endDrawing}>Cancel</button>
          </>
        )}
        <button onClick={() => { onChange([]); endDrawing(); }}>Clear area</button>
      </>
    );
  },
}));

const telemetryAssets: Array<Pick<FacilityAsset, "id" | "asset_type" | "metrics">> = [
  { id: "reservoir-a", asset_type: "reservoir", metrics: { level_percent: 80, inflow_m3s: 1.7, outflow_m3s: 1.6 } },
  { id: "raw-intake", asset_type: "intake", metrics: { turbidity_ntu: 4.8 } },
  { id: "pump-station", asset_type: "pump_station", metrics: { pressure_bar: 5.8 } },
];

it("analyzes only a finished polygon and disables analysis during a replacement draft", async () => {
  const analyze = vi.fn<SatelliteApi["analyze"]>().mockResolvedValue({
    analysis_id: "sat_test",
    baseline_water_km2: 2,
    current_water_km2: 1.8,
    change_percent: -10,
    scada_level_percent: 80,
    observation: "Water extent decreased.",
    recommendation: "Check telemetry.",
    imagery_dataset: "test",
  });
  const satelliteApi: SatelliteApi = {
    analyze,
    getStatus: async () => ({ earth_engine_configured: true, gemini_configured: true, mode: "live", dataset: "test" }),
  };
  const facilityApi: FacilityApi = {
    getSnapshot: async () => ({
      revision: 1,
      generated_at: "",
      assets: telemetryAssets.map((asset): FacilityAsset => ({
        ...asset,
        name: asset.id,
        status: "operational",
        security_status: "secure",
        position: [0, 0, 0],
        supported_commands: [],
      })),
      connections: [],
    }),
    executeCommand: vi.fn(),
    reset: vi.fn(),
    runScenario: vi.fn(),
  };
  render(<SatelliteVerification api={satelliteApi} facilityApiClient={facilityApi} />);
  await screen.findByText("80% automatically synchronized");
  const analyzeButton = () => screen.getByRole("button", { name: "Analyze selected area" });
  const clickButton = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

  expect(analyzeButton()).toBeDisabled();
  clickButton("Draw new polygon");
  for (const _vertex of vertices) clickButton("Add vertex");
  expect(screen.getByRole("button", { name: "Finish polygon" })).toBeEnabled();
  expect(analyzeButton()).toBeDisabled();
  fireEvent.click(analyzeButton());
  expect(analyze).not.toHaveBeenCalled();

  clickButton("Finish polygon");
  expect(analyzeButton()).toBeEnabled();
  fireEvent.click(analyzeButton());
  expect(analyze).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ polygon: vertices, scada_level_percent: 80 }));
  await screen.findByText("Water extent decreased.");

  clickButton("Draw new polygon");
  expect(analyzeButton()).toBeDisabled();
  clickButton("Cancel");
  expect(analyzeButton()).toBeEnabled();
  clickButton("Clear area");
  expect(analyzeButton()).toBeDisabled();
});
