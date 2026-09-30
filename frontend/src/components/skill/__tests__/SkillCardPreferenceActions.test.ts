/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SkillCard } from "../SkillCard";
import type { SkillResponse } from "../../../types";

vi.mock("react-i18next", async (original) => ({
  ...(await original<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);

test("favorite and pin actions preserve preferences without opening the editor", () => {
  const skill: SkillResponse = {
    name: "research",
    description: "Research notes",
    tags: ["研究"],
    enabled: true,
    source: "manual",
    files: {},
    file_count: 1,
    installed_from: "manual",
    is_published: false,
    marketplace_is_active: true,
    is_favorite: true,
    is_pinned: false,
  };
  const preferences = vi.fn();
  const edit = vi.fn();
  render(
    createElement(SkillCard, {
      skill,
      onToggle: vi.fn(),
      onEdit: edit,
      onDelete: vi.fn(),
      onTogglePreference: preferences,
    }),
  );
  const favorite = screen.getByRole("button", {
    name: "personaPresets.favorite",
  });
  expect(favorite.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(favorite);
  expect(preferences).toHaveBeenCalledWith(skill, { is_favorite: false });
  fireEvent.click(screen.getByRole("button", { name: "personaPresets.pin" }));
  expect(preferences).toHaveBeenCalledWith(skill, { is_pinned: true });
  expect(edit).not.toHaveBeenCalled();
});
