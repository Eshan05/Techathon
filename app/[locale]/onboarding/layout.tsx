import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/features/dashboard/dashboard-shell"
import { auth } from "@/lib/auth/auth"
import { defaultLocale, locales, type Locale } from "@/i18n/routing"

export const runtime = "nodejs"

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: unsafeLocale } = await params
  const locale = unsafeLocale as Locale
  if (!locales.includes(locale)) {
    redirect(`/${defaultLocale}`)
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.session) {
    redirect(`/${locale}/sign-in?callbackURL=/${locale}/onboarding`)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardShell>{children}</DashboardShell>
    </div>
  )
}
