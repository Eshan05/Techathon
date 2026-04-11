export type SiteConfig = {
  name: string
  description: string
  author: {
    name: string
    url?: string
  }
  url: string
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const withProtocol = vercel.startsWith("http")
      ? vercel
      : `https://${vercel}`
    return withProtocol.replace(/\/$/, "")
  }

  return "http://localhost:3000"
}

export function isLoopbackSiteUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    )
  } catch {
    return false
  }
}

export const siteConfig: SiteConfig = {
  name: "Kisan Vakil",
  description:
    "Plain-language help for land records, schemes, notices, disputes, and documents.",
  author: {
    name: "Eshan",
    url: "https://github.com/Eshan05",
  },
  url: resolveSiteUrl(),
}
