import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { Overview } from "./Overview";

it("presents a live command-center entry point with direct operational actions", () => {
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
