import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import { resolveLawLocale } from "@/lib/laws/i18n"
import { getLawById, getAllLaws } from "@/lib/laws/store"

export const runtime = "nodejs"

const paramsSchema = z.object({
  id: z.string().min(1),
})

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = paramsSchema.parse(await ctx.params)

  const url = new URL(request.url)
  const locale = resolveLawLocale(url.searchParams.get("locale"))

  const law = getLawById(id)
  if (!law) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const all = getAllLaws()
  const related = law.relatedIds
    .map((rid) => all.find((l) => l.id === rid))
    .filter(Boolean)
    .map((l) => ({
      id: l!.id,
      title: l!.title[locale],
      shortTitle: l!.shortTitle?.[locale],
      year: l!.year,
      kind: l!.kind,
      status: l!.status,
      topics: l!.topics,
      snippet: l!.plainLanguage[locale].summary,
    }))

  return NextResponse.json({
    data: {
      id: law.id,
      priority: law.priority,
      jurisdiction: law.jurisdiction,
      kind: law.kind,
      status: law.status,
      year: law.year,
      title: law.title[locale],
      shortTitle: law.shortTitle?.[locale],
      topics: law.topics,
      keywords: law.keywords[locale],
      plainLanguage: law.plainLanguage[locale],
      legal: law.legal ?? null,
      sources: law.sources,
      relatedIds: law.relatedIds,
      related,
    },
  })
}
