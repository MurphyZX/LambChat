import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = (path: string) => readFileSync(`src/${path}`, "utf8");

test("panel primitives use sans headings, theme focus and consistent spacing", () => {
  for (const name of ["PanelHeader", "SkillBaseCard"]) {
    expect(source(`components/common/${name}.tsx`)).not.toContain("font-serif");
  }
  const css = source("styles/components.css");
  expect(css).toMatch(/\.panel-header \{[^}]*margin-bottom: 0.75rem;/);
  expect(css).toMatch(/\.panel-pagination \{[^}]*margin-top: 0;/);
  expect(css).toMatch(/\.btn-secondary:focus-visible \{[^}]*var\(--theme-ring\)/);
  expect(css).not.toMatch(/\.dark \.btn-primary \{[^}]*#1c1917/);
  expect(source("components/common/ConfirmDialog.tsx")).toContain("text-theme-warning");
});
