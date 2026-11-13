import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Lab } from "./Lab";

it("runs the shared backend scenario instead of a local timer", async () => {
  const runScenario = vi.fn().mockResolvedValue({
    scenario: "compromised-operator",
    attack: { applied: false, decision: { allowed: false, assessment: { risk_score: 94 } } },
    legitimate: { applied: true, decision: { allowed: true } },
    continuity_verified: true,
    steps: [
      { sequence: 1, event: "Behavioral baseline", outcome: "Established" },
      { sequence: 2, event: "Compromised operator", outcome: "Detected" },
      { sequence: 3, event: "Selective containment", outcome: "Restricted" },
    ],
  });
  const api = { runScenario };
  render(<Lab api={api} />);

  fireEvent.click(screen.getByRole("button", { name: "Run scenario" }));

  await waitFor(() => expect(runScenario).toHaveBeenCalledOnce());
  expect(await screen.findByText("Selective containment")).toBeInTheDocument();
  expect(screen.getByText("Attack contained. Service remained available.")).toBeInTheDocument();
});
