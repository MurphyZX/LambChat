/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SkillBaseCard } from "../SkillBaseCard";
test("keeps status and actions without decorative gradient banners", () => {
  const { container } = render(
    <SkillBaseCard
      title="Research"
      gradient={["red", "green", "blue"]}
      bannerOverlay={<button>Manage</button>}
    />,
  );
  expect(screen.getByRole("button", { name: "Manage" })).toBeTruthy();
  expect(container.querySelector('[style*="gradient"]')).toBeNull();
});


test("marketplace covers keep one title and icon with status outside the cover", () => {
  const { container } = render(
    <SkillBaseCard title="Hire Me" cover icon={<span>H</span>} statusPills={<span>Published</span>} />,
  );
  const cover = container.querySelector(".scb__cover");
  expect(cover).not.toBeNull();
  expect(cover?.textContent).toBe("HHire Me");
  expect(container.querySelectorAll("h3")).toHaveLength(1);
  expect(cover?.textContent).not.toContain("Published");
});

test("card selection supports the keyboard without hijacking nested actions", async () => {
  const { fireEvent } = await import("@testing-library/react");
  const { vi } = await import("vitest");
  const onSelect = vi.fn();
  const { container } = render(
    <SkillBaseCard title="Keyboard card" selectionMode onSelect={onSelect} bannerOverlay={<button>Inspect</button>} />,
  );
  const card = container.querySelector(".scb")!;
  fireEvent.keyDown(card, { key: "Enter" });
  expect(onSelect).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole("button", { name: "Inspect" }), { key: "Enter" });
  expect(onSelect).toHaveBeenCalledTimes(1);
});
