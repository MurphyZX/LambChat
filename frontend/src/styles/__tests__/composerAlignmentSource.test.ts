import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync(new URL("../chat.css", import.meta.url), "utf8");

test("composer text and leading mode chips share the directory content inset", () => {
  expect(css).toMatch(
    /\.rich-chat-composer__editor\s*\{[^}]*padding: 0\.65rem 0\.625rem/,
  );
  expect(css).toMatch(
    /\.rich-chat-composer__placeholder\s*\{[^}]*left: 0\.625rem/,
  );
  expect(css).toMatch(/\.run-mode-chip-node\s*\{[^}]*margin: 0 0\.25em 0 0;/);
  expect(css).toMatch(/\.run-mode-chip-node\s*\{[^}]*gap: 0\.5rem;/);
});
