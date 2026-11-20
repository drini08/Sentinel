import { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_SENTINEL_API_URL as string | undefined) ?? "http://127.0.0.1:8000";

export type RiskSignal = { code: string; label: string; score: number; evidence: string };
export type Detection = {
  assessment_id: string; event_id: string; created_at: string; risk_score: number;
  level: "low" | "medium" | "high" | "critical"; signals: RiskSignal[]; recommendation: string;
};
export type ApiIncident = {
  incident_id: string; created_at: string; title: string; service_id: string; session_id: string;
  status: "active" | "contained" | "investigating" | "resolved"; risk: Detection; summary: string;
};
export type FirewallRule = {
  rule_id: string; target_type: "ip" | "endpoint" | "ip_endpoint"; target_value: string;
  action: "block" | "rate_limit"; justification: string; created_at: string; expires_at: string;
  status: "active" | "expired" | "removed" | "rolled_back"; incident_id?: string; created_by: string;
};
export type Session = { session_id: string; user_id: string; trusted_source_ip: string; trusted_device_id: string; status: "active" | "restricted" | "revoked" };
export type ProtectedService = { service_id: string; name: string; service_type: string; base_url: string; health_path: string; essential_paths: string[]; status: "healthy" | "degraded" | "unavailable"; latency_ms: number; enabled: boolean };
export type HealthCheck = { check_id: string; service_id: string; checked_at: string; status: string; response_time_ms: number; transaction_succeeded: boolean; rule_id?: string; detail: string };
export type AuditEntry = { audit_id: string; timestamp: string; category: string; action: string; actor: string; entity_type: string; entity_id: string; outcome: string; detail: string };
export type Dashboard = { generated_at: string; protected_services: number; healthy_services: number; active_incidents: number; critical_incidents: number; active_rules: number; restricted_sessions: number; continuity_ok: boolean; recent_incidents: ApiIncident[]; recent_audit: AuditEntry[] };
export type Policy = { policy_id: string; name: string; description: string; enabled: boolean; moderate_threshold: number; high_threshold: number; critical_threshold: number; automatic_containment: boolean; require_corroboration: boolean; updated_at: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? `SENTINEL API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function usePolling<T>(path: string, fallback: T, interval = 5000) {
  const [data, setData] = useState<T>(fallback);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await request<T>(path));
      setConnected(true);
      setError(null);
    } catch (reason) {
      setConnected(false);
      setError(reason instanceof Error ? reason.message : "API unavailable");
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), interval);
    return () => window.clearInterval(timer);
  }, [interval, refresh]);
  return { data, connected, error, refresh };
}

const operatorHeaders = { "X-Operator-Role": "operator", "X-Operator-Id": "console-operator" };

export const sentinelApi = {
  createRule: (payload: { target_type: string; target_value: string; action: string; justification: string; duration_seconds: number; simulate_continuity_failure?: boolean }) =>
    request<FirewallRule>("/api/v1/firewall/rules", { method: "POST", headers: operatorHeaders, body: JSON.stringify(payload) }),
  removeRule: (ruleId: string) => request<FirewallRule>(`/api/v1/firewall/rules/${ruleId}?reason=Manual%20operator%20override`, { method: "DELETE", headers: operatorHeaders }),
  controlSession: (sessionId: string, action: "revoke" | "restore", reason: string) =>
    request<Session>(`/api/v1/sessions/${sessionId}/${action}`, { method: "POST", headers: operatorHeaders, body: JSON.stringify({ reason }) }),
  updateIncident: (incidentId: string, status: ApiIncident["status"]) =>
    request<ApiIncident>(`/api/v1/incidents/${incidentId}`, { method: "PATCH", headers: operatorHeaders, body: JSON.stringify({ status }) }),
  updatePolicy: (policyId: string, changes: Partial<Policy>) =>
    request<Policy>(`/api/v1/policies/${policyId}`, { method: "PATCH", headers: operatorHeaders, body: JSON.stringify(changes) }),
  runRollbackDemo: () => request<FirewallRule>("/api/v1/simulations/rollback", { method: "POST" }),
  runHealthCheck: () => request<HealthCheck>("/api/v1/health-checks/run", { method: "POST", headers: operatorHeaders }),
};
