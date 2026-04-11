import { getTranslations } from "next-intl/server"
import { CreativeHomepage } from "@/components/features/home/creative-homepage"
import { siteConfig } from "@/lib/site"

export default async function Page() {
  const t = await getTranslations("Landing")

  const features = [
    {
      title: t("feature1Title"),
      body: t("feature1Body"),
      details: [
        "Survey/gat mapping and ownership history snapshots",
        "Mutation checkpoints with traceable status",
        "Flag mismatch before you sign",
      ],
    },
    {
      title: t("feature2Title"),
      body: t("feature2Body"),
      details: [
        "Eligibility checks for active schemes and subsidies",
        "Required document checklist by claim type",
        "Submission path with office and portal hints",
      ],
    },
    {
      title: t("feature3Title"),
      body: t("feature3Body"),
      details: [
        "Notice templates and complaint drafts",
        "Signed copy vault with case-wise organization",
        "Quick red-flag checks for risky clauses",
      ],
    },
  ]

  return (
    <CreativeHomepage
      brandName={siteConfig.name}
      headline={t("headline")}
      subheadline={t("subheadline")}
      ctaPrimary={t("ctaPrimary")}
      ctaSecondary={t("ctaSecondary")}
      features={features}
    />
  )
}
