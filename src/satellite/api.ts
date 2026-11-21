import { resolveApiBase } from "../apiBase";
import type { SatelliteAnalysisRequest, SatelliteAnalysisResult, SatelliteApi, SatelliteStatus } from "./types";

const apiBase = resolveApiBase(import.meta.env.VITE_SENTINEL_API_URL as string | undefined, import.meta.env.PROD);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Satellite service returned ${response.status}`);
  return response.json() as Promise<T>;
}

export const satelliteApi: SatelliteApi = {
  getStatus: () => request<SatelliteStatus>("/api/v1/satellite/status"),
  analyze: (payload: SatelliteAnalysisRequest) => request<SatelliteAnalysisResult>("/api/v1/satellite/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
