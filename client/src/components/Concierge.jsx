import React, { useState, useEffect, useRef } from "react";
import { T, btn, chip } from "../theme.js";
import { VENUE, QUICK_PROMPTS } from "../data/venue.js";
import { askClaude } from "../lib/ai.js";
import { Eyebrow, Panel, Spinner } from "./ui.jsx";

export default function Concierge({ sectors, gates }) {
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
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 2px" }} aria-live="polite">
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
