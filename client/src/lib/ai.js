// AI client: calls our backend, which proxies to the Anthropic API.
// kind: "brief" | "chat" | "route" (lets the server pick demo responses too).

export async function askClaude(kind, messages, system, expectJson = false) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, messages, system }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `AI request failed (${res.status})`);
  }
  const data = await res.json();
  return expectJson ? parseModelJson(data.text || "") : data.text || "";
}

/** Strip optional markdown fences and parse the model's JSON output. */
export function parseModelJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
