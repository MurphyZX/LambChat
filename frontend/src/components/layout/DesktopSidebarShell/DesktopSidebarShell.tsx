/**
 * 宽屏侧栏壳（客户端和网页共用；窄屏保留移动抽屉）。
 * 结构对齐 ZCode 桌面端：图标导航栏 + 可拉伸列表栏——
 *
 *   [会话|电脑|文件|更多 rail]              ← 壳唯一的自有 chrome（视图切换）
 *   原版 SessionSidebar 内容      ← 操作行/列表/底部用户区全部复用原版
 *   ───────── 或 电脑面板（工作区文件树）
 *
 *   折叠入口在自绘标题栏（事件桥）；宽度可拖拽调整（右缘手柄），
 *   localStorage 持久化。
 *
 * 折叠状态复用 AppContent 的 sidebarCollapsed（与 web 端同一持久化语义）；
 * 当前视图（chat/files）独立持久化。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Search, PanelLeft } from "lucide-react";
import clsx from "clsx";
import { BrandLogo } from "../../common/BrandLogo";
import { BrandWordmark } from "../../common/BrandWordmark";
import { APP_NAME } from "../../../constants";
import { SidebarWorkspaceContext } from "./SidebarWorkspaceContext";
import { DesktopActivityRail } from "./DesktopActivityRail";
import { WorkspacePanel } from "../../workspacePanel/WorkspacePanel";
import {
  DESKTOP_SIDEBAR_TOGGLE_EVENT,
  DESKTOP_SIDEBAR_OPEN_SEARCH_EVENT,
  OPEN_NOTIFICATIONS_EVENT,
  NOTIFICATION_COUNT_EVENT,
  isDesktopShell,
  type DesktopSidebarView,
} from "./desktopShellPlatform";

const VIEW_STORAGE_KEY = "lambchat_desktop_sidebar_view";
const WIDTH_STORAGE_KEY = "lambchat_desktop_sidebar_width";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 232;
const MAX_WIDTH_CAP = 480;
const MAX_WIDTH_RATIO = 0.5;

function readStoredView(): DesktopSidebarView {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "files" ? "files" : "chat";
  } catch {
    return "chat";
  }
}

function clampWidth(value: number): number {
  const cap = Math.min(
    typeof window === "undefined" ? MAX_WIDTH_CAP : window.innerWidth * MAX_WIDTH_RATIO,
    MAX_WIDTH_CAP,
  );
  return Math.round(Math.min(cap, Math.max(MIN_WIDTH, value)));
}

function readStoredWidth(): number {
  try {
    const saved = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

interface DesktopSidebarShellProps {
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  sessionId?: string | null;
  /** 会话沙箱模式（agent_options.sandbox，"local" | "cloud"）。 */
  sandboxMode?: string | null;
  /** 会话 sandbox_machine_id（未显式选机器时空）。 */
  machineId?: string | null;
  /** 会话 sandbox_workspace 的原样 JSON（reveal 用）。 */
  workspaceSelection?: string | null;
  onShowProfile?: () => void;
  mobileOpen?: boolean;
  onToggleMobile?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * 桌面壳专属快捷键：⌘/Ctrl+B 切侧栏、⌘/Ctrl+, 打开设置（macOS 惯例）。
 * 挂在 shell 内部即只在桌面渲染时生效，web 路径零绑定。
 */
function useDesktopShellShortcuts(
  collapsed: boolean,
  onToggleCollapsed: (collapsed: boolean) => void,
  navigate: (to: string) => void,
) {
  useEffect(() => {
    if (!isDesktopShell()) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        onToggleCollapsed(!collapsed);
      }
      if (modifier && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [collapsed, onToggleCollapsed, navigate]);
}

export function DesktopSidebarShell({
  collapsed: chatCollapsed,
  onToggleCollapsed: onToggleChatCollapsed,
  sessionId,
  sandboxMode,
  machineId,
  workspaceSelection,
  children,
  onShowProfile,
  mobileOpen = false,
  onToggleMobile,
}: DesktopSidebarShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isChatPage = pathname === "/" || pathname === "/chat" || pathname.startsWith("/chat/");
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const collapsed = isChatPage ? chatCollapsed : expandedPanel !== pathname;
  const onToggleCollapsed = useCallback((next: boolean) => {
    if (isChatPage) onToggleChatCollapsed(next);
    else setExpandedPanel(next ? null : pathname);
  }, [isChatPage, onToggleChatCollapsed, pathname]);
  const [wide, setWide] = useState(() => window.innerWidth >= 640);
  const [notificationCount, setNotificationCount] = useState(0);
  const [view, setView] = useState<DesktopSidebarView>(readStoredView);
  const [width, setWidth] = useState(readStoredWidth);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  // pointerup 闭包可能拿到过期渲染的 width（同批连发事件），以 ref 为准持久化
  const widthRef = useRef(width);

  useEffect(() => {
    const update = (event: Event) => setNotificationCount((event as CustomEvent<number>).detail);
    window.addEventListener(NOTIFICATION_COUNT_EVENT, update);
    return () => window.removeEventListener(NOTIFICATION_COUNT_EVENT, update);
  }, []);

  useEffect(() => {
    const resize = () => {
      setWide(window.innerWidth >= 640);
      const next = readStoredWidth();
      widthRef.current = next;
      setWidth(next);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [resizing]);

  const setNavigationCollapsed = useCallback((next: boolean) => {
    if (wide) onToggleCollapsed(next);
    else onToggleMobile?.(!next);
  }, [wide, onToggleCollapsed, onToggleMobile]);
  const navigationCollapsed = wide ? collapsed : !mobileOpen;
  useDesktopShellShortcuts(navigationCollapsed, setNavigationCollapsed, navigate);

  // 标题栏折叠按钮的事件桥（TitleBar 不持有折叠状态）
  useEffect(() => {
    const handleToggle = () => setNavigationCollapsed(!navigationCollapsed);
    window.addEventListener(DESKTOP_SIDEBAR_TOGGLE_EVENT, handleToggle);
    return () => {
      window.removeEventListener(DESKTOP_SIDEBAR_TOGGLE_EVENT, handleToggle);
    };
  }, [navigationCollapsed, setNavigationCollapsed]);

  const switchView = useCallback(
    (next: DesktopSidebarView) => {
      setView(next);
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, next);
      } catch {
        /* 私密模式等场景静默 */
      }
      // 从折叠态点视图 = 同时展开侧栏
      onToggleChatCollapsed(false);
    },
    [onToggleChatCollapsed],
  );

  const handleResizeDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (collapsed || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    setResizing(true);
    try {
      // 无活动指针（合成事件）时捕获失败不致命：move/up 走冒泡仍可达
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture 不可用，依赖事件冒泡 */
    }
  };

  const handleResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = clampWidth(drag.startW + (e.clientX - drag.startX));
    widthRef.current = next;
    setWidth(next);
  };

  const handleResizeUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setResizing(false);
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(widthRef.current));
    } catch {
      /* 私密模式等场景静默 */
    }
  };

  const workspace = (
    <WorkspacePanel sessionId={sessionId ?? null} sandboxMode={sandboxMode}
      machineId={machineId} workspaceSelection={workspaceSelection} />
  );

  return (
    <SidebarWorkspaceContext.Provider value={{ view, switchView, workspace }}>
    <div className={wide ? "relative flex h-full shrink-0" : "contents"}>
      {wide && <DesktopActivityRail view={view} collapsed={collapsed} onSwitchView={switchView} onShowProfile={onShowProfile} />}
      <div
        data-desktop-sidebar={wide ? "" : undefined}
        inert={wide && collapsed}
        className={wide ? clsx(
          "relative h-full shrink-0 overflow-hidden bg-[var(--theme-bg-sidebar)]",
          !collapsed && "border-r border-[var(--theme-border)]",
          resizing ? "transition-none" : "transition-[width] duration-200 ease-out",
        ) : "contents"}
        style={wide ? { width: collapsed ? 0 : width } : undefined}
      >
        <div className={wide ? "absolute inset-0 flex flex-col" : "contents"}>
          {wide && <>
          <div data-sidebar-brand="" className="flex h-12 shrink-0 items-center gap-2 ps-[13px] pe-[7px]">
            <Link to="/chat" aria-label={APP_NAME} className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2">
              <BrandLogo alt={APP_NAME} className="-mx-1 size-7 shrink-0" />
              <BrandWordmark decorative className="h-7 w-auto min-w-0" />
            </Link>
            <div className="ml-auto flex shrink-0 items-center">
              <button type="button" title={t("nav.notifications")} aria-label={t("nav.notifications")}
                onClick={() => window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT))}
                className="relative flex size-8 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-subtle focus-visible:outline focus-visible:outline-2">
                <Bell size={16} />
                {notificationCount > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--theme-primary)]" aria-label={String(notificationCount)} />}
              </button>
              <button type="button" title={t("sidebar.searchSessions")} aria-label={t("sidebar.searchSessions")}
                onClick={() => window.dispatchEvent(new Event(DESKTOP_SIDEBAR_OPEN_SEARCH_EVENT))}
                className="flex size-8 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-subtle focus-visible:outline focus-visible:outline-2">
                <Search size={16} />
              </button>
            </div>
            {!isDesktopShell() && (
              <button type="button" onClick={() => onToggleCollapsed(true)}
                aria-label={t("sidebar.collapseSidebar")}
                className="ml-auto flex size-8 items-center justify-center rounded-md text-theme-text-secondary hover:bg-theme-bg-subtle focus-visible:outline focus-visible:outline-2">
                <PanelLeft size={16} />
              </button>
            )}
          </div>
          </>}
          {/* 内容区（chat/files 常驻挂载保状态，仅切显隐） */}
          <div className={wide ? "flex min-h-0 flex-1 flex-col" : "contents"}>
            <div
              className={!wide ? "contents" : clsx(
                "min-h-0 flex-1",
                view === "chat" && !collapsed ? "flex" : "hidden",
              )}
            >
              <div className={wide ? "min-h-0 w-full flex-1" : "contents"}>{children}</div>
            </div>
            <div
              className={clsx(
                "min-h-0 flex-1",
                wide && view === "files" && !collapsed ? "flex" : "hidden",
              )}
            >
              <div className="min-h-0 w-full flex-1">
                {wide && workspace}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Keep the hit area centered on the divider, outside the clipped content. */}
      {wide && !collapsed && (
        <div
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          onPointerCancel={handleResizeUp}
          onLostPointerCapture={handleResizeUp}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const next = clampWidth(widthRef.current + (e.key === "ArrowLeft" ? -10 : 10));
            widthRef.current = next;
            setWidth(next);
            try { localStorage.setItem(WIDTH_STORAGE_KEY, String(next)); } catch { /* storage unavailable */ }
          }}
          role="separator"
          tabIndex={0}
          aria-label={t("common.resizePanel")}
          aria-orientation="vertical"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={clampWidth(MAX_WIDTH_CAP)}
          aria-valuenow={width}
          className="group/sidebar-resize absolute inset-y-0 -right-[3px] z-10 flex w-[7px] touch-none cursor-col-resize items-stretch focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--theme-ring)]"
        >
          <div
            className={clsx(
              "mx-auto h-full w-px transition-colors",
              resizing
                ? "bg-[var(--theme-primary)]"
                : "bg-transparent group-hover/sidebar-resize:bg-[var(--theme-border-hover)]",
            )}
          />
        </div>
      )}
    </div>
    </SidebarWorkspaceContext.Provider>
  );
}

/**
 * 窄屏透传，保留 SessionSidebar 的移动抽屉；宽屏网页共用电脑入口。
 * children 即原 sidebar。
 */
export function DesktopSidebarShellGate(props: DesktopSidebarShellProps) {
  return <DesktopSidebarShell {...props} />;
}
