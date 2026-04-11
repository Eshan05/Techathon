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
  type TranslatorInsight,
  type TranslatorJobStatus,
  type TranslatorOcrPreference,
  TranslatorJobsStoreMisconfiguredError,
} from "@/lib/qstash/translator-jobs"

import { SarvamAIClient } from "sarvamai"

import {
  getHttpStatusFromUnknown,
  retryWithExponentialBackoff,
} from "@/lib/ai/retry"

import { extractTextWithSarvamDocumentIntelligence } from "@/lib/ai/sarvam-document-intelligence"

import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { generateText } from "ai"

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

function resolveOcrOrder(_pref?: TranslatorOcrPreference) {
  // Sarvam-only for OCR in this pipeline.
  return ["sarvam"] as const
}

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

async function extractTextWithSarvamOcr(opts: {
  bytes: Uint8Array
  mimeType: string
  language: string
  preference?: TranslatorOcrPreference
  bumpStatus: (message: string) => Promise<void>
}): Promise<string> {
  // Sarvam-only.
  void resolveOcrOrder(opts.preference)

  return await retryWithExponentialBackoff(
    async () => {
      return await extractTextWithSarvamDocumentIntelligence({
        bytes: opts.bytes,
        mimeType: opts.mimeType,
        language: opts.language,
        onProgress: async (p) => {
          const pagesLabel = p.totalPages
            ? `${p.pagesProcessed}/${p.totalPages}`
            : `${p.pagesProcessed}`
          await opts.bumpStatus(`Sarvam OCR: ${pagesLabel} pages…`)
        },
      })
    },
    {
      maxAttempts: 3,
      baseDelayMs: 700,
      maxDelayMs: 6000,
      jitterRatio: 0.25,
      shouldRetry: (e) => {
        const status = getHttpStatusFromUnknown(e)
        return status === 429 || status === 503
      },
      onRetry: async (info) => {
        await opts.bumpStatus(
          `Sarvam OCR busy — retrying (${info.attempt + 1}/${info.maxAttempts})…`
        )
      },
    }
  )
}

async function translateChunk(opts: {
  text: string
  targetLanguage: string
}): Promise<string> {
  const MAX_CHARS = 950

  function hardSplit(text: string) {
    const out: string[] = []
    for (let i = 0; i < text.length; i += MAX_CHARS) {
      out.push(text.slice(i, i + MAX_CHARS))
    }
    return out
  }

  const parts = splitIntoChunks(opts.text, MAX_CHARS)
    .flatMap((p) => (p.length > MAX_CHARS ? hardSplit(p) : [p]))
    .map((p) => p.trim())
    .filter(Boolean)

  const translatedParts: string[] = []

  for (const part of parts.length ? parts : [opts.text]) {
    const r = await sarvam.text.translate(
      {
        input: part,
        source_language_code: "auto",
        target_language_code: opts.targetLanguage as any,
        speaker_gender: "Male",
      },
      {
        timeoutInSeconds: 60,
        maxRetries: 6,
      }
    )

    const t = (r.translated_text || "").trim()
    if (t) translatedParts.push(t)
  }

  return translatedParts.join("\n\n").trim()
}

function normalizeInsightList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return [] as string[]
  const out: string[] = []

  for (const item of value) {
    if (typeof item !== "string") continue
    const trimmed = item.replace(/\s+/g, " ").trim()
    if (!trimmed) continue
    out.push(trimmed.slice(0, 220))
    if (out.length >= maxItems) break
  }

  return out
}

function safeExtractJson(text: string) {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return trimmed.slice(start, end + 1)
}

async function analyzeChunkInsight(opts: {
  translatedText: string
  targetLanguage: string
  stateCode?: string
  farmerContext?: TranslatorJobStatus["farmerContext"]
}): Promise<TranslatorInsight | null> {
  if (!process.env.GROQ_API_KEY?.trim()) return null

  const profile = resolveChatProfile({ profileId: "kisan-vakil" })
  const model = await getChatModel(profile)

  const stateHint = opts.stateCode
    ? `\nState context (may affect stamp duty, registration, land revenue rules): ${opts.stateCode}.`
    : ""

  const farmerHint = opts.farmerContext
    ? `\nFarmer context: supportNeed=${opts.farmerContext.supportNeed ?? "unknown"}, state=${opts.farmerContext.state ?? "unknown"}, district=${opts.farmerContext.district ?? "unknown"}.`
    : ""

  const prompt =
    "You are Kisan Vakil. Analyze ONLY the text below (one page/segment).\n" +
    "Write in very simple farmer-friendly language. Keep items short.\n" +
    "Return ONLY valid JSON (no markdown, no code fences) with exactly these keys:\n" +
    "{\n" +
    '  "normal": string[],\n' +
    '  "redFlags": string[],\n' +
    '  "warnings": string[],\n' +
    '  "clarify": string[],\n' +
    '  "contextualBad": string[]\n' +
    "}\n" +
    "\nRules:\n" +
    "- normal: what this part means (<=3 bullets)\n" +
    "- redFlags: risky / fraud / hidden obligations (<=6 bullets)\n" +
    "- warnings: important checks before signing (<=6 bullets)\n" +
    "- clarify: questions to ask / missing info (<=6 bullets)\n" +
    "- contextualBad: risks specific to the farmer/state context (<=6 bullets). If a point depends on state rules, say 'state-dependent'.\n" +
    stateHint +
    farmerHint +
    "\n\nText:\n" +
    `\"\"\"${opts.translatedText.slice(0, 5500)}\"\"\"`

  const result = await generateText({
    model,
    system: profile.system,
    messages: [{ role: "user", content: prompt }],
    temperature: profile.temperature,
    maxOutputTokens: 550,
    providerOptions: profile.providerOptions,
  })

  const raw = result.text.trim()
  const jsonSlice = safeExtractJson(raw)

  if (!jsonSlice) {
    return {
      normal: [],
      redFlags: [],
      warnings: [],
      clarify: [],
      contextualBad: [],
      raw,
    }
  }

  try {
    const parsed = JSON.parse(jsonSlice) as any
    return {
      normal: normalizeInsightList(parsed?.normal, 3),
      redFlags: normalizeInsightList(parsed?.redFlags, 6),
      warnings: normalizeInsightList(parsed?.warnings, 6),
      clarify: normalizeInsightList(parsed?.clarify, 6),
      contextualBad: normalizeInsightList(parsed?.contextualBad, 6),
    }
  } catch {
    return {
      normal: [],
      redFlags: [],
      warnings: [],
      clarify: [],
      contextualBad: [],
      raw,
    }
  }
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

  let existing: Awaited<ReturnType<typeof getTranslatorJobStatus>>
  try {
    existing = await getTranslatorJobStatus(userId, jobId)
  } catch (e) {
    if (e instanceof TranslatorJobsStoreMisconfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    throw e
  }
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
      const computedChars = Math.max(800, Math.min(2400, maxTokens * 4))
      // Sarvam translate can hard-fail above 1000 chars (mayura:v1).
      const maxChars = Math.min(950, computedChars)

      const chunks: Array<{ pageNumber: number; text: string }> = []

      if (mime.includes("pdf")) {
        const extracted = await extractTextWithSarvamOcr({
          bytes: buf,
          mimeType: "application/pdf",
          language: existing.targetLanguage,
          preference: existing.ocrPreference,
          bumpStatus: async (message) => {
            await bump({
              state: "extracting",
              stage: "extracting",
              message,
            })
          },
        })
        const parts = splitIntoChunks(extracted, maxChars)
        parts.forEach((t) => chunks.push({ pageNumber: 1, text: t }))
      } else if (mime.startsWith("text/")) {
        const text = new TextDecoder().decode(buf)
        const parts = splitIntoChunks(text, maxChars)
        parts.forEach((t) => chunks.push({ pageNumber: 1, text: t }))
      } else if (mime.startsWith("image/")) {
        const extracted = await extractTextWithSarvamOcr({
          bytes: buf,
          mimeType: mime,
          language: existing.targetLanguage,
          preference: existing.ocrPreference,
          bumpStatus: async (message) => {
            await bump({
              state: "extracting",
              stage: "extracting",
              message,
            })
          },
        })
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
      const insight = await analyzeChunkInsight({
        translatedText: out.text,
        targetLanguage: job.targetLanguage,
        stateCode: job.stateCode,
        farmerContext: job.farmerContext,
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
