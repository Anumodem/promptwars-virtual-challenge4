import { describe, it, expect } from "vitest";
import {
  clamp,
  densityLevel,
  initialSectors,
  initialGates,
  tickSectors,
  tickGates,
  telemetrySnapshot,
} from "./telemetry.js";

describe("clamp", () => {
  it("bounds values on both sides", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("densityLevel", () => {
  it("maps occupancy to the right severity", () => {
    expect(densityLevel(50)).toBe("green");
    expect(densityLevel(69)).toBe("green");
    expect(densityLevel(70)).toBe("amber");
    expect(densityLevel(84)).toBe("amber");
    expect(densityLevel(85)).toBe("red");
    expect(densityLevel(99)).toBe("red");
  });
});

describe("initial telemetry", () => {
  it("creates 8 sectors with valid occupancy", () => {
    const s = initialSectors();
    expect(s).toHaveLength(8);
    for (const x of s) {
      expect(x.occupancy).toBeGreaterThanOrEqual(0);
      expect(x.occupancy).toBeLessThanOrEqual(100);
      expect(x.capacity).toBeGreaterThan(0);
    }
  });

  it("creates 6 gates with queue and throughput", () => {
    const g = initialGates();
    expect(g).toHaveLength(6);
    for (const x of g) {
      expect(x.id).toMatch(/^Gate \d$/);
      expect(x.queueMin).toBeGreaterThan(0);
      expect(x.throughputPerMin).toBeGreaterThan(0);
    }
  });
});

describe("simulation ticks", () => {
  it("keeps sector occupancy within 30–99 over many extreme ticks", () => {
    let s = initialSectors();
    for (let i = 0; i < 200; i++) s = tickSectors(s, () => 1); // always push up
    for (const x of s) expect(x.occupancy).toBeLessThanOrEqual(99);
    for (let i = 0; i < 200; i++) s = tickSectors(s, () => 0); // always push down
    for (const x of s) expect(x.occupancy).toBeGreaterThanOrEqual(30);
  });

  it("keeps gate queues within 1–35", () => {
    let g = initialGates();
    for (let i = 0; i < 200; i++) g = tickGates(g, () => 1);
    for (const x of g) expect(x.queueMin).toBeLessThanOrEqual(35);
    for (let i = 0; i < 200; i++) g = tickGates(g, () => 0);
    for (const x of g) expect(x.queueMin).toBeGreaterThanOrEqual(1);
  });

  it("does not mutate its input", () => {
    const g = initialGates();
    const snapshot = JSON.stringify(g);
    tickGates(g);
    expect(JSON.stringify(g)).toBe(snapshot);
  });
});

describe("telemetrySnapshot", () => {
  it("builds the exact contract the AI consumes", () => {
    const snap = telemetrySnapshot(
      initialSectors(),
      initialGates(),
      [{ sev: "warn", text: "Turnstile offline" }],
      new Date("2026-07-18T20:00:00Z")
    );
    expect(snap.timestamp).toBe("2026-07-18T20:00:00.000Z");
    expect(snap.sectors[0]).toHaveProperty("sector");
    expect(snap.sectors[0]).toHaveProperty("occupancyPct");
    expect(snap.gates[0]).toHaveProperty("queueMinutes");
    expect(snap.activeIncidents).toEqual(["WARN: Turnstile offline"]);
  });
});
