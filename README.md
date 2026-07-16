# ⚽ Matchday Copilot

**A GenAI-enabled stadium operations & fan experience platform for FIFA World Cup 2026.**

Matchday Copilot puts one AI layer between live stadium telemetry and the three groups who need it most: **venue staff & organizers**, **fans**, and **volunteers**. It uses Claude (Anthropic) for real-time decision support, multilingual assistance, and accessible AI wayfinding.

---

## The problem

World Cup 2026 is the largest edition ever — 48 teams, 104 matches, and stadiums hosting 80,000+ fans speaking dozens of languages. On matchday, three things break down at scale:

1. **Operations teams drown in raw telemetry** — sector densities, gate queues, incidents, weather, transit delays — with no time to synthesize it into decisions.
2. **Fans can't get answers** — signage is static, staff are overloaded, and most fans don't speak the host country's language.
3. **Navigation excludes people** — standard wayfinding ignores step-free needs, sensory rooms, prayer rooms, and live congestion.

## The solution

One app, three GenAI surfaces, all grounded in the same venue knowledge base and live telemetry:

| Surface | For | What the AI does |
|---|---|---|
| **Ops Command** | Organizers & venue staff | Claude reads a live telemetry snapshot (sector occupancy, gate queues, incidents, match context) and returns a structured **decision brief**: risk level + 3–5 prioritized, immediately executable actions with rationale |
| **Fan Concierge** | Fans & volunteers | Multilingual chat assistant — auto-detects and replies in the fan's language. Strictly grounded in venue data (gates, facilities, food queues, transit, sustainability program) so it never invents locations |
| **Navigate** | Everyone, incl. accessibility needs | AI wayfinding between any two points, with a **step-free toggle** (elevators/ramps only). Uses live queue data to add crowd-avoidance tips |

### Hackathon themes covered
✅ Real-time decision support & operational intelligence · ✅ Crowd management · ✅ Multilingual assistance · ✅ Navigation · ✅ Accessibility · ✅ Sustainability (zero-waste guidance, transit promotion) · ✅ Transportation (transit-aware gates & tips)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React client (Vite)                                    │
│  ┌────────────┐ ┌───────────────┐ ┌──────────────┐      │
│  │ Ops Command│ │ Fan Concierge │ │   Navigate   │      │
│  └─────┬──────┘ └──────┬────────┘ └──────┬───────┘      │
│        │  live bowl map│  chat UI        │ route UI     │
│        └───────────────┼─────────────────┘              │
│               POST /api/ai  { kind, messages, system }  │
└────────────────────────┼────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Express server (Node)                                  │
│  • /api/ai  → Anthropic Messages API (claude-sonnet)    │
│  • Demo mode fallback when no API key is set            │
│  • API key stays server-side (never in the browser)     │
└────────────────────────┬────────────────────────────────┘
                         ▼
              Anthropic API (Claude)
```

**Telemetry:** in this prototype, sector occupancy, gate queues and incidents are simulated with a random-walk generator (5s tick). In production these feeds come from turnstile counts, CV-based crowd counting, ticket scans and transit APIs — the AI layer is unchanged, since Claude just receives a JSON snapshot and returns structured JSON decisions.

**Hallucination guard:** the concierge and router prompts inject the full venue knowledge base and instruct the model to answer strictly from it — critical for a safety-relevant venue assistant.

---

## Running it

Requires Node 18+.

```bash
npm run install:all     # installs server + client deps
npm run dev             # server on :3001, client on :5173
```

Open http://localhost:5173

**Demo mode (zero setup):** with no API key, the server returns realistic canned AI responses so all three surfaces are fully clickable.

**Live AI mode:** copy `.env.example` to `.env` and set your key:

```bash
cp .env.example .env
# edit .env → ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

**Production build:**

```bash
npm run build
npm start               # serves the built client + API on :3001
```

---

## Project structure

```
matchday-copilot/
├── client/                 # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js      # proxies /api → :3001 in dev
│   └── src/
│       ├── main.jsx
│       └── App.jsx         # all three surfaces + stadium bowl SVG
├── server/
│   ├── index.js            # Express API proxy + static hosting
│   └── demoMode.js         # canned responses when no API key
├── docs/
│   └── SOLUTION.md         # detailed solution write-up
├── .env.example
├── package.json
└── README.md
```

---

## Roadmap

- Voice input for the concierge (hands-free in loud environments)
- WhatsApp/SMS channel for fans without the app
- Continuous AI situational briefs streamed to the command center on an interval
- Real telemetry connectors (turnstiles, CV crowd counting, GTFS transit feeds)
- Per-stadium knowledge packs for all 16 WC26 venues (config-only swap)

## License

MIT
