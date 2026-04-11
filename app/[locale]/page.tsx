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
        t("feature1Detail1"),
        t("feature1Detail2"),
        t("feature1Detail3"),
      ],
    },
    {
      title: t("feature2Title"),
      body: t("feature2Body"),
      details: [
        t("feature2Detail1"),
        t("feature2Detail2"),
        t("feature2Detail3"),
      ],
    },
    {
      title: t("feature3Title"),
      body: t("feature3Body"),
      details: [
        t("feature3Detail1"),
        t("feature3Detail2"),
        t("feature3Detail3"),
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
