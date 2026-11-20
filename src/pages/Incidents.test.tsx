import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Incidents } from "./Incidents";

afterEach(() => vi.restoreAllMocks());

const incident = {
  incident_id: "inc-1",
  created_at: "2026-11-20T12:00:00Z",
  title: "Administrative pump override anomaly",
  service_id: "dardania-water-api",
  session_id: "session-compromised",
  status: "contained",
  summary: "A compromised session attempted a restricted pump operation.",
  risk: {
    assessment_id: "risk-1",
    event_id: "event-1",
    created_at: "2026-11-20T12:00:00Z",
    risk_score: 94,
    level: "critical",
    signals: [{ code: "PRIVILEGED_MUTATION", label: "Privileged mutation", score: 42, evidence: "Restricted administrative operation" }],
    recommendation: "Restrict the compromised session.",
  },
};

it("loads incident evidence and resolves the selected incident", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    if (init?.method === "PATCH") {
      return new Response(JSON.stringify({ ...incident, status: "resolved" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([incident]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Incidents />);

  expect(await screen.findAllByText("Administrative pump override anomaly")).not.toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Resolve incident" }));

  await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) =>
    String(input).includes("/api/v1/incidents/inc-1") && init?.method === "PATCH",
  )).toBe(true));
});

it("keeps incident evidence visible when a status update fails", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    if (init?.method === "PATCH") {
      return new Response(JSON.stringify({ detail: "Operator role required" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([incident]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Incidents />);
  await screen.findAllByText("Administrative pump override anomaly");
  fireEvent.click(screen.getByRole("button", { name: "Resolve incident" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Operator role required");
  expect(screen.getAllByText("Administrative pump override anomaly")).not.toHaveLength(0);
});
