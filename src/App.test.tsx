import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App routing", () => {
  it("keeps the public jury console outside the operator shell", async () => {
    render(<MemoryRouter initialEntries={["/attack"]}><App /></MemoryRouter>);

    expect(await screen.findByText("Jury attack terminal")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
