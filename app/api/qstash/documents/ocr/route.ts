import { NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/db"
import { documentOcrChunks, documents } from "@/lib/db/schema"
import { getQstashSigningKeys } from "@/lib/qstash/keys"
import { setDocumentOcrJobStatus } from "@/lib/qstash/document-ocr-jobs"

import { GoogleGenAI } from "@google/genai"

// pdfjs-dist doesn't ship perfect ESM typings for this path in all setups.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

export const runtime = "nodejs"

const payloadSchema = z
  .object({
    userId: z.string().trim().min(1),
    documentId: z.string().trim().min(1),
  })
  .strict()

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

function splitIntoChunks(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r/g, "").trim()
  if (!cleaned) return []

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ""

  function flush() {
    const out = buf.trim()
    if (out) chunks.push(out)
    buf = ""
  }

  for (const p of paragraphs) {
    const next = buf ? `${buf}\n\n${p}` : p

    if (next.length <= maxChars) {
      buf = next
      continue
    }

    if (!buf) {
      const parts = p.split(/(?<=[.!?।])\s+/)
      let local = ""
      for (const part of parts) {
        const candidate = local ? `${local} ${part}` : part
        if (candidate.length <= maxChars) {
          local = candidate
        } else {
          if (local) chunks.push(local.trim())
          local = part
        }
      }
      if (local.trim()) chunks.push(local.trim())
      continue
    }

    flush()
    buf = p
  }

  flush()
  return chunks
}

async function extractPdfPagesText(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes, disableWorker: true } as any)
  const pdf = await task.promise

  const pages: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const strings = (content.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean)

    pages.push(strings.join(" "))
  }

  return pages
}

async function extractTextFromImage(opts: {
  base64: string
  mimeType: string
}) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured for image OCR")
  }

  const prompt =
    "Read the attached image carefully and extract ALL the text as plain text. Do not translate. Preserve line breaks when it helps readability."

  const resp = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: opts.base64,
              mimeType: opts.mimeType,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: { temperature: 0.1 },
  })

  return (resp.text || "").trim()
}

function computeAutoTags(opts: { kind: string; text: string }) {
  const tags = new Set<string>()

  tags.add("OCR")

  const t = opts.text.toLowerCase()
  const k = (opts.kind || "").toLowerCase()

  if (t.length > 30) tags.add("Searchable")

  if (
    k.includes("land") ||
    /\b(7\/12|rtc|ror|jamabandi|khata|khasra)\b/i.test(t)
  ) {
    tags.add("Land")
  }

  if (
    k.includes("notice") ||
    /\b(legal notice|summons|court|case no|section|ipc|crpc)\b/i.test(t)
  ) {
    tags.add("Legal")
  }

  if (
    k.includes("agreement") ||
    /\b(agreement|contract|terms|party)\b/i.test(t)
  ) {
    tags.add("Agreement")
  }

  return Array.from(tags)
}

export async function POST(request: Request) {
  const signature =
    request.headers.get("upstash-signature") ??
    request.headers.get("Upstash-Signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  const keys = getQstashSigningKeys()
  if (!keys) {
    return NextResponse.json(
      { error: "QStash signing keys not configured" },
      { status: 500 }
    )
  }

  const body = await request.text()

  const url = new URL(request.url)
  const subject = `${url.origin}${url.pathname}`

  const receiver = new Receiver({
    currentSigningKey: keys.currentSigningKey,
    nextSigningKey: keys.nextSigningKey,
  })

  try {
    await receiver.verify({ signature, body, url: subject })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { userId, documentId } = parsed.data
  const messageId = request.headers.get("upstash-message-id") ?? undefined

  await setDocumentOcrJobStatus(userId, documentId, {
    state: "extracting",
    updatedAt: Date.now(),
    messageId,
    message: "Starting OCR…",
  })

  try {
    const row = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.userId, userId)),
    })

    if (!row) {
      await setDocumentOcrJobStatus(userId, documentId, {
        state: "failed",
        updatedAt: Date.now(),
        message: "Document not found",
        messageId,
      })
      return NextResponse.json({ ok: true })
    }

    if (!row.url || !row.mimeType) {
      await setDocumentOcrJobStatus(userId, documentId, {
        state: "failed",
        updatedAt: Date.now(),
        message: "Document has no URL or mime type",
        messageId,
      })
      return NextResponse.json({ ok: true })
    }

    const r = await fetch(row.url)
    if (!r.ok) {
      throw new Error(`Failed to fetch file (${r.status})`)
    }

    const bytes = new Uint8Array(await r.arrayBuffer())

    let pages: string[] = []

    if (row.mimeType.includes("pdf")) {
      pages = await extractPdfPagesText(bytes)
    } else if (row.mimeType.startsWith("image/")) {
      const base64 = Buffer.from(bytes).toString("base64")
      pages = [await extractTextFromImage({ base64, mimeType: row.mimeType })]
    } else if (row.mimeType === "text/plain") {
      pages = [new TextDecoder().decode(bytes)]
    } else {
      throw new Error(`Unsupported mime type for OCR: ${row.mimeType}`)
    }

    const maxCharsPerChunk = 2600

    await setDocumentOcrJobStatus(userId, documentId, {
      state: "chunking",
      updatedAt: Date.now(),
      messageId,
      message: "Splitting into chunks…",
    })

    const chunks: Array<{
      userId: string
      documentId: string
      chunkIndex: number
      pageNumber: number
      partNumber: number
      partCount: number
      text: string
      createdAt: Date
    }> = []

    let globalIndex = 0
    let charCount = 0

    for (let i = 0; i < pages.length; i += 1) {
      const pageText = pages[i] ?? ""
      const parts = splitIntoChunks(pageText, maxCharsPerChunk)
      const partCount = Math.max(1, parts.length)

      for (let part = 0; part < parts.length; part += 1) {
        const text = parts[part] ?? ""
        if (!text.trim()) continue

        chunks.push({
          userId,
          documentId,
          chunkIndex: globalIndex,
          pageNumber: i + 1,
          partNumber: part + 1,
          partCount,
          text,
          createdAt: new Date(),
        })

        charCount += text.length
        globalIndex += 1
      }

      await setDocumentOcrJobStatus(userId, documentId, {
        state: "chunking",
        updatedAt: Date.now(),
        messageId,
        message: `Prepared page ${i + 1}/${pages.length}`,
        totalChunks: undefined,
        processedChunks: undefined,
      })
    }

    await setDocumentOcrJobStatus(userId, documentId, {
      state: "saving",
      updatedAt: Date.now(),
      messageId,
      message: "Saving to vault search index…",
      totalChunks: chunks.length,
      processedChunks: 0,
    })

    await db
      .delete(documentOcrChunks)
      .where(
        and(
          eq(documentOcrChunks.userId, userId),
          eq(documentOcrChunks.documentId, documentId)
        )
      )

    const batchSize = 50
    for (let start = 0; start < chunks.length; start += batchSize) {
      const batch = chunks.slice(start, start + batchSize)
      if (batch.length) {
        await db.insert(documentOcrChunks).values(batch)
      }

      await setDocumentOcrJobStatus(userId, documentId, {
        state: "saving",
        updatedAt: Date.now(),
        messageId,
        message: "Saving chunks…",
        totalChunks: chunks.length,
        processedChunks: Math.min(chunks.length, start + batch.length),
      })
    }

    const joinedPreview = chunks
      .slice(0, 3)
      .map((c) => c.text)
      .join("\n\n")

    const tags = computeAutoTags({ kind: row.kind, text: joinedPreview })

    await db
      .update(documents)
      .set({
        ocrExtractedAt: new Date(),
        ocrCharCount: charCount,
        autoTagsJson: JSON.stringify(tags),
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))

    await setDocumentOcrJobStatus(userId, documentId, {
      state: "done",
      updatedAt: Date.now(),
      messageId,
      message: chunks.length
        ? `Saved ${chunks.length} chunks.`
        : "No text found in this file.",
      totalChunks: chunks.length,
      processedChunks: chunks.length,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)

    await setDocumentOcrJobStatus(userId, documentId, {
      state: "failed",
      updatedAt: Date.now(),
      messageId,
      message: e instanceof Error ? e.message : "OCR failed",
    })

    return NextResponse.json({ error: "OCR failed" }, { status: 500 })
  }
}
