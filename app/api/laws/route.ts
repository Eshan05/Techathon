import { NextResponse } from "next/server"
import { z } from "zod"

import { generateText } from "ai"

import { auth } from "@/lib/auth/auth"
import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { getAllLaws } from "@/lib/laws/store"
import { resolveLawLocale } from "@/lib/laws/i18n"
import { searchLaws } from "@/lib/laws/search"

export const runtime = "nodejs"

const searchParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  locale: z.string().trim().optional(),
  mode: z.enum(["keyword", "nl"]).optional().default("keyword"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

const keywordExpansionSchema = z
  .object({
    keywords: z.array(z.string().trim().min(1)).min(1).max(18),
  })
  .strict()

function getLocaleInstructions(locale: "en" | "hi" | "mr") {
  switch (locale) {
    case "en":
      return "Use simple English for any generated keywords."
    case "mr":
      return "Prefer Marathi keywords; include common transliterations if useful."
    case "hi":
    default:
      return "Prefer Hindi keywords; include common transliterations if useful."
  }
}

async function expandNaturalLanguageQuery(input: {
  query: string
  locale: "en" | "hi" | "mr"
}): Promise<string> {
  const q = input.query.trim()
  if (!q) return ""

  if (!process.env.GROQ_API_KEY?.trim()) {
    // Fall back to plain keyword scoring.
    return q
  }

  const profile = resolveChatProfile({ profileId: "default" })
  const model = getChatModel(profile)

  const system = [
    "You are a search helper for an Indian farmer legal app.",
    "Task: extract short search keywords/phrases for matching a laws catalog.",
    'Output MUST be strict JSON: {"keywords":[...]} with 5-12 items.',
    "Include relevant local terms like 7/12, 8A, satbara, mutation, NA if applicable.",
    getLocaleInstructions(input.locale),
  ].join("\n")

  const result = await generateText({
    model,
    system,
    messages: [{ role: "user", content: q }],
    temperature: 0.2,
    maxOutputTokens: 250,
  })

  const text = result.text?.trim() ?? ""
  const jsonStart = text.indexOf("{")
  const jsonEnd = text.lastIndexOf("}")
  const maybeJson =
    jsonStart >= 0 && jsonEnd > jsonStart
      ? text.slice(jsonStart, jsonEnd + 1)
      : text

  try {
    const parsed = keywordExpansionSchema.safeParse(JSON.parse(maybeJson))
    if (!parsed.success) return q
    return parsed.data.keywords.join(" ")
  } catch {
    return q
  }
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsedParams = searchParamsSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    locale: url.searchParams.get("locale") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsedParams.error.flatten() },
      { status: 400 }
    )
  }

  const locale = resolveLawLocale(parsedParams.data.locale)
  const laws = getAllLaws()

  const query =
    parsedParams.data.mode === "nl"
      ? await expandNaturalLanguageQuery({ query: parsedParams.data.q, locale })
      : parsedParams.data.q

  const hits = searchLaws({
    laws,
    query,
    locale,
    limit: parsedParams.data.limit,
  })

  return NextResponse.json({
    data: hits,
    meta: {
      mode: parsedParams.data.mode,
      locale,
      query: parsedParams.data.q,
      expandedQuery: parsedParams.data.mode === "nl" ? query : undefined,
      count: hits.length,
    },
  })
}
