export function resolveApiBase(configured: string | undefined, production: boolean) {
  if (configured) return configured.replace(/\/$/, "");
  return production ? "" : "http://127.0.0.1:8000";
}
