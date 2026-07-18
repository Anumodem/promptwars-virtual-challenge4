// Matchday Copilot — backend
// Proxies AI requests to the Anthropic API so the key never reaches the browser.
// If no ANTHROPIC_API_KEY is set, runs in DEMO MODE with realistic canned
// responses so judges can run the project with zero setup.

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { demoResponse } from "./demoMode.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: API_KEY ? "live" : "demo",
    model: API_KEY ? MODEL : null,
  });
});

// AI endpoint
app.post("/api/ai", async (req, res) => {
  const { kind, messages, system } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "messages array is required",
    });
  }

  // Demo mode
  if (!API_KEY) {
    return res.json({
      text: demoResponse(kind, messages),
      demo: true,
    });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error(data);
      return res.status(502).json({
        error: data?.error?.message || "AI upstream error",
      });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.json({
      text,
      demo: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "AI request failed",
    });
  }
});

// ---------- Serve React Frontend ----------
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../client/dist");

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Matchday Copilot server on http://localhost:${PORT}`);
  console.log(
    API_KEY
      ? `AI mode: LIVE (${MODEL})`
      : "AI mode: DEMO (set ANTHROPIC_API_KEY in .env for live AI)"
  );
});