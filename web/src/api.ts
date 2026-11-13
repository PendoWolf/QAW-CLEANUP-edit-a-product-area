// API base URL. Defaults to the local server; override via VITE_API_URL for
// deployed/preview environments (QAWolf runs against whatever URL this points at).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AppState {
  counter: number;
  lastAction: string;
}

// Pass the Pendo visitor and account IDs (set in main.tsx) so the server can
// attribute its Track Events to the same visitor and account.
function pendoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const visitorId = localStorage.getItem("demo-visitor-id");
  const accountId = localStorage.getItem("demo-account-id");
  if (visitorId) headers["X-Pendo-Visitor-Id"] = visitorId;
  if (accountId) headers["X-Pendo-Account-Id"] = accountId;
  return headers;
}

async function call(path: string, method: "GET" | "POST"): Promise<AppState> {
  const res = await fetch(`${BASE}${path}`, { method, headers: pendoHeaders() });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.json() as Promise<AppState>;
}

export const api = {
  getState: () => call("/api/state", "GET"),
  increment: () => call("/api/increment", "POST"),
  decrement: () => call("/api/decrement", "POST"),
  reset: () => call("/api/reset", "POST"),
};
