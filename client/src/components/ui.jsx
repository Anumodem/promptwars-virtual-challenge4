import React from "react";
import { T } from "../theme.js";

export const Eyebrow = ({ children, color = T.dim }) => (
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

export const Panel = ({ children, style }) => (
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

export const Spinner = () => (
  <span
    aria-label="Loading"
    role="status"
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
