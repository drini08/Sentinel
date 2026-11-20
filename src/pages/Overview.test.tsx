import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { Overview } from "./Overview";

afterEach(() => vi.restoreAllMocks());

it("presents a live command-center entry point with direct operational actions", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    generated_at: "2026-11-20T12:00:00Z",
    protected_services: 4,
    healthy_services: 4,
    active_incidents: 1,
    critical_incidents: 1,
    active_rules: 1,
    restricted_sessions: 1,
    continuity_ok: true,
    recent_incidents: [],
    recent_audit: [],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  const { container } = render(<MemoryRouter><Overview /></MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Critical infrastructure. Continuously defended." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open facility" })).toHaveAttribute("href", "/facility");
  expect(screen.getByRole("link", { name: "Run attack demo" })).toHaveAttribute("href", "/lab");
  expect(screen.getByText("Live defense network")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "What it does" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Observe" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Understand" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Contain" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Continue" })).toBeInTheDocument();
  expect(screen.queryByText("Requests analyzed")).not.toBeInTheDocument();
  expect(screen.queryByText("PROTECTION ACTIVE")).not.toBeInTheDocument();
  expect(container.firstElementChild).toHaveClass("overview-apple");
  expect(await screen.findByText("1 active incident")).toBeInTheDocument();
  expect(screen.getByText("Continuity verified")).toBeInTheDocument();
});
