import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Threats } from "./Threats";

afterEach(() => vi.restoreAllMocks());

it("renders live explainable threat evidence", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const payload = String(input).includes("/policies") ? [{
      policy_id: "adaptive-defense-default",
      moderate_threshold: 25,
      high_threshold: 55,
      critical_threshold: 85,
    }] : [{
      assessment_id: "risk-1",
      event_id: "event-1",
      created_at: "2026-11-20T12:00:00Z",
      risk_score: 94,
      level: "critical",
      signals: [
        { code: "A", label: "Privileged mutation", score: 30, evidence: "Restricted operation" },
        { code: "B", label: "Unknown network", score: 24, evidence: "New source" },
        { code: "C", label: "Unknown device", score: 20, evidence: "New device" },
        { code: "D", label: "Request velocity", score: 20, evidence: "Burst behavior" },
      ],
      recommendation: "Restrict the compromised session.",
    }];
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Threats />);

  expect(screen.getByRole("heading", { name: "Threat Intelligence" })).toBeInTheDocument();
  expect(await screen.findByText("94")).toBeInTheDocument();
  expect(screen.getByText("4 correlated signals")).toBeInTheDocument();
  expect(screen.getByText("Restrict the compromised session.")).toBeInTheDocument();
  expect(screen.getByText("85–100")).toBeInTheDocument();
  expect(screen.getByText("55–84")).toBeInTheDocument();
  expect(screen.getByText("25–54")).toBeInTheDocument();
});
