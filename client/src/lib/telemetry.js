// Telemetry simulation + pure helpers.
// In production these values come from turnstiles, CV crowd counting, ticketing
// and transit APIs; the shapes below are the contract the AI layer consumes.

import { VENUE } from "../data/venue.js";

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Map an occupancy percentage to a status color name. */
export const densityLevel = (p) => (p >= 85 ? "red" : p >= 70 ? "amber" : "green");

export const initialSectors = () =>
  VENUE.sectors.map((id, i) => ({
    id,
    occupancy: [62, 78, 91, 84, 55, 88, 70, 47][i],
    capacity: 10800,
  }));

export const initialGates = () =>
  VENUE.gates.map((g, i) => ({
    ...g,
    queueMin: [4, 18, 9, 26, 7, 3][i],
    throughputPerMin: [42, 21, 35, 15, 39, 44][i],
  }));

/** One simulation step for sectors (random walk, bounded 30–99%). */
export const tickSectors = (sectors, rand = Math.random) =>
  sectors.map((s) => ({
    ...s,
    occupancy: clamp(s.occupancy + Math.round((rand() - 0.48) * 5), 30, 99),
  }));

/** One simulation step for gates (bounded queue 1–35 min, throughput 8–60/min). */
export const tickGates = (gates, rand = Math.random) =>
  gates.map((g) => ({
    ...g,
    queueMin: clamp(g.queueMin + Math.round((rand() - 0.5) * 4), 1, 35),
    throughputPerMin: clamp(g.throughputPerMin + Math.round((rand() - 0.5) * 6), 8, 60),
  }));

/** Build the telemetry snapshot sent to the AI for a decision brief. */
export const telemetrySnapshot = (sectors, gates, incidents, now = new Date()) => ({
  timestamp: now.toISOString(),
  sectors: sectors.map((s) => ({ sector: s.id, occupancyPct: s.occupancy })),
  gates: gates.map((g) => ({
    gate: g.id,
    queueMinutes: g.queueMin,
    throughputPerMin: g.throughputPerMin,
  })),
  activeIncidents: incidents.map((i) => `${i.sev.toUpperCase()}: ${i.text}`),
  context:
    "Second half in progress. Full egress expected in ~50 minutes. Rain possible at 21:30.",
});
