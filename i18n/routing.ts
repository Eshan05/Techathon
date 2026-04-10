import { defineRouting } from "next-intl/routing"

export const locales = ["hi", "en", "mr"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  hi: "हिंदी",
  en: "English",
  mr: "मराठी",
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
})
