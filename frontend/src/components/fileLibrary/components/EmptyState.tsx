import { SceneIllustration } from "../../common/SceneIllustration";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "../../common";
import { FilesListSkeleton } from "../../skeletons";

interface EmptyStateProps {
  isLoading: boolean;
  hasFiles: boolean;
  hasActiveFilters: boolean;
}

export function EmptyState({
  isLoading,
  hasFiles,
  hasActiveFilters,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* Loading skeleton — real Toolbar stays mounted, so only the list is skeletonized */
  if (isLoading) {
    return <FilesListSkeleton />;
  }

  /* Empty states */
  if (!hasFiles) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        {/* Illustration */}
        <SceneIllustration scene="files" />

        {/* Text */}
        <div className="text-center space-y-1.5">
          <p className="text-14 font-medium text-theme-text-secondary">
            {hasActiveFilters
              ? t("fileLibrary.noResults")
              : t("fileLibrary.empty")}
          </p>
          {hasActiveFilters && (
            <p className="text-12 text-theme-text-tertiary">
              {t("fileLibrary.tryDifferent")}
            </p>
          )}
        </div>

        {!hasActiveFilters && (
          <Button variant="primary" onClick={() => navigate("/chat")}>
            {t("fileLibrary.emptyAction")}
          </Button>
        )}
      </div>
    );
  }

  return null;
}
