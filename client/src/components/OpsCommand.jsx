import React, { useState } from "react";
import { T, btn } from "../theme.js";
import { VENUE } from "../data/venue.js";
import { densityLevel, telemetrySnapshot, clamp } from "../lib/telemetry.js";
import { askClaude } from "../lib/ai.js";
import { Eyebrow, Panel, Spinner } from "./ui.jsx";
import StadiumBowl from "./StadiumBowl.jsx";

const densColor = (p) => T[densityLevel(p)];
const SEV_COLOR = { info: "blue", warn: "amber", crit: "red" };

/**
 * Operations surface: live density bowl, gate queues, incident feed, and the
 * Claude-generated decision brief (structured JSON → prioritized action cards).
 * @param {{sectors: Array, gates: Array, incidents: Array}} props
 */
export default function OpsCommand({ sectors, gates, incidents }) {
  const [selected, setSelected] = useState("C");
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const generateBrief = async () => {
    setLoading(true);
    setErr("");
    try {
      const telemetry = telemetrySnapshot(sectors, gates, incidents);
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
    } catch {
      setErr("Couldn't generate the brief. Try again.");
    }
    setLoading(false);
  };

  const sel = sectors.find((s) => s.id === selected);

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
              <div style={{ height: 6, background: T.panelHi, borderRadius: 3, overflow: "hidden" }} role="progressbar" aria-label={`${g.id} queue`} aria-valuenow={g.queueMin} aria-valuemin={0} aria-valuemax={35}>
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
          {err && <div style={{ color: T.red, fontSize: 13 }} role="alert">{err}</div>}
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
              <span style={{ color: T[SEV_COLOR[inc.sev]], fontFamily: T.mono, fontSize: 11, minWidth: 36, textTransform: "uppercase" }}>{inc.sev}</span>
              <span style={{ color: T.chalk }}>{inc.text}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
