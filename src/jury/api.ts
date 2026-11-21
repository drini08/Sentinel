import type { JuryApi, JuryRun, JuryScenario, JuryStatus } from "./types";
import { resolveApiBase } from "../apiBase";

const apiBase = resolveApiBase(import.meta.env.VITE_SENTINEL_API_URL as string | undefined, import.meta.env.PROD);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? `Attack service returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const juryApi: JuryApi = {
  trigger: (scenario: JuryScenario, requestId?: string) =>
    request<JuryRun>("/api/v1/jury/attacks", { method: "POST", body: JSON.stringify({ scenario, request_id: requestId }) }),
  getStatus: () => request<JuryStatus>("/api/v1/jury/status"),
  getRun: (runId: string) => request<JuryRun>(`/api/v1/jury/runs/${encodeURIComponent(runId)}`),
  reset: () => request<JuryStatus>("/api/v1/jury/reset", {
    method: "POST",
    headers: { "X-Operator-Role": "operator", "X-Operator-Id": "console-operator" },
  }),
};
