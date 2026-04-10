import { getTranslations } from "next-intl/server"

import { SignInButton } from "@/components/features/auth/sign-in-button"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { siteConfig } from "@/lib/site"

export default async function Page() {
  const t = await getTranslations("Landing")

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 p-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {siteConfig.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("headline")}
          <span className="text-muted-foreground"> {t("subheadline")}</span>
        </h1>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SignInButton />
        <Button asChild variant="outline">
          <Link href="/sign-up">{t("ctaSecondary")}</Link>
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">{t("feature1Title")}</p>
          <p className="text-sm text-muted-foreground">{t("feature1Body")}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">{t("feature2Title")}</p>
          <p className="text-sm text-muted-foreground">{t("feature2Body")}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">{t("feature3Title")}</p>
          <p className="text-sm text-muted-foreground">{t("feature3Body")}</p>
        </div>
      </section>

      <p className="mt-auto font-mono text-xs text-muted-foreground">
        (Press <kbd>d</kbd> to toggle dark mode)
      </p>
    </div>
  )
}
