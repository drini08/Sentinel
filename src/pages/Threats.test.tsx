import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Threats } from "./Threats";

afterEach(() => vi.restoreAllMocks());

it("renders live explainable threat evidence", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify([{
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
    }]), { status: 200, headers: { "Content-Type": "application/json" } }),
  );

  render(<Threats />);

  expect(screen.getByRole("heading", { name: "Threat Intelligence" })).toBeInTheDocument();
  expect(await screen.findByText("94")).toBeInTheDocument();
  expect(screen.getByText("4 correlated signals")).toBeInTheDocument();
  expect(screen.getByText("Restrict the compromised session.")).toBeInTheDocument();
});
