import { NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { z } from "zod"

import { getQstashClient } from "@/lib/qstash/client"
import { getQstashSigningKeys } from "@/lib/qstash/keys"
import { siteConfig } from "@/lib/site"
import {
  getTranslatorJobInsightChunk,
  getTranslatorJobOutputChunk,
  getTranslatorJobSourceChunk,
  getTranslatorJobStatus,
  setTranslatorJobInsightChunk,
  setTranslatorJobOutputChunk,
  setTranslatorJobSourceChunk,
  setTranslatorJobStatus,
  type TranslatorJobStatus,
} from "@/lib/qstash/translator-jobs"

import { GoogleGenAI } from "@google/genai"
import { SarvamAIClient } from "sarvamai"

import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { generateText } from "ai"

// pdfjs-dist doesn't ship perfect ESM typings for this path in all setups.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

export const runtime = "nodejs"

const payloadSchema = z
  .object({
    userId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    step: z.enum(["init", "chunk"]),
    index: z.number().int().nonnegative().optional(),
  })
  .strict()

const sarvam = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
})

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

function approxTokensFromChars(chars: number) {
  // Conservative heuristic for Latin-ish text.
  return Math.ceil(chars / 4)
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r/g, "").trim()
  if (!cleaned) return []

  // Prefer paragraph boundaries.
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

    // If a single paragraph is too large, split by sentence-ish punctuation.
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

async function translateChunk(opts: { text: string; targetLanguage: string }) {
  const r = await sarvam.text.translate({
    input: opts.text,
    source_language_code: "auto",
    target_language_code: opts.targetLanguage as any,
    speaker_gender: "Male",
  })

  return (r.translated_text || "").trim()
}

async function analyzeChunkMarkdown(opts: {
  translatedText: string
  targetLanguage: string
  stateCode?: string
}) {
  if (!process.env.GROQ_API_KEY?.trim()) return null

  const profile = resolveChatProfile({ profileId: "kisan-vakil" })
  const model = getChatModel(profile)

  const stateHint = opts.stateCode
    ? `\n\nState context: ${opts.stateCode}. If anything depends on state rules, say so plainly.`
    : ""

  const prompt =
    "You are Kisan Vakil. Analyze ONLY the text below (it is one page/segment of a document).\n" +
    "Write in simple farmer-friendly language. Keep it short.\n\n" +
    "Return markdown with these headings:\n" +
    "## What this part says (2 bullets)\n" +
    "## Red flags (max 5 bullets)\n" +
    "## What to verify (max 5 bullets)\n" +
    "## What to do next (max 5 bullets)\n" +
    "## Questions to ask (max 3 bullets)\n" +
    stateHint +
    "\n\nText:\n" +
    `\"\"\"${opts.translatedText.slice(0, 5000)}\"\"\"`

  const result = await generateText({
    model,
    system: profile.system,
    messages: [{ role: "user", content: prompt }],
    temperature: profile.temperature,
    maxOutputTokens: 700,
    providerOptions: profile.providerOptions,
  })

  return result.text.trim()
}

async function publishNextChunk(opts: {
  userId: string
  jobId: string
  index: number
}) {
  const qstash = getQstashClient()
  if (!qstash) throw new Error("QStash not configured")

  await qstash.publishJSON({
    url: `${siteConfig.url}/api/qstash/translator-jobs/process`,
    body: {
      userId: opts.userId,
      jobId: opts.jobId,
      step: "chunk",
      index: opts.index,
    },
  })
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

  const { userId, jobId, step } = parsed.data

  const messageId = request.headers.get("upstash-message-id") ?? undefined
  const retryCount = Number(request.headers.get("upstash-retried") ?? "0")

  const existing = await getTranslatorJobStatus(userId, jobId)
  if (!existing) {
    return NextResponse.json({ ok: true })
  }

  const base = existing

  async function bump(next: Partial<TranslatorJobStatus>) {
    await setTranslatorJobStatus(userId, jobId, {
      ...base,
      ...next,
      state: next.state ?? base.state,
      stage: next.stage ?? base.stage,
      updatedAt: Date.now(),
      messageId: messageId ?? base.messageId,
      retryCount: retryCount || undefined,
    })
  }

  try {
    if (step === "init") {
      await bump({
        state: "extracting",
        stage: "extracting",
        message: "Reading pages…",
      })

      const r = await fetch(existing.fileUrl)
      if (!r.ok) throw new Error(`Failed to fetch file (${r.status})`)

      const buf = new Uint8Array(await r.arrayBuffer())
      const mime = existing.mimeType.toLowerCase()

      const maxTokens = 800 // conservative for small/free models
      const maxChars = Math.max(800, Math.min(2400, maxTokens * 4))

      const chunks: Array<{ pageNumber: number; text: string }> = []

      if (mime.includes("pdf")) {
        const pages = await extractPdfPagesText(buf)

        for (let pageNumber = 1; pageNumber <= pages.length; pageNumber += 1) {
          const pageText = pages[pageNumber - 1] ?? ""
          const parts = splitIntoChunks(pageText, maxChars)

          if (!parts.length) {
            chunks.push({ pageNumber, text: "" })
            continue
          }

          parts.forEach((t) => chunks.push({ pageNumber, text: t }))
        }
      } else if (mime.startsWith("text/")) {
        const text = new TextDecoder().decode(buf)
        const parts = splitIntoChunks(text, maxChars)
        parts.forEach((t) => chunks.push({ pageNumber: 1, text: t }))
      } else if (mime.startsWith("image/")) {
        if (!process.env.GEMINI_API_KEY?.trim()) {
          throw new Error("Missing GEMINI_API_KEY for image OCR")
        }
        const base64 = Buffer.from(buf).toString("base64")
        const extracted = await extractTextFromImage({ base64, mimeType: mime })
        const parts = splitIntoChunks(extracted, maxChars)
        parts.forEach((t) => chunks.push({ pageNumber: 1, text: t }))
      } else {
        throw new Error(`Unsupported mimeType: ${existing.mimeType}`)
      }

      const meaningful = chunks.filter((c) => c.text.trim())
      if (!meaningful.length) {
        await bump({
          state: "failed",
          stage: "extracting",
          message:
            "No readable text found. If this is a scanned PDF, try uploading clear photos instead.",
        })
        return NextResponse.json({ ok: true })
      }

      // Compute per-page part counts.
      const pageToParts = meaningful.reduce<Record<number, number>>(
        (acc, c) => {
          acc[c.pageNumber] = (acc[c.pageNumber] ?? 0) + 1
          return acc
        },
        {}
      )

      const pageToSeen: Record<number, number> = {}

      for (let index = 0; index < meaningful.length; index += 1) {
        const c = meaningful[index]
        pageToSeen[c.pageNumber] = (pageToSeen[c.pageNumber] ?? 0) + 1
        await setTranslatorJobSourceChunk(userId, jobId, index, {
          text: c.text,
          pageNumber: c.pageNumber,
          partNumber: pageToSeen[c.pageNumber],
          partCount: pageToParts[c.pageNumber] ?? 1,
        })
      }

      await setTranslatorJobStatus(userId, jobId, {
        ...existing,
        state: "running",
        stage: "translating",
        updatedAt: Date.now(),
        totalChunks: meaningful.length,
        translatedChunks: 0,
        analyzedChunks: 0,
        message: `Queued ${meaningful.length} chunk(s) (~${approxTokensFromChars(maxChars)} tokens each).`,
        messageId,
        retryCount: retryCount || undefined,
      })

      await publishNextChunk({ userId, jobId, index: 0 })
      return NextResponse.json({ ok: true })
    }

    const index = parsed.data.index
    if (typeof index !== "number") {
      return NextResponse.json({ error: "Missing index" }, { status: 400 })
    }

    const job = await getTranslatorJobStatus(userId, jobId)
    if (!job) return NextResponse.json({ ok: true })
    if (job.state === "done") return NextResponse.json({ ok: true })

    if (index >= job.totalChunks) {
      await setTranslatorJobStatus(userId, jobId, {
        ...job,
        state: "done",
        stage: "done",
        updatedAt: Date.now(),
        message: "Done",
      })
      return NextResponse.json({ ok: true })
    }

    if (!process.env.SARVAM_API_KEY?.trim()) {
      throw new Error("Missing SARVAM_API_KEY")
    }

    const src = await getTranslatorJobSourceChunk(userId, jobId, index)
    if (!src?.text?.trim()) {
      // Skip empty chunk.
      await publishNextChunk({ userId, jobId, index: index + 1 })
      return NextResponse.json({ ok: true })
    }

    const existingOut = await getTranslatorJobOutputChunk(userId, jobId, index)

    if (!existingOut) {
      await setTranslatorJobStatus(userId, jobId, {
        ...job,
        state: "running",
        stage: "translating",
        updatedAt: Date.now(),
        message: `Translating chunk ${index + 1}/${job.totalChunks}…`,
        messageId,
        retryCount: retryCount || undefined,
      })

      const translated = await translateChunk({
        text: src.text,
        targetLanguage: job.targetLanguage,
      })

      await setTranslatorJobOutputChunk(userId, jobId, {
        index,
        pageNumber: src.pageNumber,
        partNumber: src.partNumber,
        partCount: src.partCount,
        text: translated,
      })

      await setTranslatorJobStatus(userId, jobId, {
        ...job,
        state: "running",
        stage: "analyzing",
        updatedAt: Date.now(),
        translatedChunks: Math.max(job.translatedChunks, index + 1),
        message: `Translated ${Math.max(job.translatedChunks, index + 1)}/${job.totalChunks}.`,
        messageId,
        retryCount: retryCount || undefined,
      })
    }

    const alreadyInsight = await getTranslatorJobInsightChunk(
      userId,
      jobId,
      index
    )
    const out =
      existingOut ?? (await getTranslatorJobOutputChunk(userId, jobId, index))

    if (!alreadyInsight && out?.text?.trim()) {
      const insight = await analyzeChunkMarkdown({
        translatedText: out.text,
        targetLanguage: job.targetLanguage,
        stateCode: job.stateCode,
      })

      if (insight) {
        await setTranslatorJobInsightChunk(userId, jobId, index, insight)
        await setTranslatorJobStatus(userId, jobId, {
          ...job,
          state: "running",
          stage: "translating",
          updatedAt: Date.now(),
          analyzedChunks: Math.max(job.analyzedChunks, index + 1),
          message: `Analyzed ${Math.max(job.analyzedChunks, index + 1)}/${job.totalChunks}.`,
          messageId,
          retryCount: retryCount || undefined,
        })
      }
    }

    if (index + 1 < job.totalChunks) {
      await publishNextChunk({ userId, jobId, index: index + 1 })
      return NextResponse.json({ ok: true })
    }

    const final = await getTranslatorJobStatus(userId, jobId)
    if (final) {
      await setTranslatorJobStatus(userId, jobId, {
        ...final,
        state: "done",
        stage: "done",
        updatedAt: Date.now(),
        message: "Done",
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)

    const job = await getTranslatorJobStatus(userId, jobId)
    if (job) {
      await setTranslatorJobStatus(userId, jobId, {
        ...job,
        state: "failed",
        updatedAt: Date.now(),
        message: e instanceof Error ? e.message : "Processing failed",
        messageId,
        retryCount: retryCount || undefined,
      })
    }

    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
