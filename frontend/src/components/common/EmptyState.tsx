import type { ReactNode } from "react";
import { SceneIllustration, type IllustrationScene } from "./SceneIllustration";

export interface EmptyStateProps {
  /** Avatar-derived artwork matching the panel's purpose. */
  illustration?: IllustrationScene;
  /** Primary text (already translated) */
  title: ReactNode;
  /** Secondary/hint text (already translated) */
  description?: ReactNode;
  /** Optional action slot (button, link, etc.) */
  action?: ReactNode;
  /** Extra CSS classes on root */
  className?: string;
}

/**
 * Shared empty-state placeholder used across panels.
 * Uses the `skill-empty-state` BEM classes defined in skill.css.
 *
 * Replaces 5+ inline duplications of the same HTML structure
 * in MarketplacePanel, SkillsList, ModelConfigTab, TeamRoster,
 * PersonaPlazaPanel, etc.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`skill-empty-state ${className ?? ""}`}>
      <SceneIllustration scene={illustration} />
      <p className="skill-empty-state__title">{title}</p>
      {description && (
        <p className="skill-empty-state__description">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
