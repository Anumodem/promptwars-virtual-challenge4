import { describe, it, expect, vi, afterEach } from "vitest";
import { askClaude, parseModelJson } from "./ai.js";

afterEach(() => vi.restoreAllMocks());

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences the model sometimes adds", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("throws on non-JSON so callers can show an error state", () => {
    expect(() => parseModelJson("sorry, I cannot")).toThrow();
  });
});

describe("askClaude", () => {
  it("POSTs kind, messages and system to /api/ai and returns text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ text: "hola" }),
    });
    const out = await askClaude("chat", [{ role: "user", content: "hi" }], "sys");
    expect(out).toBe("hola");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ai");
    expect(JSON.parse(opts.body)).toEqual({
      kind: "chat",
      messages: [{ role: "user", content: "hi" }],
      system: "sys",
    });
  });

  it("parses JSON responses when expectJson is true", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ text: '```json\n{"etaMin":7}\n```' }),
    });
    const out = await askClaude("route", [{ role: "user", content: "x" }], "sys", true);
    expect(out).toEqual({ etaMin: 7 });
  });

  it("surfaces server error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many AI requests — please slow down." }),
    });
    await expect(askClaude("chat", [{ role: "user", content: "x" }])).rejects.toThrow(/slow down/);
  });
});
