import React, { useState, useEffect } from "react";
import { T, chip } from "./theme.js";
import { VENUE, INCIDENT_POOL } from "./data/venue.js";
import { initialSectors, initialGates, tickSectors, tickGates } from "./lib/telemetry.js";
import { Eyebrow } from "./components/ui.jsx";
import OpsCommand from "./components/OpsCommand.jsx";
import Concierge from "./components/Concierge.jsx";
import Navigate from "./components/Navigate.jsx";

const TABS = [
  { id: "ops", label: "Ops Command", hint: "for organizers & venue staff" },
  { id: "fan", label: "Fan Concierge", hint: "multilingual assistant" },
  { id: "nav", label: "Navigate", hint: "AI wayfinding" },
];

const TICK_MS = 5000;

export default function App() {
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

  // Live telemetry simulation: random-walk occupancy & queues, rotating incidents.
  useEffect(() => {
    const id = setInterval(() => {
      setSectors(tickSectors);
      setGates(tickGates);
      setIncidents(() => {
        const shuffled = [...INCIDENT_POOL].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3 + Math.floor(Math.random() * 2));
      });
      setClock(new Date());
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.ink, color: T.chalk, fontFamily: T.sans, padding: "20px 16px 40px" }}>
      <style>{`
        @keyframes mdcspin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .mdc-grid { grid-template-columns: 1fr !important; } }
        button:focus-visible, input:focus-visible, select:focus-visible, [role="button"]:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
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
          {TABS.map((t) => (
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
