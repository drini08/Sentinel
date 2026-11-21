import { resolveApiBase } from "../apiBase";
import type { VisualInspectionRequest, VisualInspectionResult, VisualInspectionStatus } from "./types";

const apiBase = resolveApiBase(import.meta.env.VITE_SENTINEL_API_URL as string | undefined, import.meta.env.PROD);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Visual inspection returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const visualInspectionApi = {
  getStatus: () => request<VisualInspectionStatus>("/api/v1/visual-inspection/status"),
  analyze: (payload: VisualInspectionRequest) => request<VisualInspectionResult>("/api/v1/visual-inspection/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};

