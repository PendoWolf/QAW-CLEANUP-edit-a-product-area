import { useEffect, useRef, useState } from "react";
import { api, ApiError, type AppState } from "./api";

// What run() can do. A success fires the Track Event `demo-<action>`; a failure
// fires `demo-action-failed` instead, with the action as a property.
type CounterAction = "load" | "increment" | "decrement" | "reset" | "refresh";

type TrackProps = Record<string, string | number | boolean>;

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a Track Event for each action. No-op when the agent
// isn't present (local dev), so the app and Playwright mocks both stay simple.
function trackEvent(name: CounterAction | "action-failed", props: TrackProps) {
  if (typeof window !== "undefined") {
    try {
      window.pendo?.track?.(`demo-${name}`, props);
    } catch {
      // Analytics must never break the counter.
    }
  }
}

// Properties for a successful action. `previous` is the state that was on
// screen until `next` (the server's response) replaced it. The counter is one
// global value shared by every visitor, so others can move it in between.
function successProps(action: CounterAction, previous: AppState, next: AppState): TrackProps {
  switch (action) {
    case "load":
      return { counter: next.counter, last_action: next.lastAction };
    case "increment":
    case "decrement":
      return { counter: next.counter, previous_counter: previous.counter };
    case "reset":
      // The server always returns 0, so the value that was cleared is what matters.
      return { previous_counter: previous.counter };
    case "refresh":
      return {
        counter: next.counter,
        previous_counter: previous.counter,
        counter_changed: next.counter !== previous.counter,
        last_action: next.lastAction,
      };
  }
}

// Properties for demo-action-failed. error_type separates the failure modes:
// TypeError is a network/CORS failure in fetch, Error a non-2xx response (see
// http_status), and SyntaxError a response body that wasn't JSON.
function failureProps(action: CounterAction, e: unknown): TrackProps {
  const err = e as Error;
  const props: TrackProps = {
    action,
    error_type: err.name,
    error_message: err.message.slice(0, 100),
  };
  if (err instanceof ApiError) props.http_status = err.status;
  return props;
}

// React StrictMode runs the mount effect twice in development builds. Kept at
// module level so it survives that remount: the initial load is reported once
// per page load.
let initialLoadReported = false;

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);
  // Mirrors `state` synchronously, so each response is compared with the one
  // it replaces even when clicks outpace re-renders.
  const shown = useRef(state);

  const run = async (name: CounterAction, fn: () => Promise<AppState>, track = true) => {
    try {
      setError(null);
      const next = await fn();
      const previous = shown.current;
      shown.current = next;
      setState(next);
      if (track) trackEvent(name, successProps(name, previous, next));
    } catch (e) {
      setError((e as Error).message);
      if (track) trackEvent("action-failed", failureProps(name, e));
    }
  };

  useEffect(() => {
    run("load", api.getState, !initialLoadReported);
    initialLoadReported = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>QAWolf Demo</h1>

      <p data-testid="counter-value" style={{ fontSize: "3rem", margin: "1rem 0" }}>
        {state.counter}
      </p>
      <p data-testid="last-action" style={{ color: "#666" }}>
        Last action: {state.lastAction}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button data-testid="btn-increment" onClick={() => run("increment", api.increment)}>
          Increment
        </button>
        <button data-testid="btn-decrement" onClick={() => run("decrement", api.decrement)}>
          Decrement
        </button>
        <button data-testid="btn-reset" onClick={() => run("reset", api.reset)}>
          Reset
        </button>
        <button data-testid="btn-refresh" onClick={() => run("refresh", api.getState)}>
          Refresh
        </button>
      </div>

      {error && (
        <p data-testid="error" style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}
    </main>
  );
}
