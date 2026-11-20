import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Logs } from "./Logs";

afterEach(() => vi.restoreAllMocks());

it("searches live audit evidence", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
    {
      audit_id: "audit-1", timestamp: "2026-11-20T12:00:00Z", category: "defense",
      action: "firewall_rule_created", actor: "sentinel-decision-engine", entity_type: "firewall_rule",
      entity_id: "rule-1", outcome: "enforced", detail: "Scoped source restriction enforced.",
    },
    {
      audit_id: "audit-2", timestamp: "2026-11-20T12:01:00Z", category: "continuity",
      action: "firewall_rule_rolled_back", actor: "sentinel-continuity-engine", entity_type: "firewall_rule",
      entity_id: "rule-2", outcome: "rolled_back", detail: "Legitimate transaction failed.",
    },
  ]), { status: 200, headers: { "Content-Type": "application/json" } }));

  render(<Logs />);

  expect(await screen.findByText("firewall rule created")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText(/Search actions/), { target: { value: "rollback" } });
  expect(screen.getByText("firewall rule rolled back")).toBeInTheDocument();
  expect(screen.queryByText("firewall rule created")).not.toBeInTheDocument();
});
