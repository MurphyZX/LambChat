import { SceneIllustration } from "../../common/SceneIllustration";
import { useTranslation } from "react-i18next";
import { FEATURES } from "../data";
import { SectionHeading } from "./SectionHeading";

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section
      id="features"
      className="blog-mesh-features py-20 sm:py-28 lg:py-36 relative scroll-mt-14"
    >
      <div className="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-6">
        <SectionHeading
          label={t("landing.sectionLabelFeatures")}
          title={t("landing.coreFeatures")}
          description={t("landing.coreFeaturesDesc")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.titleKey}
              data-reveal
              data-reveal-delay={String(Math.min(i + 1, 6))}
              className="blog-feature-card relative rounded-2xl border border-theme-border bg-theme-bg-card p-7 sm:p-8"
            >
              {/* Number badge */}
              <span className="blog-feature-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <SceneIllustration scene={f.illustration} className="mb-4" />
              <h3 className="text-15 sm:text-16 font-bold text-theme-text mb-2.5 leading-snug">
                {t(`landing.${f.titleKey}`, f.titleKey)}
              </h3>
              <p className="text-13 sm:text-14 leading-[1.7] text-theme-text-secondary">
                {t(`landing.${f.descKey}`, f.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
