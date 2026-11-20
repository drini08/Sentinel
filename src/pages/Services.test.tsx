import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Services } from "./Services";

afterEach(() => vi.restoreAllMocks());

it("shows protected infrastructure and runs a continuity check", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (init?.method === "POST") {
      return new Response(JSON.stringify({
        check_id: "check-1", service_id: "dardania-water-api", checked_at: "2026-11-20T12:00:00Z",
        status: "healthy", response_time_ms: 28, transaction_succeeded: true, detail: "Legitimate transaction succeeded.",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("health-checks")) {
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([{
      service_id: "dardania-water-api", name: "Dardania Water API", service_type: "Administrative API",
      base_url: "sim://water-api", health_path: "/health", essential_paths: ["/telemetry/pressure"],
      status: "healthy", latency_ms: 28, enabled: true,
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Services />);

  expect(await screen.findByText("Dardania Water API")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Verify continuity" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) =>
    String(input).includes("/api/v1/health-checks/run") && init?.method === "POST",
  )).toBe(true));
});

it("shows continuity errors without removing the service inventory", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ detail: "Continuity engine unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    if (String(input).includes("health-checks")) {
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify([{
      service_id: "dardania-water-api", name: "Dardania Water API", service_type: "Administrative API",
      base_url: "sim://water-api", health_path: "/health", essential_paths: ["/telemetry/pressure"],
      status: "healthy", latency_ms: 28, enabled: true,
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  render(<Services />);
  await screen.findByText("Dardania Water API");
  fireEvent.click(screen.getByRole("button", { name: "Verify continuity" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Continuity engine unavailable");
  expect(screen.getByText("Dardania Water API")).toBeInTheDocument();
});
