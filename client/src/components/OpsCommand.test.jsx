import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OpsCommand from "./OpsCommand.jsx";
import { initialSectors, initialGates } from "../lib/telemetry.js";

afterEach(() => vi.restoreAllMocks());

const props = {
  sectors: initialSectors(),
  gates: initialGates(),
  incidents: [{ sev: "warn", text: "Turnstile 4C offline" }],
};

describe("OpsCommand", () => {
  it("renders the incident feed", () => {
    render(<OpsCommand {...props} />);
    expect(screen.getByText(/turnstile 4c offline/i)).toBeTruthy();
  });

  it("renders an AI decision brief after clicking Generate", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        text: JSON.stringify({
          summary: "Sector C is congested.",
          riskLevel: "moderate",
          actions: [{ priority: 1, team: "Crowd mgmt", action: "Open C–D ramp", why: "Relieve pressure" }],
        }),
      }),
    });
    render(<OpsCommand {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /generate brief/i }));
    await waitFor(() => expect(screen.getByText(/risk moderate/i)).toBeTruthy());
    expect(screen.getByText(/open c–d ramp/i)).toBeTruthy();
  });

  it("shows an error state when the AI call fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<OpsCommand {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /generate brief/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
