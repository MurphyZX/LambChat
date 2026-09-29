import { CalendarClock, FolderOpen, MessageCircle, Monitor, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import { useMoreMenu } from "../../../hooks/useMoreMenu";
import { SidebarUserRow } from "../../panels/SidebarParts/SidebarUserRow";
import { DesktopMoreMenu } from "../../panels/SidebarParts/DesktopMoreMenu";
import { Permission } from "../../../types/auth";
import type { DesktopSidebarView } from "./desktopShellPlatform";

export function DesktopActivityRail({ view, collapsed, onSwitchView, onShowProfile }: {
  view: DesktopSidebarView;
  collapsed: boolean;
  onSwitchView: (view: DesktopSidebarView) => void;
  onShowProfile?: () => void;
}) {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const menu = useMoreMenu({ isCollapsed: true, isMobile: false });
  const buttonClass = "desktop-activity-button flex size-9 shrink-0 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--theme-ring)]";

  return (
    <nav aria-label={t("sidebarView")} data-desktop-activity-rail="" className="flex h-full w-[var(--sidebar-rail-width)] shrink-0 flex-col items-center border-r border-theme-border bg-[var(--theme-bg-sidebar)] py-1.5">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto">
        {(["chat", "files"] as const).map((item) => {
          const label = t(item === "chat" ? "workspacePanel.viewChats" : "workspacePanel.title");
          const Icon = item === "chat" ? MessageCircle : Monitor;
          return <button key={item} type="button" className={buttonClass} title={label} aria-label={label}
            aria-pressed={!collapsed && view === item && pathname.startsWith("/chat")}
            onClick={() => { onSwitchView(item); if (!pathname.startsWith("/chat")) navigate("/chat"); }}>
            <Icon size={19} />
          </button>;
        })}
        <button type="button" className={buttonClass} title={t("fileLibrary.title")} aria-label={t("fileLibrary.title")} aria-pressed={pathname === "/files"} onClick={() => navigate("/files")}><FolderOpen size={19} /></button>
        {hasPermission(Permission.SCHEDULED_TASK_READ) && <button type="button" className={buttonClass} title={t("nav.scheduled-tasks")} aria-label={t("nav.scheduled-tasks")} aria-pressed={pathname === "/scheduled-tasks"} onClick={() => navigate("/scheduled-tasks")}><CalendarClock size={19} /></button>}
        {menu.hasMoreMenuItems && <button type="button" ref={menu.moreMenuBtnRef} className={buttonClass} title={t("nav.more")} aria-label={t("nav.more")} aria-expanded={menu.isMoreMenuOpen} onClick={() => menu.setIsMoreMenuOpen((open) => !open)}><MoreHorizontal size={19} /></button>}
      </div>
      <SidebarUserRow compact user={user} imgError={false} onShowProfile={onShowProfile ?? (() => navigate("/settings"))} />
      <DesktopMoreMenu featureItems={menu.moreMenuFeatureItems} isOpen={menu.isMoreMenuOpen} onClose={() => menu.setIsMoreMenuOpen(false)} menuRef={menu.moreMenuRef} position={"top" in menu.moreMenuPosition ? menu.moreMenuPosition as { top: number; left: number } : null} />
    </nav>
  );
}
