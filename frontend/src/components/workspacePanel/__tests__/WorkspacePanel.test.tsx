/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { WorkspacePanel } from "../WorkspacePanel";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../../../hooks/useSandboxStatus", () => ({ useSandboxStatus: () => ({ machines: [], currentMachineId: "mac", online: true }) }));
vi.mock("../../../hooks/useWorkspaceTree", () => ({ useWorkspaceTree: () => ({ root: [], state: "ready", error: null, expandedPaths: new Set(), refresh: vi.fn() }) }));
vi.mock("../../../services/api/sandboxFs", () => ({ sandboxFsApi: {}, sandboxCloudFsApi: {}, sandboxFsCloudStatusApi: { status: async () => ({ state: "disabled" }) } }));

test("switching the conversation sandbox also switches the visible workspace", () => {
  const { rerender } = render(<WorkspacePanel sessionId="s" sandboxMode="cloud" />);
  expect(screen.getByRole("button", { name: "workspacePanel.viewCloud" })).toHaveAttribute("aria-pressed", "true");
  rerender(<WorkspacePanel sessionId="s" sandboxMode="local" />);
  expect(screen.getByRole("button", { name: "workspacePanel.viewLocal" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "workspacePanel.viewCloud" }));
  expect(screen.getByRole("button", { name: "workspacePanel.viewCloud" })).toHaveAttribute("aria-pressed", "true");
});
