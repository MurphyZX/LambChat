import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
test("web chat loads the shared workspace styles without requiring native chrome", () => {
  const root = resolve(import.meta.dirname, "../..");
  const shell = readFileSync(
    resolve(root, "components/layout/AppContent/AppShell.tsx"),
    "utf8",
  );
  const css = readFileSync(resolve(root, "styles/desktop.css"), "utf8");
  expect(shell).toContain('import "../../../styles/desktop.css"');
  expect(shell).toContain('data-workspace-ui={activeTab === "chat"');
  expect(css).toContain(":has([data-titlebar], [data-workspace-ui])");
});

test("docked panels reserve native titlebar space while keeping the web top edge", () => {
  const css = readFileSync(
    resolve(import.meta.dirname, "../desktop.css"),
    "utf8",
  );
  expect(css).toContain("top: var(--titlebar-inset, 0px)");
  expect(css).toContain(
    "height: calc(100% - var(--titlebar-inset, 0px) - 0.5rem)",
  );
});
