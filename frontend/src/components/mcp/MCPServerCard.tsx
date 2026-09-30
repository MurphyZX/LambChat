import type { CSSProperties } from "react";
import {
  Server,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MCPServerResponse } from "../../types";
import { IconButton } from "../common";
import { nameToGradient } from "../common/cardUtils";

interface MCPServerCardProps {
  server: MCPServerResponse;
  onToggle: (name: string) => void;
  onEdit?: (server: MCPServerResponse) => void;
  onDelete?: (name: string, isSystem: boolean) => void;
  onClick?: () => void;
  toolCount?: number;
}

const TRANSPORT_COLORS: Record<string, string> = {
  sse: "bg-[var(--color-background-teal)] text-[var(--color-text-teal)]",
  streamable_http:
    "bg-[var(--color-background-purple)] text-[var(--color-text-purple)]",
};

const DEFAULT_TRANSPORT_COLOR =
  "bg-[var(--color-background-gray)] text-[var(--color-text-gray)]";

export function MCPServerCard({
  server,
  onToggle,
  onEdit,
  onDelete,
  onClick,
  toolCount,
}: MCPServerCardProps) {
  const { t } = useTranslation();

  const TRANSPORT_LABELS: Record<string, string> = {
    sse: t("mcp.form.transportSse"),
    streamable_http: t("mcp.form.transportHttp"),
  };
  const transportLabel =
    TRANSPORT_LABELS[server.transport] || server.transport.toUpperCase();
  const transportColor =
    TRANSPORT_COLORS[server.transport] || DEFAULT_TRANSPORT_COLOR;

  const gradient = nameToGradient(server.name);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`scb group flex h-full flex-col overflow-hidden cursor-pointer ${!server.enabled ? "scb--muted" : ""}`}
      style={
        {
          "--panel-card-accent": gradient[0],
          "--panel-card-accent-end": gradient[2],
        } as CSSProperties
      }
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) {
          onClick?.();
        }
      }}
    >
      <div className="scb__banner relative shrink-0">
        <div className="scb__icon-ring shrink-0">
          <Server size={16} className="text-theme-text-secondary" />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-end z-[3]">
          <div className="flex gap-1.5">
            {server.is_internal && (
              <span className="scb__mini-tag">
                {t("mcp.card.internal", "Internal")}
              </span>
            )}
            {server.is_system && !server.is_internal && (
              <span className="scb__mini-tag">
                {t("mcp.card.system")}
              </span>
            )}
            {!server.enabled && (
              <span className="scb__status-pill scb__status-pill--danger">
                {t("mcp.card.disabled")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex items-start gap-3">

          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-2 break-words text-14 font-semibold font-sans  text-[var(--theme-text)] leading-tight"
              title={server.name}
            >
              {server.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-11 font-medium tracking-wide ${transportColor}`}
              >
                {transportLabel}
              </span>
              {toolCount !== undefined && toolCount > 0 && (
                <span className="inline-flex items-center gap-1 text-11 text-[var(--theme-text-secondary)]">
                  <Wrench size={11} />
                  {toolCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {server.url && (
          <div
            className="mt-2 text-12 font-mono text-theme-text-tertiary truncate"
            title={server.url}
          >
            {server.url}
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-4 flex items-center justify-between gap-2 pt-1">
          <div className="panel-row-actions flex items-center gap-0.5">
            {server.can_edit && !server.is_internal && onEdit && (
              <IconButton
                aria-label={t("mcp.card.edit")}
                icon={<Edit3 size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(server);
                }}
                className="rounded-lg"
                title={t("mcp.card.edit")}
              />
            )}
            {server.can_edit && !server.is_internal && onDelete && (
              <IconButton
                aria-label={t("mcp.card.delete")}
                icon={<Trash2 size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(server.name, server.is_system);
                }}
                className="rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                title={t("mcp.card.delete")}
              />
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(server.name);
            }}
            className={`pps-card__action ${server.enabled
                ? "pps-card__action--active"
                : "pps-card__action--primary"
              }`}
          >
            {server.enabled ? (
              <ToggleRight
                size={13}
                className="text-theme-success"
              />
            ) : (
              <ToggleLeft size={13} />
            )}
            {server.enabled ? t("mcp.card.enable") : t("mcp.card.disable")}
          </button>
        </div>
      </div>
    </div>
  );
}
