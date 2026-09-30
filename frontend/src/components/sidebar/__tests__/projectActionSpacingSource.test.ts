import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("project header actions share equal slots and a single gap", () => {
  const source = readFileSync(new URL("../ProjectItem.tsx", import.meta.url), "utf8");
  const actions = source.slice(source.indexOf('{/* Project actions */}'), source.indexOf('{/* Expandable content'));
  expect(actions).toContain('className="flex shrink-0 items-center gap-1"');
  expect(actions.match(/h-8 w-8/g)).toHaveLength(3);
  expect(actions.match(/max-sm:h-9 max-sm:w-9/g)).toHaveLength(3);
});
