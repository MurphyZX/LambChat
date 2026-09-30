import { SkeletonLine } from "./primitives";

/**
 * Matches PanelHeader layout:
 *   - Title (text-16 font-sans) + optional subtitle
 *   - Desktop action buttons
 *   - Mobile menu button (when !hasSearch)
 *   - Optional search row with searchAccessory + searchActions
 */
export function PanelHeaderSkeleton({
  hasSearch = true,
  hasSubtitle = false,
}: {
  hasSearch?: boolean;
  hasSubtitle?: boolean;
}) {
  return (
    <div className="panel-header panel-header--has-search">
      <div className="panel-header__top flex flex-wrap items-center justify-between gap-3 lg:gap-4">
        {/* Identity — title and count */}
        <div className="panel-header__identity flex min-w-0 items-center gap-3 lg:gap-4">
          <div className="min-w-0">
            <SkeletonLine
              width="w-28 sm:w-36 xl:w-48"
              className="!h-4"
            />
            {hasSubtitle && (
              <SkeletonLine
                width="w-40 sm:w-52 xl:w-64"
                className="!h-3 sm:!h-[14px] mt-0.5 !opacity-60"
              />
            )}
          </div>
        </div>

        {/* Desktop action buttons */}
        <div className="panel-header__actions panel-header__desktop-actions flex flex-nowrap flex-shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="skeleton-line h-10 w-20 rounded-lg" />
          <div className="skeleton-line h-10 w-10 rounded-lg" />
        </div>

        {/* Mobile menu button — always shown on mobile */}
        <div className="panel-header__mobile-actions sm:hidden">
          <div className="skeleton-line size-9 rounded-lg" />
        </div>
      </div>

      {/* Search row — matches real search-row with searchAccessory + searchActions */}
      {hasSearch && (
        <div className="panel-header__search-row mt-3 flex items-center gap-2">
          <div className="panel-header__search-box relative min-w-0 flex-1">
            <div className="skeleton-line h-10 w-full rounded-lg" />
          </div>
          {/* searchAccessory skeleton (e.g. period filter) */}
          <div className="panel-header__search-accessory hidden sm:block">
            <div className="skeleton-line h-10 w-28 rounded-lg" />
          </div>
          {/* searchActions skeleton (e.g. refresh button) */}
          <div className="panel-header__search-actions hidden sm:flex flex-nowrap shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="skeleton-line size-10 rounded-lg" />
          </div>
          {/* Mobile inline menu button in search row */}
          <div className="panel-header__mobile-actions panel-header__mobile-actions--search sm:hidden">
            <div className="skeleton-line size-10 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
