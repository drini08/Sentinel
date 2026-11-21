import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FacilityApi, FacilitySnapshot } from "../facility/types";
import { Facility } from "./Facility";
import type { JuryApi } from "../jury/types";

vi.mock("../facility/FacilityScene", () => ({
  FacilityScene: ({ snapshot, onSelect, alertAssetId, onUnavailable }: {
    snapshot: FacilitySnapshot;
    onSelect(id: string): void;
    alertAssetId?: string | null;
    onUnavailable(): void;
  }) => (
    <div aria-label="3D facility">
      {alertAssetId && <span data-testid="alerted-3d-asset">{alertAssetId}</span>}
      <button type="button" onClick={onUnavailable}>Simulate context loss</button>
      {snapshot.assets.map((asset) => (
        <button key={asset.id} type="button" onClick={() => onSelect(asset.id)}>Select {asset.name}</button>
      ))}
    </div>
  ),
}));

const snapshot: FacilitySnapshot = {
  revision: 1,
  generated_at: "2026-11-13T14:00:00Z",
  assets: [
    {
      id: "reservoir-a",
      name: "Reservoir A",
      asset_type: "reservoir",
      status: "operational",
      security_status: "secure",
      position: [4.2, 1.2, -4],
      metrics: { level_percent: 72, capacity_ml: 8.5, inflow_m3s: 2.4, outflow_m3s: 2.1 },
      supported_commands: ["isolate", "set_target"],
    },
  ],
  connections: [],
};

function createApi(): FacilityApi {
  return {
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
    executeCommand: vi.fn().mockResolvedValue({
      applied: true,
      asset: { ...snapshot.assets[0], status: "isolated", metrics: { ...snapshot.assets[0].metrics, outflow_m3s: 0 } },
      decision: { allowed: true, reason: "Request permitted" },
    }),
    reset: vi.fn().mockResolvedValue(snapshot),
    runScenario: vi.fn().mockResolvedValue({
      scenario: "compromised-operator",
      attack: { applied: false, asset: snapshot.assets[0], decision: { allowed: false, response_status: 403 } },
      legitimate: { applied: true, asset: snapshot.assets[0], decision: { allowed: true, response_status: 200 } },
      continuity_verified: true,
      steps: [],
    }),
  };
}

describe("Facility page", () => {
  it("selects a reservoir and submits a backend-backed isolate command", async () => {
    const api = createApi();
    render(<Facility api={api} />);

    expect(await screen.findByLabelText("3D facility")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select Reservoir A" }));
    fireEvent.click(screen.getByRole("button", { name: "Isolate reservoir" }));

    await waitFor(() => expect(api.executeCommand).toHaveBeenCalledWith(
      "reservoir-a",
      expect.objectContaining({ command: { action: "isolate", value: true } }),
    ));
    expect(await screen.findByText("Command applied")).toBeInTheDocument();
  });

  it("keeps the asset drawer usable if the optional 3D view becomes unavailable", async () => {
    render(<Facility api={createApi()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Select Reservoir A" }));
    fireEvent.click(await screen.findByRole("button", { name: "Simulate context loss" }));

    expect(screen.getByText(/3D view unavailable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Reservoir A" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Isolate reservoir" })).toBeEnabled();
  });

  it("recovers through Retry after the initial facility read fails", async () => {
    const api = createApi();
    vi.mocked(api.getSnapshot).mockRejectedValueOnce(new Error("Request timed out"));
    render(<Facility api={api} />);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: "Select Reservoir A" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("runs the compromised operator demonstration and reports continuity", async () => {
    const api = createApi();
    render(<Facility api={api} />);

    fireEvent.click(await screen.findByRole("button", { name: "Run compromised operator" }));

    expect(await screen.findByText("Attack contained. Legitimate operations continued.")).toBeInTheDocument();
  });

  it("shows a jury-triggered attack on the operator facility screen", async () => {
    const juryApi: JuryApi = {
      trigger: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({
        active_run: {
          run_id: "jury-7",
          scenario: "command-injection",
          status: "contained",
          created_at: "2026-11-21T12:00:00Z",
          affected_asset_ids: ["dosing-unit"],
          risk_score: 100,
          continuity_verified: true,
          defense_actions: ["Unsafe mutation blocked"],
          steps: [{ sequence: 1, event: "Attack received", outcome: "Injected dosing command" }],
        },
      }),
    };

    render(<Facility api={createApi()} juryApiClient={juryApi} />);

    expect(await screen.findByText("Jury attack contained")).toBeInTheDocument();
    expect(screen.getAllByText(/command injection/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Risk 100")).toBeInTheDocument();
    expect(await screen.findByTestId("alerted-3d-asset")).toHaveTextContent("dosing-unit");
  });
});
