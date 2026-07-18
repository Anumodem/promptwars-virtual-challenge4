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
  it("renders the header and venue", () => {
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
    fireEvent.click(screen.getByRole("tab", { name: /fan concierge/i }));
    expect(screen.getByLabelText(/message the fan concierge/i)).toBeTruthy();
  });

  it("switches to Navigate with a step-free option", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: /navigate/i }));
    expect(screen.getByText(/step-free route/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /get directions/i })).toBeTruthy();
  });
});

describe("App accessibility", () => {
  it("implements the WAI-ARIA tabs pattern", () => {
    render(<App />);
    const tablist = screen.getByRole("tablist", { name: /copilot surfaces/i });
    expect(tablist).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
  });

  it("supports arrow-key tab navigation", () => {
    render(<App />);
    const opsTab = screen.getByRole("tab", { name: /ops command/i });
    fireEvent.keyDown(opsTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /fan concierge/i }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /fan concierge/i }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: /ops command/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("provides a skip-to-content link targeting main", () => {
    render(<App />);
    const skip = screen.getByText(/skip to main content/i);
    expect(skip.getAttribute("href")).toBe("#mdc-main");
    expect(document.getElementById("mdc-main")).toBeTruthy();
  });
});
