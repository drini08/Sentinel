import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AttackConsole } from "./AttackConsole";

const containedRun = {
  run_id: "jury-demo-1",
  scenario: "sensor-spoofing" as const,
  status: "contained" as const,
  created_at: "2026-11-21T12:00:00Z",
  affected_asset_ids: ["reservoir-b"],
  risk_score: 100,
  continuity_verified: true,
  defense_actions: ["Anomalous source isolated", "Unsafe mutation blocked", "Clean operations path verified"],
  steps: [
    { sequence: 1, event: "Attack received", outcome: "Forged reservoir telemetry" },
    { sequence: 2, event: "Selective containment", outcome: "Reservoir B protected" },
  ],
};

describe("AttackConsole", () => {
  it("lets the jury launch one of three controlled attacks and see containment", async () => {
    const trigger = vi.fn().mockResolvedValue(containedRun);
    const api = { trigger, getStatus: vi.fn().mockResolvedValue({ active_run: null }) };
    render(<MemoryRouter><AttackConsole api={api} /></MemoryRouter>);

    expect(screen.getByRole("button", { name: /sensor spoofing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /command injection/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compromised operator/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sensor spoofing/i }));

    await waitFor(() => expect(screen.getByText("Attack contained")).toBeInTheDocument());
    expect(screen.getByText("Risk 100")).toBeInTheDocument();
    expect(screen.getByText("Reservoir B protected")).toBeInTheDocument();
  });

  it("recovers the persisted run when the trigger response is lost", async () => {
    const api = {
      trigger: vi.fn().mockRejectedValue(new Error("Network response lost")),
      getStatus: vi.fn().mockResolvedValue({ active_run: null }),
      getRun: vi.fn().mockResolvedValue({ ...containedRun, scenario: "command-injection" as const }),
    };
    render(<MemoryRouter><AttackConsole api={api} /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /command injection/i }));

    await waitFor(() => expect(screen.getByText("Attack contained")).toBeInTheDocument());
    expect(api.getRun).toHaveBeenCalledWith(expect.stringMatching(/^jury-/));
  });
});
