import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App.jsx";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, mode: "demo", model: null }),
  });
});

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  it("renders the header and venue", async () => {
    render(<App />);
    expect(screen.getByText("Matchday Copilot")).toBeTruthy();
    expect(screen.getByText(/Estadio Azteca/)).toBeTruthy();
  });

  it("shows the AI demo-mode badge from /api/health", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/demo mode/)).toBeTruthy());
  });

  it("opens on Ops Command with the density map", () => {
    render(<App />);
    expect(screen.getByRole("img", { name: /stadium sector density map/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /generate brief/i })).toBeTruthy();
  });

  it("switches to the Fan Concierge tab", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /fan concierge/i }));
    expect(screen.getByLabelText(/message the fan concierge/i)).toBeTruthy();
  });

  it("switches to Navigate with a step-free option", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /navigate/i }));
    expect(screen.getByText(/step-free route/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /get directions/i })).toBeTruthy();
  });
});
