import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Concierge from "./Concierge.jsx";
import { initialSectors, initialGates } from "../lib/telemetry.js";

afterEach(() => vi.restoreAllMocks());

const props = { sectors: initialSectors(), gates: initialGates() };

describe("Concierge", () => {
  it("shows multilingual quick prompts before any conversation", () => {
    render(<Concierge {...props} />);
    expect(screen.getByText(/¿Dónde está la entrada accesible\?/)).toBeTruthy();
    expect(screen.getByText(/أين غرفة الصلاة؟/)).toBeTruthy();
  });

  it("sends a typed message and renders the AI reply", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ text: "Gate 6 is the accessible entrance." }),
    });
    render(<Concierge {...props} />);
    const input = screen.getByLabelText(/message the fan concierge/i);
    fireEvent.change(input, { target: { value: "accessible entrance?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("accessible entrance?")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/gate 6 is the accessible entrance/i)).toBeTruthy());
  });

  it("shows a friendly fallback when the AI call fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<Concierge {...props} />);
    fireEvent.click(screen.getByText(/where can i refill my water bottle\?/i));
    await waitFor(() => expect(screen.getByText(/couldn't reach the assistant/i)).toBeTruthy());
  });

  it("ignores empty submissions", () => {
    render(<Concierge {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByText(/ask anything about the stadium/i)).toBeTruthy();
  });
});
