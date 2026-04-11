import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { defaultLocale, locales, routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ["/dashboard"] as const

function parseLocaleFromPath(pathname: string) {
  const [, maybeLocale] = pathname.split("/")
  const locale = locales.includes(maybeLocale as any)
    ? (maybeLocale as (typeof locales)[number])
    : defaultLocale

  const hasLocalePrefix = locales.includes(maybeLocale as any)

  const pathnameNoLocale = hasLocalePrefix
    ? pathname.replace(new RegExp(`^/${maybeLocale}(?=/|$)`), "") || "/"
    : pathname

  return { locale, hasLocalePrefix, pathnameNoLocale }
}

function withLocalePath(opts: {
  path: string
  locale: string
  hasLocalePrefix: boolean
}) {
  if (!opts.path.startsWith("/")) {
    throw new Error("withLocalePath() expects an absolute path")
  }

  if (opts.hasLocalePrefix) {
    return `/${opts.locale}${opts.path}`
  }

  if (opts.locale && opts.locale !== defaultLocale) {
    return `/${opts.locale}${opts.path}`
  }

  return opts.path
}

function isProbablySignedIn(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? ""
  return (
    cookie.includes("better-auth.session") ||
    cookie.includes("__Secure-better-auth.session-token")
  )
}

function getSessionCookieValue(request: NextRequest): string | null {
  return (
    request.cookies.get("__Secure-better-auth.session-token")?.value ??
    request.cookies.get("better-auth.session-token")?.value ??
    request.cookies.get("__Secure-better-auth.session")?.value ??
    request.cookies.get("better-auth.session")?.value ??
    null
  )
}

async function sha256Hex(input: string) {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function getOnboardingCookieHash(request: NextRequest) {
  const sessionCookie = getSessionCookieValue(request)
  if (!sessionCookie) return null
  const hex = await sha256Hex(sessionCookie)
  return hex.slice(0, 16)
}

function parseOnboardedCookie(value: string | undefined | null) {
  if (!value) return null

  // Format: "1.<hash>" or "0.<hash>"
  const [flag, hash] = value.split(".")
  if ((flag !== "0" && flag !== "1") || !hash) return null
  return { flag, hash }
}

export default async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request)

  // If next-intl needs to redirect/rewrite, let it do that first.
  const location = intlResponse.headers.get("location")
  if (location) {
    return intlResponse
  }

  // Avoid redirecting non-idempotent requests.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return intlResponse
  }

  const { locale, hasLocalePrefix, pathnameNoLocale } = parseLocaleFromPath(
    request.nextUrl.pathname
  )

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathnameNoLocale === p || pathnameNoLocale.startsWith(`${p}/`)
  )

  if (!isProtected) {
    return intlResponse
  }

  if (!isProbablySignedIn(request)) {
    const signInPath = withLocalePath({
      path: "/sign-in",
      locale,
      hasLocalePrefix,
    })

    const url = request.nextUrl.clone()
    url.pathname = signInPath
    url.searchParams.set(
      "callbackURL",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )

    return NextResponse.redirect(url)
  }

  const onboardedCookie = parseOnboardedCookie(
    request.cookies.get("kv.onboarded")?.value
  )

  const expectedHash = await getOnboardingCookieHash(request)
  if (
    onboardedCookie &&
    expectedHash &&
    onboardedCookie.hash === expectedHash &&
    onboardedCookie.flag === "1"
  ) {
    return intlResponse
  }

  // Missing/invalid onboarding cookie: check via internal API (Node runtime) once,
  // then cache the result in a session-bound cookie to keep middleware fast.
  try {
    const statusUrl = new URL("/api/onboarding/status", request.nextUrl.origin)

    const r = await fetch(statusUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    const data = (await r.json().catch(() => null)) as {
      isOnboarded?: boolean
      overallStatus?: string
    } | null

    const isOnboarded =
      !!data?.isOnboarded || data?.overallStatus === "completed"

    if (expectedHash) {
      intlResponse.cookies.set({
        name: "kv.onboarded",
        value: `${isOnboarded ? "1" : "0"}.${expectedHash}`,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    if (isOnboarded) {
      return intlResponse
    }
  } catch {
    // If status check fails, be conservative: require onboarding.
  }

  const onboardingPath = withLocalePath({
    path: "/onboarding",
    locale,
    hasLocalePrefix,
  })

  const url = request.nextUrl.clone()
  url.pathname = onboardingPath
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
}
