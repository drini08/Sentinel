import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFacility } from "./useFacility";
import type { FacilityApi, FacilitySnapshot } from "./types";

const snapshot: FacilitySnapshot = {
  revision: 1,
  generated_at: "2026-11-13T14:00:00Z",
  assets: [
    {
      id: "reservoir-a",
      name: "Reservoir A",
      asset_type: "reservoir",
      status: "operational",
      security_status: "secure",
      position: [4.2, 1.2, -4],
      metrics: { level_percent: 72 },
      supported_commands: ["isolate"],
    },
  ],
  connections: [],
};

function createApi(getSnapshot = vi.fn().mockResolvedValue(snapshot)): FacilityApi {
  return {
    getSnapshot,
    executeCommand: vi.fn(),
    reset: vi.fn().mockResolvedValue(snapshot),
    runScenario: vi.fn(),
  };
}

describe("useFacility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a snapshot and exposes selected authoritative asset state", async () => {
    const api = createApi();
    const { result } = renderHook(() => useFacility({ api, pollMs: 60_000 }));

    await waitFor(() => expect(result.current.snapshot).toEqual(snapshot));
    act(() => result.current.selectAsset("reservoir-a"));

    expect(result.current.selectedAsset?.name).toBe("Reservoir A");
    expect(result.current.isStale).toBe(false);
  });

  it("keeps the last snapshot and marks it stale when refresh fails", async () => {
    vi.useFakeTimers();
    const getSnapshot = vi
      .fn()
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("offline"));
    const api = createApi(getSnapshot);
    const { result } = renderHook(() => useFacility({ api, pollMs: 1000 }));

    await act(async () => Promise.resolve());
    expect(result.current.snapshot).toEqual(snapshot);
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(result.current.snapshot).toEqual(snapshot);
    expect(result.current.isStale).toBe(true);
    expect(result.current.error).toBe("offline");
  });
});
