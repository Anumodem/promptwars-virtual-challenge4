# Matchday Copilot — Solution Write-up

## Problem statement addressed

> Build a GenAI-enabled solution that enhances stadium operations and the overall tournament experience for fans, organizers, volunteers, or venue staff — improving navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence, or real-time decision support during the FIFA World Cup 2026.

## Why one platform instead of three apps

Fans, volunteers and ops staff all need answers derived from the **same live state** of the venue. Splitting them into separate tools duplicates the data layer and lets the answers drift apart. Matchday Copilot keeps a single grounding layer — the venue knowledge base + live telemetry snapshot — and puts three role-specific GenAI surfaces on top of it.

## How Generative AI is used (not just a chatbot)

1. **Structured decision generation (Ops Command).** Claude receives a raw telemetry JSON (sector occupancy %, gate queue minutes, throughput, incident feed, match context) and must return a strict JSON schema: situation summary, risk level, and 3–5 prioritized actions each with an owning team and a one-line rationale. This is real-time decision support: the model performs the synthesis a duty manager would do under time pressure, and the structured output renders directly as actionable cards.

2. **Grounded multilingual assistance (Fan Concierge).** The system prompt injects the entire venue knowledge base (gates → sectors → transit, facilities, food stands with live queue times, sustainability program, accessibility infrastructure) and instructs the model to (a) always reply in the fan's language, (b) never invent locations, (c) escalate medical mentions to the nearest steward + first aid point, and (d) promote sustainable choices when relevant. Language detection, translation, retrieval and tone all come from the model — no per-language content authoring.

3. **Constraint-aware wayfinding (Navigate).** Claude plans routes over a described venue graph (sector ring, gate mappings, elevators/ramps) with two dynamic constraints: an optional hard step-free requirement, and live gate-queue data used to generate a crowd-avoidance tip. Output is again strict JSON (ETA, step-free flag, steps, tip).

## Engineering decisions

- **Backend proxy, not browser-side keys.** The client calls `POST /api/ai`; the Express server holds the Anthropic key. Nothing sensitive ships to the browser.
- **Demo mode.** If no `ANTHROPIC_API_KEY` is configured, the server returns canned responses matching the exact live-mode shapes. Judges can clone → `npm run dev` → click everything with zero setup.
- **Simulated telemetry with a real interface.** The random-walk generator produces the same JSON snapshot shape a production ingest (turnstiles, CV crowd counting, ticketing, GTFS) would. Swapping in real feeds does not touch the AI layer.
- **One venue object.** All grounding lives in a single `VENUE` constant. Onboarding another WC26 stadium is a config change, not a code change.

## Impact mapping to hackathon themes

| Theme | Where |
|---|---|
| Real-time decision support | Ops Command AI brief |
| Operational intelligence | Telemetry synthesis, incident-aware actions |
| Crowd management | Density bowl map, gate rebalancing recommendations, congestion-aware routing |
| Multilingual assistance | Concierge auto language matching |
| Navigation | AI wayfinding with live-queue tips |
| Accessibility | Step-free routing, accessible gate/seating/sensory-room knowledge |
| Transportation | Gate↔transit mapping, egress/weather-aware transit advice |
| Sustainability | Refill stations, cup deposit scheme, free-transit promotion in answers |

## Known limitations (prototype)

- Telemetry is simulated; no persistence layer.
- Venue graph is coarse (sector ring granularity) — production wayfinding would use an indoor map graph (e.g., IMDF) with the LLM narrating over a deterministic pathfinder.
- No auth/roles; Ops Command would be gated to staff in production.
