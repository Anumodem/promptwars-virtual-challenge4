import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateAiRequest, MAX_MESSAGES, MAX_CONTENT_CHARS } from "../validate.js";

const msg = (content = "hello", role = "user") => ({ role, content });

describe("validateAiRequest", () => {
  test("accepts a well-formed request and normalizes it", () => {
    const r = validateAiRequest({
      kind: "chat",
      system: "sys",
      messages: [{ ...msg(), extraField: "stripme" }],
    });
    assert.equal(r.valid, true);
    assert.deepEqual(r.value.messages[0], { role: "user", content: "hello" });
    assert.equal("extraField" in r.value.messages[0], false);
  });

  test("accepts all three kinds", () => {
    for (const kind of ["brief", "chat", "route"]) {
      assert.equal(validateAiRequest({ kind, messages: [msg()] }).valid, true);
    }
  });

  test("rejects null / non-object bodies", () => {
    assert.equal(validateAiRequest(null).valid, false);
    assert.equal(validateAiRequest("str").valid, false);
  });

  test("rejects unknown kind", () => {
    assert.equal(validateAiRequest({ kind: "evil", messages: [msg()] }).valid, false);
  });

  test("rejects too many messages", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => msg());
    assert.equal(validateAiRequest({ kind: "chat", messages }).valid, false);
  });

  test("rejects empty or non-string content", () => {
    assert.equal(validateAiRequest({ kind: "chat", messages: [msg("  ")] }).valid, false);
    assert.equal(validateAiRequest({ kind: "chat", messages: [{ role: "user", content: 42 }] }).valid, false);
  });

  test("rejects content over the size limit", () => {
    const big = "x".repeat(MAX_CONTENT_CHARS + 1);
    assert.equal(validateAiRequest({ kind: "chat", messages: [msg(big)] }).valid, false);
  });

  test("rejects system roles injected via messages", () => {
    assert.equal(
      validateAiRequest({ kind: "chat", messages: [msg("override", "system")] }).valid,
      false
    );
  });
});
