import React, { useMemo } from "react";
import { T } from "../theme.js";
import { densityLevel } from "../lib/telemetry.js";

const densColor = (p) => T[densityLevel(p)];

// Signature element: live sector-density bowl map.
// Memoized — only re-renders when sector data or selection changes.
function StadiumBowl({ sectors, selected, onSelect }) {
  const cx = 200, cy = 150, rOuter = 130, rInner = 78;

  const arcs = useMemo(() => {
    const n = sectors.length;
    return sectors.map((s, i) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + 0.03;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - 0.03;
      const p = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x0, y0] = p(a0, rOuter);
      const [x1, y1] = p(a1, rOuter);
      const [x2, y2] = p(a1, rInner);
      const [x3, y3] = p(a0, rInner);
      const mid = (a0 + a1) / 2;
      const [lx, ly] = p(mid, (rOuter + rInner) / 2);
      return {
        s, lx, ly,
        d: `M${x0},${y0} A${rOuter},${rOuter} 0 0 1 ${x1},${y1} L${x2},${y2} A${rInner},${rInner} 0 0 0 ${x3},${y3} Z`,
      };
    });
  }, [sectors]);

  return (
    <svg
      viewBox="0 0 400 300"
      style={{ width: "100%", maxWidth: 460, display: "block", margin: "0 auto" }}
      role="img"
      aria-label="Stadium sector density map"
    >
      <ellipse cx={cx} cy={cy} rx={64} ry={44} fill="#12331F" stroke="#1F5A36" strokeWidth="2" />
      <rect x={cx - 10} y={cy - 44} width={20} height={88} fill="none" stroke="#1F5A36" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={12} fill="none" stroke="#1F5A36" strokeWidth="1.5" />
      {arcs.map(({ s, d, lx, ly }) => (
        <g
          key={s.id}
          onClick={() => onSelect(s.id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id)}
          tabIndex={0}
          role="button"
          aria-label={`Sector ${s.id}, ${s.occupancy} percent full`}
          style={{ cursor: "pointer" }}
        >
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

export default React.memo(StadiumBowl);
