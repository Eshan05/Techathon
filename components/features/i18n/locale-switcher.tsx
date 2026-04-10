"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { localeLabels, locales, type Locale } from "@/i18n/routing"
import { usePathname, useRouter } from "@/i18n/navigation"

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Locale")
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const pathnameWithoutLocale = React.useMemo(() => {
    const matchingLocale = locales.find(
      (candidate) =>
        pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`)
    )

    if (!matchingLocale) return pathname

    const nextPath = pathname.slice(matchingLocale.length + 1)
    return nextPath === "" ? "/" : nextPath
  }, [pathname])

  return (
    <div className={className}>
      <Select
        value={locale}
        onValueChange={(nextLocale) =>
          router.replace(pathnameWithoutLocale, {
            locale: nextLocale as Locale,
          })
        }
      >
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder={t("label")} />
        </SelectTrigger>
        <SelectContent align="end">
          {locales.map((l) => (
            <SelectItem key={l} value={l}>
              {localeLabels[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
