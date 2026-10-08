# QAWolf Demo

Simple React front-end + TypeScript Express API for QAWolf Playwright testing.

## Structure

- `server/` — Express API, in-memory counter (`GET /api/state`, `POST /api/{increment,decrement,reset}`), port **3001**
- `web/` — Vite + React + TS UI with four buttons, port **5173**

## Run

```bash
npm run install:all   # installs root, server, and web deps
npm run dev           # runs API + web together
```

Then open http://localhost:5173.

## Test hooks (QAWolf / Playwright)

Every interactive and display element has a stable `data-testid`:

| Element        | testid            |
| -------------- | ----------------- |
| Counter value  | `counter-value`   |
| Last action    | `last-action`     |
| Increment      | `btn-increment`   |
| Decrement      | `btn-decrement`   |
| Reset          | `btn-reset`       |
| Refresh        | `btn-refresh`     |
| Error message  | `error`           |

## Configuration

| Var | Where | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | web build | API base URL (defaults to `http://localhost:3001`) |
| `PORT` | server | API port (default 3001) |
| `CORS_ORIGIN` | server | Comma-separated allowed origins (default: all) |
| `BASE_URL` | tests | URL under test; set to a deployed/preview URL for QAWolf |
| `PENDO_LIVE` | tests | `1` enables the live-agent network test |

Copy `web/.env.example` → `web/.env.local` to override locally.

## Pendo (installed by Novus)

This is a demo fixture: load it into **Novus**, which scans the repo and opens a PR
adding the Pendo agent + tagging. The app already calls `window.pendo.track("demo-<action>", props)`
via the seam in `web/src/App.tsx` — no code change needed once the agent is present
(it's a no-op until then):

| Event | Fires when | Properties |
| --- | --- | --- |
| `demo-load` | the initial `GET /api/state` succeeds (once per page load) | `counter`, `last_action` |
| `demo-increment` | `POST /api/increment` succeeds | `counter`, `previous_counter` |
| `demo-decrement` | `POST /api/decrement` succeeds | `counter`, `previous_counter` |
| `demo-reset` | `POST /api/reset` succeeds | `previous_counter` (the value cleared) |
| `demo-refresh` | Refresh re-fetches `GET /api/state` | `counter`, `previous_counter`, `counter_changed`, `last_action` |
| `demo-action-failed` | any of the API calls above fails | `action`, `error_type`, `error_message`, `http_status` (non-2xx only) |

## Tests

```bash
npm --prefix web install
npx --prefix web playwright install   # browser binaries, first run only
npm --prefix web test                 # auto-starts the app via webServer
```

- **Counter + Track Event tests** run with a `window.pendo` stub — no Pendo account needed.
- **Live network test** (`data.pendo.io`) is skipped unless `PENDO_LIVE=1` and the real agent is installed.
- For QAWolf against a deployed URL: `BASE_URL=https://your-preview-url npm --prefix web test`.
