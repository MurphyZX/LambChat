import { expect, test } from "vitest";
import { COVER_PALETTES, nameToGradient } from "../cardUtils";

test("cover colors are deterministic brand tokens for multilingual names", () => {
  const names = ["Hire Me", "Research", "研究", "調査", "연구", "Исследование", "", "x".repeat(500)];
  for (const name of names) {
    const colors = nameToGradient(name, COVER_PALETTES);
    expect(COVER_PALETTES).toContain(colors);
    expect(nameToGradient(name, COVER_PALETTES)).toEqual(colors);
    expect(colors.every((color) => color.startsWith("var(--"))).toBe(true);
  }
  expect(new Set(names.map((name) => nameToGradient(name, COVER_PALETTES))).size).toBeGreaterThan(1);
});
