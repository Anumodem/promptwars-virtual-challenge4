// Design tokens + shared style helpers.

export const T = {
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

export const btn = (color) => ({
  background: color, color: "#0D1321", border: "none", borderRadius: 8,
  padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.sans,
});

export const chip = () => ({
  background: T.panelHi, color: T.chalk, border: `1px solid ${T.line}`, borderRadius: 999,
  padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: T.sans,
});

export const lbl = () => ({
  display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: T.dim, marginBottom: 12,
  fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.1em",
});
