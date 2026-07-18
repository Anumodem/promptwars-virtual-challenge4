// Matchday Copilot — Express app factory.
// Separated from index.js so tests can import the app without binding a port.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { demoResponse } from "./demoMode.js";
import { validateAiRequest } from "./validate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Build the Express app.
 * @param {object} opts
 * @param {string|undefined} opts.apiKey   Anthropic API key (undefined → demo mode)
 * @param {string}           opts.model    Anthropic model id
 * @param {boolean}          opts.serveStatic  Serve the built client from client/dist
 * @param {Function}         [opts.fetchImpl]  Injectable fetch (for tests)
 */
export function createApp({ apiKey, model, serveStatic = false, fetchImpl = fetch } = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Deployments (Render/Heroku/etc.) sit behind a reverse proxy; trusting the
  // first hop lets express-rate-limit see real client IPs instead of the proxy's.
  app.set("trust proxy", 1);

  // Security headers. CSP allows self + inline styles (the app uses inline React styles).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  app.use(compression());

  // CORS: only needed for the Vite dev server; in production the client is same-origin.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));

  app.use(express.json({ limit: "200kb" }));

  // Rate limit the AI endpoint: it's the only expensive call.
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30, // 30 AI calls per minute per IP is generous for humans, hostile to abuse
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many AI requests — please slow down." },
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, mode: apiKey ? "live" : "demo", model: apiKey ? model : null });
  });

  // Single AI endpoint used by all three surfaces (ops brief, concierge, wayfinding).
  // Body: { kind: "brief" | "chat" | "route", messages: [...], system: "..." }
  app.post("/api/ai", aiLimiter, async (req, res) => {
    const { valid, error, value } = validateAiRequest(req.body);
    if (!valid) return res.status(400).json({ error });

    const { kind, messages, system } = value;

    // Demo mode: no API key configured — return a realistic canned response.
    if (!apiKey) {
      return res.json({ text: demoResponse(kind, messages), demo: true });
    }

    try {
      const r = await fetchImpl(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({ model, max_tokens: 1000, system, messages }),
      });
      const data = await r.json();
      if (!r.ok) {
        console.error("Anthropic API error:", data?.error?.type || r.status);
        return res.status(502).json({ error: data?.error?.message || "AI upstream error" });
      }
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      res.json({ text, demo: false });
    } catch (err) {
      console.error("AI request failed:", err.message);
      res.status(500).json({ error: "AI request failed" });
    }
  });

  // Serve the built frontend.
  if (serveStatic) {
    const dist = path.join(__dirname, "..", "client", "dist");
    if (fs.existsSync(dist)) {
      app.use(express.static(dist, { maxAge: "1h", index: "index.html" }));
      app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
    } else {
      console.warn(`client/dist not found at ${dist} — run "npm run build" first.`);
      app.get("*", (_req, res) =>
        res.status(503).send("Frontend not built. Run: npm run build")
      );
    }
  }

  // Central error handler (malformed JSON bodies, etc.)
   
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large" });
    }
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
