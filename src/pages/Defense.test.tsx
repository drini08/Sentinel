import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Defense } from "./Defense";

afterEach(() => vi.restoreAllMocks());

it("creates a short-lived scoped rule through the backend", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (init?.method === "POST" && url.endsWith("/api/v1/firewall/rules")) {
      return new Response(JSON.stringify({
        rule_id: "rule-1",
        target_type: "ip",
        target_value: "203.0.113.44",
        action: "block",
        justification: "Operator-confirmed malicious simulation source.",
        created_at: "2026-11-20T12:00:00Z",
        expires_at: "2026-11-20T12:15:00Z",
        status: "active",
        created_by: "console-operator",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Defense />);
  fireEvent.click(screen.getByRole("button", { name: "Enforce for 15 min" }));

  await screen.findByText("Scoped rule enforced and continuity verified.");
  const postCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/api/v1/firewall/rules") && init?.method === "POST");
  expect(postCall).toBeDefined();
  expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
    target_type: "ip",
    target_value: "203.0.113.44",
    action: "block",
    duration_seconds: 900,
  });
  await waitFor(() => expect(screen.getByRole("button", { name: "Enforce for 15 min" })).toBeEnabled());
});

it("shows backend safety errors without hiding the controls", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ detail: "Infrastructure-wide rules are prohibited" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Defense />);
  fireEvent.click(screen.getByRole("button", { name: "Enforce for 15 min" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Infrastructure-wide rules are prohibited");
  expect(screen.getByRole("button", { name: "Enforce for 15 min" })).toBeInTheDocument();
});
