import { getRequestConfig } from "next-intl/server"
import { notFound } from "next/navigation"

import { routing, type Locale } from "@/i18n/routing"
import { deepMerge } from "@/i18n/merge"

async function loadMessages(locale: Locale) {
  const mod = await import(`../messages/${locale}.json`)
  return (mod as { default: Record<string, unknown> }).default
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = (requested ?? routing.defaultLocale) as string

  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }

  const base = await loadMessages(routing.defaultLocale)
  const current =
    locale === routing.defaultLocale
      ? base
      : await loadMessages(locale as Locale)

  return {
    locale,
    // Low-friction: missing keys fall back to Hindi, so adding a language can be incremental.
    messages:
      locale === routing.defaultLocale ? base : deepMerge(base, current),
  }
})
