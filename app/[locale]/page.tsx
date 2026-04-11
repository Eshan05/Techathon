import { getTranslations } from "next-intl/server"
import { CreativeHomepage } from "@/components/features/home/creative-homepage"
import { siteConfig } from "@/lib/site"

export default async function Page() {
  const t = await getTranslations("Landing")
  const authT = await getTranslations("Auth")

  const features = [
    {
      title: t("feature1Title"),
      body: t("feature1Body"),
      details: [
        "Instant survey and gat checks with ownership trail",
        "Mutation milestones with clear status tracking",
        "Spot mismatches before you sign",
      ],
    },
    {
      title: t("feature2Title"),
      body: t("feature2Body"),
      details: [
        "Fast eligibility check for live schemes and subsidies",
        "Document checklist by scheme and claim type",
        "Submission route with office and portal guidance",
      ],
    },
    {
      title: t("feature3Title"),
      body: t("feature3Body"),
      details: [
        "Ready notice templates and complaint drafts",
        "Signed-copy vault organized case by case",
        "Quick red-flag scan for risky clauses",
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
      signInLabel={authT("signIn")}
      features={features}
    />
  )
}
