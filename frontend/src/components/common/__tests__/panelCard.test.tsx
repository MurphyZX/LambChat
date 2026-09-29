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
