import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./pages/Settings", () => {
  throw new Error("Failed to load the settings module");
});

describe("App routing", () => {
  it("keeps the public jury console outside the operator shell", async () => {
    render(<MemoryRouter initialEntries={["/attack"]}><App /></MemoryRouter>);

    expect(await screen.findByText("Jury attack terminal")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("keeps navigation available when a page module fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/settings"]}><App /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent("This page could not load.");
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Overview" }));
    expect(await screen.findByRole("heading", { name: "Critical infrastructure. Continuously defended." })).toBeInTheDocument();
  });
});
