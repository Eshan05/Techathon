import { NextResponse } from "next/server"
import { z } from "zod"

import { generateText } from "ai"

import { auth } from "@/lib/auth/auth"
import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { resolveLawLocale } from "@/lib/laws/i18n"
import { getLawById, getAllLaws } from "@/lib/laws/store"

export const runtime = "nodejs"
export const maxDuration = 30

const bodySchema = z
  .object({
    locale: z.string().optional(),
    question: z.string().trim().min(1).max(800).optional(),
    selectionText: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()

function getLocaleInstructions(locale: "en" | "hi" | "mr") {
  switch (locale) {
    case "en":
      return [
        "Reply in simple English.",
        "Prefer short bullets and practical steps.",
      ].join("\n")
    case "mr":
      return [
        "Reply in simple Marathi.",
        "Prefer short bullets and practical steps.",
      ].join("\n")
    case "hi":
    default:
      return [
        "Reply in simple Hindi (or Hinglish if needed).",
        "Prefer short bullets and practical steps.",
      ].join("\n")
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY. Add it to .env.local." },
      { status: 500 }
    )
  }

  const { id } = await ctx.params

  const json = await request.json().catch(() => null)
  const parsedBody = bodySchema.safeParse(json)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsedBody.error.flatten() },
      { status: 400 }
    )
  }

  const locale = resolveLawLocale(parsedBody.data.locale)

  const law = getLawById(id)
  if (!law) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const all = getAllLaws()
  const related = law.relatedIds
    .map((rid) => all.find((l) => l.id === rid))
    .filter(Boolean)
    .slice(0, 6)
    .map((l) => `${l!.title[locale]} (${l!.year ?? ""})`.trim())

  const question =
    parsedBody.data.question ??
    "Explain this in simple words and tell me what I should do next."

  const selectionBlock = parsedBody.data.selectionText
    ? `\n\nSelected text:\n"""${parsedBody.data.selectionText}"""\n`
    : ""

  const lawContext = {
    title: law.title[locale],
    shortTitle: law.shortTitle?.[locale] ?? null,
    year: law.year ?? null,
    status: law.status,
    kind: law.kind,
    jurisdiction: law.jurisdiction,
    topics: law.topics,
    summary: law.plainLanguage[locale].summary,
    whenApplies: law.plainLanguage[locale].whenApplies,
    keyPoints: law.plainLanguage[locale].keyPoints,
    whatToDo: law.plainLanguage[locale].whatToDo,
    requiredDocs: law.plainLanguage[locale].requiredDocs,
    redFlags: law.plainLanguage[locale].redFlags,
    edgeCases: law.plainLanguage[locale].edgeCases,
    sideEffects: law.plainLanguage[locale].sideEffects,
    sources: law.sources.map((s) => ({ label: s.label, url: s.url })),
    relatedLaws: related,
  }

  const system = [
    resolveChatProfile({ profileId: "kisan-vakil" }).system,
    getLocaleInstructions(locale),
    "You will answer questions about a specific law entry from our internal catalog.",
    "Do NOT invent section numbers or exact legal quotes.",
    "If the question needs region-specific confirmation or latest notification, say so and suggest what to verify and where.",
    "Output format:\n- Simple meaning (2-4 bullets)\n- What it changes for me (3-6 bullets)\n- What I should do next (steps)\n- Documents/Proof to keep\n- Edge cases / Exceptions\n- Red flags / fraud risks\n- Related laws (why they matter)",
  ].join("\n\n")

  const prompt = [
    `Question: ${question}`,
    selectionBlock,
    "Law context (JSON):",
    JSON.stringify(lawContext),
  ].join("\n")

  const model = await getChatModel(
    resolveChatProfile({ profileId: "kisan-vakil" })
  )

  const result = await generateText({
    model,
    system,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxOutputTokens: 900,
  })

  return NextResponse.json({
    data: {
      lawId: law.id,
      text: result.text,
    },
  })
}
