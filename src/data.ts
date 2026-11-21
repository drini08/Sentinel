export type Incident = {
  id: string;
  title: string;
  service: string;
  severity: "Critical" | "High" | "Medium";
  status: "Protected" | "Investigating" | "Resolved";
  time: string;
  score: number;
  source: string;
  summary: string;
};

export const incidents: Incident[] = [
  {
    id: "INC-2026-041",
    title: "Unauthorized administrative access",
    service: "Dardania Water API",
    severity: "Critical",
    status: "Protected",
    time: "2 min ago",
    score: 94,
    source: "Session 8F2A-19C7",
    summary: "A valid employee session attempted a sequence of restricted control operations outside its established behavioral profile.",
  },
  {
    id: "INC-2026-040",
    title: "Abnormal request velocity",
    service: "Customer Services",
    severity: "High",
    status: "Investigating",
    time: "18 min ago",
    score: 81,
    source: "Session C11E-88A2",
    summary: "Request frequency exceeded the service baseline by 6.4× across three protected endpoints.",
  },
  {
    id: "INC-2026-039",
    title: "Repeated authentication failure",
    service: "Operations Portal",
    severity: "Medium",
    status: "Resolved",
    time: "1 hr ago",
    score: 62,
    source: "185.72.14.9",
    summary: "A remote client generated repeated authentication failures and was temporarily rate-limited.",
  },
];

export const services = [
  { name: "Dardania Water API", type: "Administrative API", status: "Protected", requests: "12.4k", latency: "28 ms", policies: 4 },
  { name: "Operations Portal", type: "Internal application", status: "Protected", requests: "4.8k", latency: "41 ms", policies: 3 },
  { name: "Customer Services", type: "Public API", status: "Protected", requests: "31.2k", latency: "33 ms", policies: 5 },
  { name: "Telemetry Gateway", type: "Ingestion service", status: "Observing", requests: "92.7k", latency: "17 ms", policies: 2 },
];

export const policies = [
  { name: "Privileged operation guard", description: "Require established behavior for administrative mutations.", scope: "Administrative APIs", enabled: true },
  { name: "Session velocity limit", description: "Contain sessions that exceed the adaptive request threshold.", scope: "All services", enabled: true },
  { name: "Credential anomaly review", description: "Escalate authentication from an unrecognized network or device.", scope: "Operator access", enabled: true },
  { name: "Automated session revocation", description: "Revoke critical-risk sessions without waiting for approval.", scope: "Risk score ≥ 90", enabled: false },
];

export const activity = [
  { time: "10:24:18", event: "Session protected", actor: "SENTINEL", service: "Dardania Water API", result: "Enforced" },
  { time: "10:24:16", event: "Suspicious request blocked", actor: "Gateway", service: "Dardania Water API", result: "Blocked" },
  { time: "10:24:11", event: "Risk threshold exceeded", actor: "Detection engine", service: "Dardania Water API", result: "Score 94" },
  { time: "10:23:57", event: "Administrative route requested", actor: "Session 8F2A-19C7", service: "Dardania Water API", result: "Observed" },
  { time: "10:21:03", event: "Policy configuration updated", actor: "A. Berisha", service: "Operations Portal", result: "Saved" },
  { time: "10:18:46", event: "Service health verified", actor: "SENTINEL", service: "Customer Services", result: "Healthy" },
];
