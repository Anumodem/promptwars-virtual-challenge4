import React, { useState, useEffect, useRef, useCallback } from "react";

// ────────────────────────────────────────────────────────────────────────────
// MATCHDAY COPILOT — GenAI stadium operations & fan experience for FIFA WC 2026
// Three surfaces in one tool:
//   1. Ops Command   — live crowd telemetry + Claude-generated decision briefs
//   2. Fan Concierge — multilingual GenAI assistant grounded in venue knowledge
//   3. Navigate      — AI wayfinding with step-free (accessible) routing
// All AI features call the Anthropic API (claude-sonnet-4-6).
// ────────────────────────────────────────────────────────────────────────────

// ── Design tokens ───────────────────────────────────────────────────────────
const T = {
  ink: "#0D1321",
  panel: "#161E2E",
  panelHi: "#1D2740",
  line: "#2A3550",
  chalk: "#EDF1F7",
  dim: "#8A96AD",
  green: "#2FBF71",
  amber: "#F2A93B",
  red: "#E8503A",
  blue: "#4E8EF7",
  mono: "'SFMono-Regular', ui-monospace, 'Cascadia Mono', Menlo, monospace",
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// ── Venue knowledge base (grounding data passed to Claude) ──────────────────
const VENUE = {
  name: "Estadio Azteca — FIFA World Cup 2026",
  city: "Mexico City",
  sectors: ["A", "B", "C", "D", "E", "F", "G", "H"],
  gates: [
    { id: "Gate 1", serves: ["A", "B"], nearestTransit: "Metro Line 2 — Azteca station, 400m" },
    { id: "Gate 2", serves: ["B", "C"], nearestTransit: "Shuttle bus stop S2, 150m" },
    { id: "Gate 3", serves: ["C", "D"], nearestTransit: "Tren Ligero Estadio Azteca, 250m" },
    { id: "Gate 4", serves: ["E", "F"], nearestTransit: "Rideshare zone R1, 300m" },
    { id: "Gate 5", serves: ["F", "G"], nearestTransit: "Shuttle bus stop S5, 200m" },
    { id: "Gate 6", serves: ["G", "H"], nearestTransit: "Accessible drop-off + Metro elevator, 100m" },
  ],
  facilities: [
    { name: "First aid", locations: ["Concourse near Sector B", "Concourse near Sector F"] },
    { name: "Prayer / quiet room", locations: ["Level 2, behind Sector D"] },
    { name: "Family & nursing room", locations: ["Level 1, Sector A concourse"] },
    { name: "Accessible seating platforms", locations: ["Sectors C and G, level access from Gate 6"] },
    { name: "Water refill stations", locations: ["Every sector concourse — free, part of zero-waste program"] },
    { name: "Lost & found", locations: ["Gate 3 services desk"] },
    { name: "Sensory room", locations: ["Level 2, Sector H"] },
  ],
  food: [
    { stand: "Tacos al Pastor", sector: "B", avgQueueMin: 12 },
    { stand: "Tortas & Aguas Frescas", sector: "D", avgQueueMin: 6 },
    { stand: "World Fan Kitchen (veg/halal)", sector: "F", avgQueueMin: 8 },
    { stand: "Café & Churros", sector: "G", avgQueueMin: 4 },
  ],
  sustainability:
    "Zero single-use plastic. Cup deposit scheme (returns at every gate). Free water refills. Public transit is free with a match ticket for 4 hours before/after kickoff.",
  accessibility:
    "Gate 6 is the step-free entrance with elevators to all levels. Accessible platforms in Sectors C and G. Sensory room in Sector H. Volunteers in orange vests can assist; ask any of them.",
  stepFreePaths:
    "Step-free circulation runs along the Level 1 concourse ring. Elevators at Gates 3 and 6. Ramps between Sectors C–D and G–H.",
};

// ── Simulated telemetry (in production: ingested from turnstiles, CV crowd
//    counting, ticketing, and transit APIs) ─────────────────────────────────
const initialSectors = () =>
  VENUE.sectors.map((id, i) => ({
    id,
    occupancy: [62, 78, 91, 84, 55, 88, 70, 47][i],
    capacity: 10800,
  }));

const initialGates = () =>
  VENUE.gates.map((g, i) => ({
    ...g,
    queueMin: [4, 18, 9, 26, 7, 3][i],
    throughputPerMin: [42, 21, 35, 15, 39, 44][i],
  }));

const INCIDENT_POOL = [
  { sev: "info", text: "Shuttle S5 running 6 min behind schedule" },
  { sev: "warn", text: "Turnstile 4C offline at Gate 4 — manual scanning in effect" },
  { sev: "info", text: "Halftime in 12 minutes — concourse surge expected" },
  { sev: "warn", text: "Sector C concourse congestion above threshold" },
  { sev: "crit", text: "Medical assist requested, Sector F row 22" },
  { sev: "info", text: "Rain expected 21:30 — covered walkway to Metro advised" },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const densColor = (p) => (p >= 85 ? T.red : p >= 70 ? T.amber : T.green);

// ── AI helper: calls our backend, which proxies to the Anthropic API ────────
// kind: "brief" | "chat" | "route" (lets the server pick demo responses too)
async function askClaude(kind, messages, system, expectJson = false) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, messages, system }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `AI request failed (${res.status})`);
  }
  const data = await res.json();
  const text = data.text || "";
  if (!expectJson) return text;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Shared UI atoms ─────────────────────────────────────────────────────────
const Eyebrow = ({ children, color = T.dim }) => (
  <div
    style={{
      fontFamily: T.mono,
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color,
      marginBottom: 6,
    }}
  >
    {children}
  </div>
);

const Panel = ({ children, style }) => (
  <div
    style={{
      background: T.panel,
      border: `1px solid ${T.line}`,
      borderRadius: 10,
      padding: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 12,
      height: 12,
      border: `2px solid ${T.line}`,
      borderTopColor: T.blue,
      borderRadius: "50%",
      animation: "mdcspin 0.8s linear infinite",
      verticalAlign: "-2px",
    }}
  />
);

// ── Stadium bowl (signature element): live sector density map ───────────────
function StadiumBowl({ sectors, selected, onSelect }) {
  const cx = 200, cy = 150, rOuter = 130, rInner = 78;
  const n = sectors.length;
  const arcs = sectors.map((s, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + 0.03;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - 0.03;
    const p = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(a0, rOuter);
    const [x1, y1] = p(a1, rOuter);
    const [x2, y2] = p(a1, rInner);
    const [x3, y3] = p(a0, rInner);
    const mid = (a0 + a1) / 2;
    const [lx, ly] = p(mid, (rOuter + rInner) / 2);
    return { s, lx, ly, d: `M${x0},${y0} A${rOuter},${rOuter} 0 0 1 ${x1},${y1} L${x2},${y2} A${rInner},${rInner} 0 0 0 ${x3},${y3} Z` };
  });
  return (
    <svg viewBox="0 0 400 300" style={{ width: "100%", maxWidth: 460, display: "block", margin: "0 auto" }} role="img" aria-label="Stadium sector density map">
      <ellipse cx={cx} cy={cy} rx={64} ry={44} fill="#12331F" stroke="#1F5A36" strokeWidth="2" />
      <rect x={cx - 10} y={cy - 44} width={20} height={88} fill="none" stroke="#1F5A36" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={12} fill="none" stroke="#1F5A36" strokeWidth="1.5" />
      {arcs.map(({ s, d, lx, ly }) => (
        <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: "pointer" }}>
          <path
            d={d}
            fill={densColor(s.occupancy)}
            fillOpacity={selected === s.id ? 0.95 : 0.55}
            stroke={selected === s.id ? T.chalk : T.ink}
            strokeWidth={selected === s.id ? 2 : 1.5}
          />
          <text x={lx} y={ly + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={T.ink} fontFamily={T.mono}>
            {s.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── TAB 1 · Ops Command ─────────────────────────────────────────────────────
function OpsCommand({ sectors, gates, incidents }) {
  const [selected, setSelected] = useState("C");
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const generateBrief = async () => {
    setLoading(true);
    setErr("");
    try {
      const telemetry = {
        timestamp: new Date().toISOString(),
        sectors: sectors.map((s) => ({ sector: s.id, occupancyPct: s.occupancy })),
        gates: gates.map((g) => ({ gate: g.id, queueMinutes: g.queueMin, throughputPerMin: g.throughputPerMin })),
        activeIncidents: incidents.map((i) => `${i.sev.toUpperCase()}: ${i.text}`),
        context: "Second half in progress. Full egress expected in ~50 minutes. Rain possible at 21:30.",
      };
      const result = await askClaude(
        "brief",
        [
          {
            role: "user",
            content:
              `You are the operational intelligence layer of a FIFA World Cup 2026 stadium command center at ${VENUE.name}. ` +
              `Analyze this live telemetry and return ONLY a JSON object (no markdown, no preamble) with this exact shape:\n` +
              `{"summary": "2 sentence situation summary", "riskLevel": "low|moderate|high", "actions": [{"priority": 1, "team": "which team acts", "action": "specific instruction", "why": "one-line rationale"}]}\n` +
              `Give 3 to 5 actions, concrete and immediately executable (redirect flows to specific gates/sectors, staffing moves, signage/PA changes, transit coordination). ` +
              `Telemetry: ${JSON.stringify(telemetry)}`,
          },
        ],
        "You are a stadium operations decision-support AI. Respond only with valid JSON.",
        true
      );
      setBrief(result);
    } catch (e) {
      setErr("Couldn't generate the brief. Try again.");
    }
    setLoading(false);
  };

  const sel = sectors.find((s) => s.id === selected);
  const sevColor = { info: T.blue, warn: T.amber, crit: T.red };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 16 }} className="mdc-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Panel>
          <Eyebrow>Live bowl · crowd density</Eyebrow>
          <StadiumBowl sectors={sectors} selected={selected} onSelect={setSelected} />
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, fontFamily: T.mono, fontSize: 11, color: T.dim }}>
            <span><span style={{ color: T.green }}>■</span> &lt;70%</span>
            <span><span style={{ color: T.amber }}>■</span> 70–85%</span>
            <span><span style={{ color: T.red }}>■</span> &gt;85%</span>
          </div>
          {sel && (
            <div style={{ marginTop: 10, padding: 10, background: T.panelHi, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700 }}>Sector {sel.id}</span>
              <span style={{ fontFamily: T.mono, color: densColor(sel.occupancy) }}>
                {sel.occupancy}% · {Math.round((sel.occupancy / 100) * sel.capacity).toLocaleString()} / {sel.capacity.toLocaleString()}
              </span>
            </div>
          )}
        </Panel>

        <Panel>
          <Eyebrow>Gate queues</Eyebrow>
          {gates.map((g) => (
            <div key={g.id} style={{ display: "grid", gridTemplateColumns: "64px 1fr 58px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontFamily: T.mono, fontSize: 12 }}>{g.id}</span>
              <div style={{ height: 6, background: T.panelHi, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${clamp(g.queueMin * 3.3, 4, 100)}%`, height: "100%", background: g.queueMin >= 20 ? T.red : g.queueMin >= 10 ? T.amber : T.green, transition: "width 0.6s" }} />
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.dim, textAlign: "right" }}>{g.queueMin} min</span>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Panel style={{ borderColor: brief ? T.blue : T.line }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Eyebrow color={T.blue}>AI decision brief</Eyebrow>
            <button onClick={generateBrief} disabled={loading} style={btn(T.blue)}>
              {loading ? <>Analyzing <Spinner /></> : brief ? "Refresh brief" : "Generate brief"}
            </button>
          </div>
          {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
          {!brief && !loading && !err && (
            <p style={{ color: T.dim, fontSize: 13, margin: 0 }}>
              Claude reads the live telemetry — sector densities, gate queues, incidents, match context — and returns prioritized, executable actions for the ops team.
            </p>
          )}
          {brief && (
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, padding: "2px 8px", borderRadius: 999, background: T.panelHi, color: brief.riskLevel === "high" ? T.red : brief.riskLevel === "moderate" ? T.amber : T.green, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  risk {brief.riskLevel}
                </span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: T.chalk, marginTop: 0 }}>{brief.summary}</p>
              {(brief.actions || []).map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.line}` }}>
                  <div style={{ fontFamily: T.mono, fontWeight: 700, color: T.blue }}>{a.priority}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.action}</div>
                    <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
                      <span style={{ color: T.chalk }}>{a.team}</span> · {a.why}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <Eyebrow>Incident feed</Eyebrow>
          {incidents.map((inc, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
              <span style={{ color: sevColor[inc.sev], fontFamily: T.mono, fontSize: 11, minWidth: 36, textTransform: "uppercase" }}>{inc.sev}</span>
              <span style={{ color: T.chalk }}>{inc.text}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ── TAB 2 · Fan Concierge (multilingual chat) ───────────────────────────────
const QUICK_PROMPTS = [
  "¿Dónde está la entrada accesible?",
  "Which food stand has the shortest line?",
  "Comment rentrer en métro après le match ?",
  "أين غرفة الصلاة؟",
  "Where can I refill my water bottle?",
];

function Concierge({ sectors, gates }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    const history = [...msgs, { role: "user", content }];
    setMsgs(history);
    setBusy(true);
    try {
      const live = {
        gateQueuesMin: Object.fromEntries(gates.map((g) => [g.id, g.queueMin])),
        sectorOccupancyPct: Object.fromEntries(sectors.map((s) => [s.id, s.occupancy])),
        foodQueues: VENUE.food,
      };
      const reply = await askClaude(
        "chat",
        history.map((m) => ({ role: m.role, content: m.content })),
        `You are the official fan concierge for ${VENUE.name}, FIFA World Cup 2026. ` +
          `ALWAYS reply in the same language the fan wrote in. Be warm, brief (2-4 sentences), and concrete. ` +
          `Ground every answer strictly in this venue data — never invent locations or facts: ` +
          `${JSON.stringify({ venue: VENUE, liveConditions: live })}. ` +
          `If the fan mentions a medical emergency, tell them to alert the nearest steward immediately and give the closest first aid location. ` +
          `Promote sustainable choices (refill stations, transit) when relevant.`
      );
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry — I couldn't reach the assistant. Please try again." }]);
    }
    setBusy(false);
  };

  return (
    <Panel style={{ display: "flex", flexDirection: "column", height: "70vh", minHeight: 420 }}>
      <Eyebrow color={T.green}>Fan concierge · replies in your language</Eyebrow>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 2px" }}>
        {msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 15, color: T.chalk, marginBottom: 12 }}>
              Ask anything about the stadium — in any language.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {QUICK_PROMPTS.map((q) => (
                <button key={q} onClick={() => send(q)} style={chip()}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "9px 13px",
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
              background: m.role === "user" ? T.blue : T.panelHi,
              color: m.role === "user" ? "#fff" : T.chalk,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}
        {busy && <div style={{ alignSelf: "flex-start", color: T.dim, fontSize: 13 }}><Spinner /> thinking…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask in any language…"
          aria-label="Message the fan concierge"
          style={{
            flex: 1, background: T.panelHi, border: `1px solid ${T.line}`, borderRadius: 8,
            padding: "10px 12px", color: T.chalk, fontSize: 14, outline: "none", fontFamily: T.sans,
          }}
        />
        <button onClick={() => send()} disabled={busy} style={btn(T.green)}>Send</button>
      </div>
    </Panel>
  );
}

// ── TAB 3 · Navigate (AI wayfinding + step-free routing) ────────────────────
const PLACES = [
  "Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5", "Gate 6",
  ...VENUE.sectors.map((s) => `Sector ${s}`),
  "First aid (Sector B)", "First aid (Sector F)", "Prayer room (Sector D, L2)",
  "Family room (Sector A)", "Sensory room (Sector H, L2)", "Lost & found (Gate 3)",
  "Metro station", "Rideshare zone",
];

function Navigate({ gates }) {
  const [from, setFrom] = useState("Gate 2");
  const [to, setTo] = useState("Sector G");
  const [stepFree, setStepFree] = useState(false);
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setBusy(true); setErr(""); setRoute(null);
    try {
      const result = await askClaude(
        "route",
        [{
          role: "user",
          content:
            `Plan a walking route inside ${VENUE.name} from "${from}" to "${to}".` +
            (stepFree ? " The route MUST be fully step-free (elevators/ramps only, no stairs)." : "") +
            ` Venue layout facts: sectors A–H run clockwise around the bowl; gates and what they serve: ${JSON.stringify(VENUE.gates.map(g => ({ id: g.id, serves: g.serves })))}; ` +
            `step-free infrastructure: ${VENUE.stepFreePaths}; current gate queues (minutes): ${JSON.stringify(Object.fromEntries(gates.map(g => [g.id, g.queueMin])))}. ` +
            `Return ONLY JSON, no markdown: {"etaMin": number, "stepFree": boolean, "steps": ["short instruction", ...], "tip": "one crowd-avoidance or timing tip based on the queue data"}. 3–6 steps.`,
        }],
        "You are an indoor wayfinding AI for a stadium. Respond only with valid JSON.",
        true
      );
      setRoute(result);
    } catch {
      setErr("Couldn't plan that route. Try again.");
    }
    setBusy(false);
  };

  const selStyle = {
    background: T.panelHi, border: `1px solid ${T.line}`, borderRadius: 8,
    padding: "9px 10px", color: T.chalk, fontSize: 14, fontFamily: T.sans, width: "100%",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: 16 }} className="mdc-grid">
      <Panel>
        <Eyebrow color={T.amber}>Plan a route</Eyebrow>
        <label style={lbl()}>From
          <select value={from} onChange={(e) => setFrom(e.target.value)} style={selStyle}>
            {PLACES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label style={lbl()}>To
          <select value={to} onChange={(e) => setTo(e.target.value)} style={selStyle}>
            {PLACES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={stepFree} onChange={(e) => setStepFree(e.target.checked)} />
          Step-free route (no stairs)
        </label>
        <button onClick={go} disabled={busy} style={{ ...btn(T.amber), width: "100%" }}>
          {busy ? <>Routing <Spinner /></> : "Get directions"}
        </button>
        {err && <div style={{ color: T.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
      </Panel>

      <Panel>
        <Eyebrow>Directions</Eyebrow>
        {!route && !busy && (
          <p style={{ color: T.dim, fontSize: 13 }}>
            Routes are generated by Claude from the venue layout and live queue data — it avoids congested gates and can keep the whole path step-free.
          </p>
        )}
        {route && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: T.panelHi, color: T.chalk }}>~{route.etaMin} min</span>
              {route.stepFree && <span style={{ padding: "3px 10px", borderRadius: 999, background: T.panelHi, color: T.green }}>step-free ✓</span>}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {(route.steps || []).map((s, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>{s}</li>
              ))}
            </ol>
            {route.tip && (
              <div style={{ marginTop: 14, padding: 10, background: T.panelHi, borderRadius: 8, fontSize: 13, color: T.amber }}>
                ⚡ {route.tip}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── style helpers ───────────────────────────────────────────────────────────
const btn = (color) => ({
  background: color, color: "#0D1321", border: "none", borderRadius: 8,
  padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.sans,
});
const chip = () => ({
  background: T.panelHi, color: T.chalk, border: `1px solid ${T.line}`, borderRadius: 999,
  padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: T.sans,
});
const lbl = () => ({
  display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: T.dim, marginBottom: 12,
  fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.1em",
});

// ── Root ────────────────────────────────────────────────────────────────────
export default function MatchdayCopilot() {
  const [tab, setTab] = useState("ops");
  const [sectors, setSectors] = useState(initialSectors);
  const [gates, setGates] = useState(initialGates);
  const [incidents, setIncidents] = useState(INCIDENT_POOL.slice(0, 3));
  const [clock, setClock] = useState(new Date());
  const [aiMode, setAiMode] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setAiMode(d.mode))
      .catch(() => setAiMode("offline"));
  }, []);

  // Live telemetry simulation: random-walk occupancy & queues, rotating incidents
  useEffect(() => {
    const id = setInterval(() => {
      setSectors((prev) => prev.map((s) => ({ ...s, occupancy: clamp(s.occupancy + Math.round((Math.random() - 0.48) * 5), 30, 99) })));
      setGates((prev) => prev.map((g) => ({
        ...g,
        queueMin: clamp(g.queueMin + Math.round((Math.random() - 0.5) * 4), 1, 35),
        throughputPerMin: clamp(g.throughputPerMin + Math.round((Math.random() - 0.5) * 6), 8, 60),
      })));
      setIncidents(() => {
        const shuffled = [...INCIDENT_POOL].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3 + Math.floor(Math.random() * 2));
      });
      setClock(new Date());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { id: "ops", label: "Ops Command", hint: "for organizers & venue staff" },
    { id: "fan", label: "Fan Concierge", hint: "multilingual assistant" },
    { id: "nav", label: "Navigate", hint: "AI wayfinding" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.ink, color: T.chalk, fontFamily: T.sans, padding: "20px 16px 40px" }}>
      <style>{`
        @keyframes mdcspin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .mdc-grid { grid-template-columns: 1fr !important; } }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        select option { background: ${T.panel}; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <Eyebrow color={T.green}>FIFA World Cup 2026 · {VENUE.city}</Eyebrow>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Matchday Copilot
            </h1>
            <div style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>{VENUE.name}</div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.dim, textAlign: "right" }}>
            <div style={{ color: T.green }}>● LIVE TELEMETRY</div>
            <div>{clock.toLocaleTimeString()}</div>
            {aiMode === "demo" && (
              <div style={{ marginTop: 4, color: T.amber }}>AI: demo mode (no API key)</div>
            )}
            {aiMode === "live" && <div style={{ marginTop: 4, color: T.blue }}>AI: Claude live</div>}
          </div>
        </header>

        <nav style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }} aria-label="Sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              style={{
                ...chip(),
                padding: "9px 16px",
                fontSize: 13.5,
                fontWeight: tab === t.id ? 700 : 400,
                background: tab === t.id ? T.chalk : T.panelHi,
                color: tab === t.id ? T.ink : T.chalk,
              }}
            >
              {t.label}
              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>{t.hint}</span>
            </button>
          ))}
        </nav>

        {tab === "ops" && <OpsCommand sectors={sectors} gates={gates} incidents={incidents} />}
        {tab === "fan" && <Concierge sectors={sectors} gates={gates} />}
        {tab === "nav" && <Navigate gates={gates} />}
      </div>
    </div>
  );
}
