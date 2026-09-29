import { createContext, type ReactNode } from "react";
import type { DesktopSidebarView } from "./desktopShellPlatform";

// The narrow drawer shares the selected workspace with the desktop list.
export const SidebarWorkspaceContext = createContext<{
  view: DesktopSidebarView;
  switchView: (view: DesktopSidebarView) => void;
  workspace: ReactNode;
} | null>(null);
