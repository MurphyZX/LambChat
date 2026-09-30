import { type CSSProperties, type ReactNode } from "react";
import { Checkbox } from "./Checkbox";

export interface SkillBaseCardProps {
  title: string;
  description?: string;
  descriptionMaxLines?: 2 | 3;
  gradient?: string[];
  cover?: boolean;
  bannerLeadingOverlay?: ReactNode;
  bannerOverlay?: ReactNode;
  icon?: ReactNode;
  statusPills?: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode;
  extraContent?: ReactNode;
  footer?: ReactNode;
  muted?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onSelect?: () => void;
  animated?: boolean;
  animationDelay?: number;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function SkillBaseCard({
  title,
  description,
  descriptionMaxLines = 2,
  gradient,
  cover = false,
  bannerLeadingOverlay,
  bannerOverlay,
  icon,
  statusPills,
  tags,
  meta,
  extraContent,
  footer,
  muted = false,
  selected = false,
  selectionMode = false,
  onSelect,
  className = "",
  onClick,
}: SkillBaseCardProps) {
  const lineClamp = descriptionMaxLines === 3 ? "line-clamp-3" : "line-clamp-2";

  const controls = (bannerLeadingOverlay || bannerOverlay || (selectionMode && onSelect)) && (
    <div className="scb__toolbar ml-auto flex min-w-0 flex-wrap items-center gap-2">
      {bannerLeadingOverlay}
      {selectionMode && onSelect && <Checkbox size="lg" checked={selected} onChange={onSelect} />}
      {bannerOverlay}
    </div>
  );

  const heading = (
    <div className="scb__heading flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        {icon && <div className="scb__icon-ring shrink-0">{icon}</div>}
        {!cover && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{statusPills}{controls}</div>}
      </div>
      <h3 title={title} className="line-clamp-2 break-words text-14 font-semibold font-sans text-theme-text leading-snug">
        {title}
      </h3>
    </div>
  );

  return (
    <div
      role={onClick || (selectionMode && onSelect) ? "button" : undefined}
      tabIndex={onClick || (selectionMode && onSelect) ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && (onClick || (selectionMode && onSelect))) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={`scb ${cover ? "scb--cover" : ""} group flex h-full flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-bg-card ${muted ? "scb--muted" : ""
        } ${selected ? "ring-2 ring-[var(--theme-primary)]" : ""} ${selectionMode && onSelect ? "cursor-pointer" : ""
        } ${className}`}
      style={
        gradient
          ? ({
            "--panel-card-accent": gradient[0],
            "--panel-card-accent-end": gradient[2],
          } as CSSProperties)
          : undefined
      }
      onClick={
        selectionMode && onSelect
          ? (e) => {
            if (
              !(e.target as HTMLElement).closest("button") &&
              !(e.target as HTMLElement).closest('[role="checkbox"]')
            ) {
              onSelect();
            }
          }
          : onClick
      }
    >
      {cover && <div className="scb__cover">{heading}</div>}
      {cover && controls && <div className="px-4 pt-3">{controls}</div>}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        {!cover && heading}
        {cover && statusPills}

        {description && (
          <p
            className={`mt-2 text-[0.78125rem] leading-relaxed text-[var(--theme-text-secondary)] ${lineClamp} min-h-[3.25em]`}
          >
            {description}
          </p>
        )}

        {tags && <div className="mt-3">{tags}</div>}

        {extraContent && <div className="mt-3">{extraContent}</div>}

        <div className="flex-1" />

        {meta && <div className="mt-3 text-11 text-theme-text-tertiary">{meta}</div>}

        {footer && <div className="scb__footer">{footer}</div>}
      </div>
    </div>
  );
}
