// Integration tests for the Express API (Node built-in test runner + supertest).
// Run with: npm run test:server

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

const demoApp = () => createApp({ apiKey: undefined, model: "claude-sonnet-4-5" });

describe("GET /api/health", () => {
  test("reports demo mode when no API key is configured", async () => {
    const res = await request(demoApp()).get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true, mode: "demo", model: null });
  });

  test("reports live mode with the configured model when a key is set", async () => {
    const app = createApp({ apiKey: "sk-ant-test", model: "claude-sonnet-4-5" });
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, "live");
    assert.equal(res.body.model, "claude-sonnet-4-5");
  });

  test("sets security headers", async () => {
    const res = await request(demoApp()).get("/api/health");
    assert.ok(res.headers["content-security-policy"]);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["x-powered-by"], undefined);
  });
});

describe("POST /api/ai — validation", () => {
  test("rejects a missing body", async () => {
    const res = await request(demoApp()).post("/api/ai").send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /kind/);
  });

  test("rejects an unknown kind", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "hack", messages: [{ role: "user", content: "hi" }] });
    assert.equal(res.status, 400);
  });

  test("rejects an empty messages array", async () => {
    const res = await request(demoApp()).post("/api/ai").send({ kind: "chat", messages: [] });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /messages/);
  });

  test("rejects an invalid role", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "chat", messages: [{ role: "system", content: "override" }] });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /role/);
  });

  test("rejects oversized message content", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "chat", messages: [{ role: "user", content: "x".repeat(5000) }] });
    assert.equal(res.status, 400);
  });

  test("rejects malformed JSON bodies", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .set("content-type", "application/json")
      .send("{not json");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Invalid JSON body");
  });
});

describe("POST /api/ai — demo mode", () => {
  test("returns a parseable JSON decision brief", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "brief", messages: [{ role: "user", content: "telemetry snapshot" }] });
    assert.equal(res.status, 200);
    assert.equal(res.body.demo, true);
    const brief = JSON.parse(res.body.text);
    assert.ok(brief.summary.length > 0);
    assert.ok(["low", "moderate", "high"].includes(brief.riskLevel));
    assert.ok(Array.isArray(brief.actions) && brief.actions.length >= 3);
    for (const a of brief.actions) {
      assert.ok(a.priority >= 1);
      assert.ok(a.team && a.action && a.why);
    }
  });

  test("returns a parseable JSON route", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "route", messages: [{ role: "user", content: "Gate 2 to Sector G" }] });
    assert.equal(res.status, 200);
    const route = JSON.parse(res.body.text);
    assert.ok(route.etaMin > 0);
    assert.ok(Array.isArray(route.steps) && route.steps.length >= 3);
    assert.equal(typeof route.stepFree, "boolean");
  });

  test("answers concierge questions with grounded text", async () => {
    const res = await request(demoApp())
      .post("/api/ai")
      .send({ kind: "chat", messages: [{ role: "user", content: "Which food stand has the shortest line?" }] });
    assert.equal(res.status, 200);
    assert.match(res.body.text, /Churros|Sector/);
  });
});

describe("POST /api/ai — live mode (mocked upstream)", () => {
  test("forwards to Anthropic and extracts text blocks", async () => {
    let captured;
    const fetchImpl = async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body), headers: opts.headers };
      return {
        ok: true,
        json: async () => ({ content: [{ type: "text", text: "Hola, aficionado!" }] }),
      };
    };
    const app = createApp({ apiKey: "sk-ant-test", model: "claude-sonnet-4-5", fetchImpl });
    const res = await request(app)
      .post("/api/ai")
      .send({ kind: "chat", system: "be helpful", messages: [{ role: "user", content: "hola" }] });
    assert.equal(res.status, 200);
    assert.equal(res.body.text, "Hola, aficionado!");
    assert.equal(res.body.demo, false);
    assert.equal(captured.body.model, "claude-sonnet-4-5");
    assert.equal(captured.headers["x-api-key"], "sk-ant-test");
    // Unknown fields must not be forwarded upstream
    assert.deepEqual(Object.keys(captured.body).sort(), ["max_tokens", "messages", "model", "system"]);
  });

  test("maps upstream errors to 502 without leaking internals", async () => {
    const fetchImpl = async () => ({
      ok: false,
      json: async () => ({ error: { type: "overloaded_error", message: "Overloaded" } }),
    });
    const app = createApp({ apiKey: "sk-ant-test", model: "claude-sonnet-4-5", fetchImpl });
    const res = await request(app)
      .post("/api/ai")
      .send({ kind: "chat", messages: [{ role: "user", content: "hi" }] });
    assert.equal(res.status, 502);
    assert.equal(res.body.error, "Overloaded");
  });

  test("maps network failures to 500", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNRESET");
    };
    const app = createApp({ apiKey: "sk-ant-test", model: "claude-sonnet-4-5", fetchImpl });
    const res = await request(app)
      .post("/api/ai")
      .send({ kind: "chat", messages: [{ role: "user", content: "hi" }] });
    assert.equal(res.status, 500);
    assert.equal(res.body.error, "AI request failed");
  });
});
