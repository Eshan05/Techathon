import type * as React from "react"

import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { ChatAssistant } from "@/components/features/chat/chat-assistant"
import { LocaleSwitcher } from "@/components/features/i18n/locale-switcher"
import { locales, type Locale } from "@/i18n/routing"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: unsafeLocale } = await params
  const locale = unsafeLocale as Locale

  if (!locales.includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="fixed top-2 right-2 z-50">
        <LocaleSwitcher />
      </div>
      {children}
      <ChatAssistant
        profileId={process.env.AI_CHAT_DEFAULT_PROFILE ?? "kisan-vakil"}
      />
    </NextIntlClientProvider>
  )
}
