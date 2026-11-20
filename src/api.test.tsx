import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { sentinelApi, usePolling } from "./api";

afterEach(() => vi.restoreAllMocks());

it("polls backend data and reports a connected state", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify([{ rule_id: "rule-1" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const { result } = renderHook(() => usePolling("/api/v1/firewall/rules", [], 60_000));

  await waitFor(() => expect(result.current.connected).toBe(true));
  expect(result.current.data).toEqual([{ rule_id: "rule-1" }]);
});

it("sends explicit simulation operator identity on mutations", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ rule_id: "rule-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  await sentinelApi.createRule({
    target_type: "ip",
    target_value: "203.0.113.44",
    action: "block",
    justification: "Confirmed synthetic source.",
    duration_seconds: 900,
  });

  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(headers.get("X-Operator-Role")).toBe("operator");
  expect(headers.get("X-Operator-Id")).toBe("console-operator");
});

it("authorizes the rollback simulation as an operator mutation", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ rule_id: "rule-rollback" }), { status: 200 }),
  );

  await sentinelApi.runRollbackDemo();

  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(headers.get("X-Operator-Role")).toBe("operator");
  expect(headers.get("X-Operator-Id")).toBe("console-operator");
});

it("surfaces FastAPI detail when a mutation is rejected", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ detail: "Infrastructure-wide rules are prohibited" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    }),
  );

  await expect(sentinelApi.createRule({
    target_type: "ip",
    target_value: "0.0.0.0/0",
    action: "block",
    justification: "Rejected test rule.",
    duration_seconds: 900,
  })).rejects.toThrow("Infrastructure-wide rules are prohibited");
});
