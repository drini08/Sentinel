import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JuryAccess, buildJuryAttackUrl } from "./JuryAccess";

describe("JuryAccess", () => {
  it("builds a stable attack path from the deployed Vercel origin", () => {
    expect(buildJuryAttackUrl("https://sentinel-demo.vercel.app/", "http://localhost:5173"))
      .toBe("https://sentinel-demo.vercel.app/attack");
  });

  it("shows the jury URL as a camera-independent fallback", () => {
    const api = {
      getStatus: vi.fn().mockResolvedValue({ active_run: null }),
      trigger: vi.fn(),
      reset: vi.fn(),
    };

    render(<JuryAccess api={api} publicUrl="https://sentinel-demo.vercel.app" />);

    expect(screen.getByText("https://sentinel-demo.vercel.app/attack")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open jury console/i })).toHaveAttribute(
      "href",
      "https://sentinel-demo.vercel.app/attack",
    );
  });
});
