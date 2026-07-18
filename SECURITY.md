# Security Policy

## Threat model & mitigations

| Threat | Mitigation |
|---|---|
| API key exposure | Key exists only in server-side env (`.env` locally, platform env vars in deployment); never bundled into the client, never committed (`.gitignore`) |
| Prompt injection via API | `server/validate.js` whitelists request kinds and message roles — client-supplied `system` roles are rejected; payloads are normalized so unknown fields are never forwarded upstream |
| Abuse / cost attacks | Per-IP rate limiting (30 AI calls/min) on the only expensive endpoint; message count and size caps; 200 kB body limit |
| XSS / injection in the UI | React's default escaping everywhere; no `dangerouslySetInnerHTML`; restrictive Content-Security-Policy via helmet |
| Information disclosure | `x-powered-by` disabled; upstream error details logged server-side but only safe messages returned to clients; central error handler prevents stack traces leaking |
| Cross-origin abuse | CORS restricted to the dev origin; production is same-origin |

## Reporting a vulnerability

Open a GitHub issue with the label `security`, or contact the maintainer directly.
Please do not disclose details publicly until a fix is released.

## Secrets hygiene

- Never commit `.env`. Rotate any key that is ever exposed (Anthropic Console → API Keys → revoke + recreate).
- CI does not require or receive any secrets; tests mock the AI upstream.
