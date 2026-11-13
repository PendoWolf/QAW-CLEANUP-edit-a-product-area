import type { Request } from "express";

// Server-side Pendo Track Events, sent to the Pendo Track API.
// The integration key is a secret, so it is read from the environment and
// never committed. Tracking is skipped when PENDO_TRACK_EVENT_SECRET is unset
// (e.g. local dev), and failures are logged without affecting the response.
const PENDO_DATA_HOST = process.env.PENDO_DATA_HOST ?? "data.pendo-dev.pendo-dev.com";
const PENDO_TRACK_EVENT_SECRET = process.env.PENDO_TRACK_EVENT_SECRET;

type TrackProperties = Record<string, string | number | boolean>;

// The web app sends the Pendo visitor and account IDs it initialized the
// agent with, so server events are attributed to the same visitor/account.
const headerValue = (req: Request, name: string) => {
  const value = req.get(name)?.trim();
  return value ? value : undefined;
};

export function trackServerEvent(req: Request, event: string, properties: TrackProperties = {}) {
  if (!PENDO_TRACK_EVENT_SECRET) return;

  const body = {
    type: "track",
    event,
    visitorId: headerValue(req, "x-pendo-visitor-id") ?? "system",
    accountId: headerValue(req, "x-pendo-account-id") ?? "system",
    timestamp: Date.now(),
    properties,
    context: {
      userAgent: req.get("user-agent") ?? "",
      url: req.originalUrl,
    },
  };

  // Fire-and-forget: never block or fail the API response on tracking.
  fetch(`https://${PENDO_DATA_HOST}/data/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": PENDO_TRACK_EVENT_SECRET,
    },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) console.error(`Pendo track "${event}" failed: ${res.status}`);
    })
    .catch((err: unknown) => {
      console.error(`Pendo track "${event}" failed:`, err);
    });
}
