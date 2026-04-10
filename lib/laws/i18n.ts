import type { LawLocale } from "@/lib/laws/types"

export function resolveLawLocale(input: string | null | undefined): LawLocale {
  if (input === "en" || input === "hi" || input === "mr") return input
  return "hi"
}

export function resolveTtsLanguageCode(locale: LawLocale): string {
  switch (locale) {
    case "mr":
      return "mr-IN"
    case "en":
      return "en-IN"
    case "hi":
    default:
      return "hi-IN"
  }
}
