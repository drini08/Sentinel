import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { Overview } from "./Overview";

afterEach(() => vi.restoreAllMocks());

it("presents the command-center entry point with direct operational actions", () => {
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
});

it("loads without backend requests or a preset service summary", () => {
  const fetch = vi.spyOn(globalThis, "fetch");

  render(<MemoryRouter><Overview /></MemoryRouter>);

  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText("4 services protected")).not.toBeInTheDocument();
  expect(screen.queryByText("Continuity verified")).not.toBeInTheDocument();
  expect(screen.queryByText("41.2 m³/s uninterrupted")).not.toBeInTheDocument();
});
