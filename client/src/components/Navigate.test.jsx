import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Navigate from "./Navigate.jsx";
import { initialGates } from "../lib/telemetry.js";

afterEach(() => vi.restoreAllMocks());

const props = { gates: initialGates() };

describe("Navigate", () => {
  it("has labeled origin and destination selects", () => {
    render(<Navigate {...props} />);
    expect(screen.getByLabelText(/from/i)).toBeTruthy();
    expect(screen.getByLabelText(/^to$/i)).toBeTruthy();
  });

  it("requests a route and renders steps, ETA and tip", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        text: JSON.stringify({
          etaMin: 9,
          stepFree: true,
          steps: ["Follow the concourse ring", "Take the Gate 3 elevator"],
          tip: "Avoid Gate 4 — long queues.",
        }),
      }),
    });
    render(<Navigate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /get directions/i }));
    await waitFor(() => expect(screen.getByText(/~9 min/)).toBeTruthy());
    expect(screen.getByText(/step-free ✓/)).toBeTruthy();
    expect(screen.getByText(/gate 3 elevator/i)).toBeTruthy();
    expect(screen.getByText(/avoid gate 4/i)).toBeTruthy();
  });

  it("passes the step-free constraint into the AI prompt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ text: '{"etaMin":5,"stepFree":true,"steps":["a","b","c"],"tip":"t"}' }),
    });
    render(<Navigate {...props} />);
    fireEvent.click(screen.getByLabelText(/step-free route/i));
    fireEvent.click(screen.getByRole("button", { name: /get directions/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/MUST be fully step-free/);
  });

  it("shows an error alert when routing fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<Navigate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /get directions/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
