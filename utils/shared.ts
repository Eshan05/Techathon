import type { ReadonlyURLSearchParams } from "next/navigation"

function isSafeRelativePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
}

export function getCallbackURL(
  params: ReadonlyURLSearchParams | null | undefined,
  fallback: string = "/dashboard"
) {
  const candidate =
    params?.get("callbackURL") ||
    params?.get("callbackUrl") ||
    params?.get("redirect") ||
    params?.get("redirectTo") ||
    params?.get("next") ||
    ""

  if (candidate && isSafeRelativePath(candidate)) return candidate
  return fallback
}
