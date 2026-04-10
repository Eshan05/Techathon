import { NextResponse } from "next/server"
import { and, eq, or, sql } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { documentOcrChunks, documents } from "@/lib/db/schema"
import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { generateText } from "ai"

export const runtime = "nodejs"

const bodySchema = z
  .object({
    query: z.string().trim().min(2).max(400),
    documentId: z.string().trim().min(1).max(64).optional(),
    language: z.string().trim().min(2).max(16).optional(),
  })
  .strict()

function tokenize(q: string) {
  return q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3)
    .slice(0, 6)
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Chat model is not configured" },
      { status: 501 }
    )
  }

  const userId = session.user.id
  const q = parsed.data.query
  const tokens = tokenize(q)

  if (tokens.length === 0) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 })
  }

  const tokenWhere = or(
    ...tokens.map((t) => sql`${documentOcrChunks.text} LIKE ${`%${t}%`}`)
  )

  const where = and(
    eq(documents.userId, userId),
    eq(documentOcrChunks.userId, userId),
    eq(documentOcrChunks.documentId, documents.id),
    parsed.data.documentId
      ? eq(documentOcrChunks.documentId, parsed.data.documentId)
      : sql`1 = 1`,
    tokenWhere
  )

  const sources = await db
    .select({
      documentId: documentOcrChunks.documentId,
      title: documents.title,
      chunkIndex: documentOcrChunks.chunkIndex,
      pageNumber: documentOcrChunks.pageNumber,
      text: documentOcrChunks.text,
    })
    .from(documentOcrChunks)
    .innerJoin(documents, eq(documents.id, documentOcrChunks.documentId))
    .where(where)
    .limit(8)

  if (!sources.length) {
    return NextResponse.json({
      data: {
        answer:
          "I could not find that in your vault yet. Try running OCR on the relevant document first.",
        sources: [],
      },
    })
  }

  const context = sources
    .map((s, i) => {
      const clipped = s.text.replace(/\s+/g, " ").trim().slice(0, 900)
      return `Source ${i + 1}: ${s.title} (page ${s.pageNumber}, chunk ${s.chunkIndex})\n${clipped}`
    })
    .join("\n\n")

  const profile = resolveChatProfile({ profileId: "kisan-vakil" })
  const model = getChatModel(profile)

  const prompt =
    "You are Kisan Vakil. Answer the farmer's question using ONLY the provided vault sources. " +
    "Use very simple language and short bullets when helpful. " +
    "If the sources do not contain the answer, say so clearly. " +
    "Always end with a short 'What to do next' checklist (2-4 bullets).\n\n" +
    `Question: ${q}\n\n` +
    `Vault sources:\n${context}`

  const result = await generateText({
    model,
    system: profile.system,
    messages: [{ role: "user", content: prompt }],
    temperature: profile.temperature,
    maxOutputTokens: 650,
    providerOptions: profile.providerOptions,
  })

  return NextResponse.json({
    data: {
      answer: result.text.trim(),
      sources: sources.map((s) => ({
        documentId: s.documentId,
        title: s.title,
        pageNumber: s.pageNumber,
        chunkIndex: s.chunkIndex,
      })),
    },
  })
}
