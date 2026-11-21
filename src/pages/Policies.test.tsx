import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Policies } from "./Policies";

afterEach(() => vi.restoreAllMocks());

const policy = {
  policy_id: "adaptive-defense-default", name: "Adaptive defense", description: "Corroborated scoped containment.",
  enabled: true, moderate_threshold: 30, high_threshold: 60, critical_threshold: 80,
  automatic_containment: true, require_corroboration: true, updated_at: "2026-11-20T12:00:00Z",
};

it("updates automatic protection through the policy backend", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) =>
    new Response(JSON.stringify(init?.method === "PATCH" ? { ...policy, automatic_containment: false } : [policy]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  render(<Policies />);

  const toggle = await screen.findByRole("switch", { name: "Automatic scoped protection" });
  fireEvent.click(toggle);
  await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) =>
    String(input).includes("/api/v1/policies/adaptive-defense-default") && init?.method === "PATCH",
  )).toBe(true));
});

it("shows rejected policy changes", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    if (init?.method === "PATCH") {
      return new Response(JSON.stringify({ detail: "Thresholds must be ordered" }), { status: 422, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([policy]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Policies />);
  fireEvent.click(await screen.findByRole("switch", { name: "Automatic scoped protection" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Thresholds must be ordered");
});
