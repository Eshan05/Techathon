import { redirect } from "next/navigation"

import { defaultLocale } from "@/i18n/routing"

export default function Page() {
  // Fallback redirect in case middleware doesn't run.
  redirect(`/${defaultLocale}`)
}
