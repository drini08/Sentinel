import { afterEach, describe, expect, it, vi } from "vitest";
import { facilityApi } from "./api";
import type { FacilitySnapshot } from "./types";

const snapshot: FacilitySnapshot = {
  revision: 4,
  generated_at: "2026-11-13T14:00:00Z",
  assets: [
    {
      id: "reservoir-a",
      name: "Reservoir A",
      asset_type: "reservoir",
      status: "operational",
      security_status: "secure",
      position: [4.2, 1.2, -4],
      metrics: { level_percent: 72, outflow_m3s: 2.1 },
      supported_commands: ["isolate", "set_target"],
    },
  ],
  connections: [],
};

describe("facilityApi", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("maps the snapshot endpoint response", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(facilityApi.getSnapshot()).resolves.toEqual(snapshot);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/facility/snapshot",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it("aborts telemetry requests that stall", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      }),
    ));

    const pending = expect(facilityApi.getSnapshot()).rejects.toThrow("Facility telemetry request timed out.");
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
  });

  it("sends operator context with an asset command", async () => {
    const result = { applied: true, asset: snapshot.assets[0], decision: { allowed: true } };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await facilityApi.executeCommand("reservoir-a", {
      command: { action: "isolate", value: true },
      session: {
        session_id: "session-operator-11bd",
        user_id: "operator-221",
        source_ip: "10.20.0.21",
        device_id: "DWS-OPS-11",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/facility/assets/reservoir-a/commands",
      expect.objectContaining({ method: "POST", body: expect.stringContaining('"action":"isolate"') }),
    );
  });

  it("surfaces typed API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Unsupported command" }), { status: 422 })),
    );

    await expect(facilityApi.reset()).rejects.toThrow("Unsupported command");
  });
});
