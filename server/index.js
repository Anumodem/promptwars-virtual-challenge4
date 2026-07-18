// Matchday Copilot — server entrypoint.
// App construction lives in app.js so tests can import it without binding a port.

import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const app = createApp({
  apiKey: API_KEY,
  model: MODEL,
  serveStatic: process.env.NODE_ENV === "production",
});

app.listen(PORT, () => {
  console.log(`Matchday Copilot server on http://localhost:${PORT}`);
  console.log(
    API_KEY
      ? `AI mode: LIVE (${MODEL})`
      : "AI mode: DEMO (set ANTHROPIC_API_KEY in .env for live AI)"
  );
});
