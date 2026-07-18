// Vitest setup: RTL cleanup between tests + jsdom polyfills the app expects.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
