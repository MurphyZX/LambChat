/** @vitest-environment jsdom */
import { render, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, expect, test } from "vitest";
import { PanelHeaderSkeleton } from "../PanelHeaderSkeleton";
import { SkillsPanelSkeleton, MarketplacePanelSkeleton, UsersPanelSkeleton, RolesPanelSkeleton, MCPPanelSkeleton, ScheduledTaskPanelSkeleton, TaskSessionListSkeleton, MemoryPanelSkeleton } from "../PanelSkeletons";
import { BookmarksPanelSkeleton, NotificationsPanelSkeleton, TeamPanelSkeleton } from "../ResourceSkeletons";
import { FilesContentSkeleton } from "../FilesSkeletons";
import { PersonaPlazaSkeleton } from "../PersonaSkeletons";

afterEach(cleanup);

test.each([SkillsPanelSkeleton, MarketplacePanelSkeleton, UsersPanelSkeleton, RolesPanelSkeleton, MCPPanelSkeleton, ScheduledTaskPanelSkeleton, TaskSessionListSkeleton, MemoryPanelSkeleton, PersonaPlazaSkeleton, BookmarksPanelSkeleton, NotificationsPanelSkeleton, TeamPanelSkeleton, FilesContentSkeleton].map(Component => [Component.name, Component] as const))("%s keeps pagination outside its scrolling body", (_name, Component) => {
  const { container } = render(<Component />);
  const body = container.querySelector(".panel-body.overflow-y-auto");
  const footer = container.querySelector(".panel-pagination");
  expect(body).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(body?.contains(footer)).toBe(false);
  expect(body?.parentElement).toBe(footer?.parentElement);
});

test("search header has one inline mobile menu and the current identity spacing", () => {
  const { container } = render(<PanelHeaderSkeleton />);
  expect(container.querySelectorAll(".panel-header__mobile-actions")).toHaveLength(1);
  expect(container.querySelector(".panel-header__search-box .panel-header__mobile-actions")).not.toBeNull();
  expect(container.querySelector(".panel-header__illustration")).not.toBeNull();
  expect(container.querySelector(".panel-header__search-row")?.className).toContain("mt-2");
});

test("header without search does not reserve search padding", () => {
  const { container } = render(<PanelHeaderSkeleton hasSearch={false} />);
  expect(container.querySelector(".panel-header--has-search")).toBeNull();
});

test("every management route has a page-specific lazy loading skeleton", () => {
  const source = readFileSync("src/components/layout/AppContent/TabContent.tsx", "utf8");
  for (const route of ["settings", "files", "bookmarks", "persona", "team", "notifications", "memory"]) {
    expect(source).toMatch(new RegExp(`${route}: <\\w+Skeleton`));
  }
});
