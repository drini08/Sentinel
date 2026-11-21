import type {
  FacilityApi,
  FacilityCommandRequest,
  FacilityCommandResult,
  FacilityScenarioResult,
  FacilitySnapshot,
} from "./types";
import { resolveApiBase } from "../apiBase";

const apiBase = resolveApiBase(import.meta.env.VITE_SENTINEL_API_URL as string | undefined, import.meta.env.PROD);
const operatorHeaders = { "X-Operator-Role": "operator", "X-Operator-Id": "console-operator" };

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `SENTINEL request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const facilityApi: FacilityApi = {
  getSnapshot: () => request<FacilitySnapshot>("/api/v1/facility/snapshot"),
  executeCommand: (assetId: string, body: FacilityCommandRequest) =>
    request<FacilityCommandResult>(`/api/v1/facility/assets/${assetId}/commands`, { method: "POST", body }),
  reset: () => request<FacilitySnapshot>("/api/v1/facility/reset", { method: "POST", headers: operatorHeaders }),
  runScenario: () =>
    request<FacilityScenarioResult>("/api/v1/facility/scenarios/compromised-operator", { method: "POST", headers: operatorHeaders }),
};
