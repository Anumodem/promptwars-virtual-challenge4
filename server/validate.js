// Request validation for POST /api/ai.
// Enforces shape, size and content limits before anything reaches the AI layer.

export const AI_KINDS = ["brief", "chat", "route"];
export const MAX_MESSAGES = 40;
export const MAX_CONTENT_CHARS = 4000;
export const MAX_SYSTEM_CHARS = 20000;
const ROLES = ["user", "assistant"];

/**
 * Validate the body of an /api/ai request.
 * @returns {{valid: boolean, error?: string, value?: {kind: string, messages: Array, system?: string}}}
 */
export function validateAiRequest(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { kind, messages, system } = body;

  if (!AI_KINDS.includes(kind)) {
    return { valid: false, error: `kind must be one of: ${AI_KINDS.join(", ")}` };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: "messages array is required" };
  }
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: `messages exceeds limit of ${MAX_MESSAGES}` };
  }

  for (const m of messages) {
    if (!m || typeof m !== "object") {
      return { valid: false, error: "each message must be an object" };
    }
    if (!ROLES.includes(m.role)) {
      return { valid: false, error: `message role must be one of: ${ROLES.join(", ")}` };
    }
    if (typeof m.content !== "string" || m.content.trim().length === 0) {
      return { valid: false, error: "message content must be a non-empty string" };
    }
    if (m.content.length > MAX_CONTENT_CHARS) {
      return { valid: false, error: `message content exceeds ${MAX_CONTENT_CHARS} characters` };
    }
  }

  if (system !== undefined) {
    if (typeof system !== "string") {
      return { valid: false, error: "system must be a string" };
    }
    if (system.length > MAX_SYSTEM_CHARS) {
      return { valid: false, error: `system exceeds ${MAX_SYSTEM_CHARS} characters` };
    }
  }

  // Return a normalized copy: only the fields we expect, nothing extra forwarded upstream.
  return {
    valid: true,
    value: {
      kind,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    },
  };
}
