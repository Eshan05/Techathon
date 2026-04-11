import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { ensureFarmerProfilesSchema } from "@/lib/db/compat"
import { siteConfig } from "@/lib/site"
import { getQstashClient } from "@/lib/qstash/client"
import { db } from "@/lib/db/db"
import { farmerProfiles } from "@/lib/db/schema"
import { toUserMessage } from "@/lib/errors"
import {
  setTranslatorJobInsightChunk,
  setTranslatorJobOutputChunk,
  setTranslatorJobStatus,
  type TranslatorInsight,
  type TranslatorJobStatus,
  type TranslatorOcrPreference,
  TranslatorJobsStoreMisconfiguredError,
} from "@/lib/qstash/translator-jobs"

import { SarvamAIClient } from "sarvamai"

import { extractTextWithSarvamDocumentIntelligence } from "@/lib/ai/sarvam-document-intelligence"
import {
  getHttpStatusFromUnknown,
  retryWithExponentialBackoff,
} from "@/lib/ai/retry"

import { getChatModel, resolveChatProfile } from "@/lib/ai"
import { generateText } from "ai"

export const runtime = "nodejs"

const sarvam = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
})

function resolveOcrOrder(_pref?: TranslatorOcrPreference) {
  // Sarvam-only for OCR in this pipeline.
  return ["sarvam"] as const
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r/g, "").trim()
  if (!cleaned) return []

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ""

  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push(t)
    buf = ""
  }

  for (const p of paragraphs) {
    if (!buf) {
      buf = p
      continue
    }

    if ((buf + "\n\n" + p).length <= maxChars) {
      buf = buf + "\n\n" + p
      continue
    }

    if (buf.length > maxChars) {
      const words = buf.split(/\s+/).filter(Boolean)
      let local = ""
      for (const w of words) {
        if (!local) {
          local = w
          continue
        }
        if ((local + " " + w).length <= maxChars) {
          local = local + " " + w
          continue
        }
        if (local.trim()) chunks.push(local.trim())
        local = w
      }
      if (local.trim()) chunks.push(local.trim())
      buf = p
      continue
    }

    flush()
    buf = p
  }

  flush()
  return chunks
}

async function translateChunk(opts: {
  text: string
  targetLanguage: string
}): Promise<string> {
  if (!process.env.SARVAM_API_KEY?.trim()) {
    throw new Error("Missing SARVAM_API_KEY")
  }

  const MAX_CHARS = 950

  const hardSplit = (text: string) => {
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

async function extractTextWithSarvamOcr(opts: {
  bytes: Uint8Array
  mimeType: string
  language: string
  preference?: TranslatorOcrPreference
  onStatus?: (message: string) => void | Promise<void>
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
          await opts.onStatus?.(`Sarvam OCR: ${pagesLabel} pages…`)
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
        await opts.onStatus?.(
          `Sarvam OCR busy — retrying (${info.attempt + 1}/${info.maxAttempts})…`
        )
      },
    }
  )
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
    `"""${opts.translatedText.slice(0, 5500)}"""`

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

async function processTranslatorJobLocally(opts: {
  userId: string
  jobId: string
  fileUrl: string
  mimeType: string
  targetLanguage: string
  stateCode?: string
  baseStatus: TranslatorJobStatus
}) {
  await setTranslatorJobStatus(opts.userId, opts.jobId, {
    ...opts.baseStatus,
    state: "extracting",
    stage: "extracting",
    updatedAt: Date.now(),
    message: "Processing locally (dev)…",
  })

  const r = await fetch(opts.fileUrl)
  if (!r.ok) throw new Error(`Failed to fetch file (${r.status})`)

  const bytes = new Uint8Array(await r.arrayBuffer())
  const mime = opts.mimeType.toLowerCase()

  const maxCharsPerChunk = 950

  const tasks: Array<{
    pageNumber: number
    partNumber: number
    partCount: number
    text: string
  }> = []

  let pageCount = 1

  if (mime.includes("pdf")) {
    const extracted = await extractTextWithSarvamOcr({
      bytes,
      mimeType: "application/pdf",
      language: opts.targetLanguage,
      preference: opts.baseStatus.ocrPreference,
      onStatus: async (message) => {
        await setTranslatorJobStatus(opts.userId, opts.jobId, {
          ...opts.baseStatus,
          state: "extracting",
          stage: "extracting",
          updatedAt: Date.now(),
          message,
        })
      },
    })

    const parts = splitIntoChunks(extracted, maxCharsPerChunk)
    const meaningful = parts.filter((p) => p.trim())
    const partCount = meaningful.length
    pageCount = 1
    meaningful.forEach((t, i) =>
      tasks.push({
        pageNumber: 1,
        partNumber: i + 1,
        partCount,
        text: t,
      })
    )
  } else if (mime.startsWith("text/")) {
    const extractedText = new TextDecoder().decode(bytes)
    const parts = splitIntoChunks(extractedText, maxCharsPerChunk)
    const meaningful = parts.filter((p) => p.trim())
    const partCount = meaningful.length
    meaningful.forEach((t, i) =>
      tasks.push({
        pageNumber: 1,
        partNumber: i + 1,
        partCount,
        text: t,
      })
    )
  } else if (mime.startsWith("image/")) {
    const extractedText = await extractTextWithSarvamOcr({
      bytes,
      mimeType: mime,
      language: opts.targetLanguage,
      preference: opts.baseStatus.ocrPreference,
      onStatus: async (message) => {
        await setTranslatorJobStatus(opts.userId, opts.jobId, {
          ...opts.baseStatus,
          state: "extracting",
          stage: "extracting",
          updatedAt: Date.now(),
          message,
        })
      },
    })

    const parts = splitIntoChunks(extractedText, maxCharsPerChunk)
    const meaningful = parts.filter((p) => p.trim())
    const partCount = meaningful.length
    meaningful.forEach((t, i) =>
      tasks.push({
        pageNumber: 1,
        partNumber: i + 1,
        partCount,
        text: t,
      })
    )
  } else {
    throw new Error(`Unsupported mimeType: ${opts.mimeType}`)
  }

  const meaningfulTasks = tasks.filter((t) => t.text.trim())
  if (!meaningfulTasks.length) {
    throw new Error("No readable text found")
  }

  await setTranslatorJobStatus(opts.userId, opts.jobId, {
    ...opts.baseStatus,
    state: "running",
    stage: "translating",
    updatedAt: Date.now(),
    totalChunks: meaningfulTasks.length,
    translatedChunks: 0,
    analyzedChunks: 0,
    message: `Translating ${meaningfulTasks.length} chunk(s) locally…`,
  })

  for (let index = 0; index < meaningfulTasks.length; index += 1) {
    const task = meaningfulTasks[index]
    if (!task) continue

    await setTranslatorJobStatus(opts.userId, opts.jobId, {
      ...opts.baseStatus,
      state: "running",
      stage: "translating",
      updatedAt: Date.now(),
      totalChunks: meaningfulTasks.length,
      translatedChunks: index,
      analyzedChunks: index,
      message: `Translating page ${task.pageNumber}/${pageCount} (${task.partNumber}/${task.partCount})…`,
    })

    const translated = await translateChunk({
      text: task.text,
      targetLanguage: opts.targetLanguage,
    })

    await setTranslatorJobOutputChunk(opts.userId, opts.jobId, {
      index,
      pageNumber: task.pageNumber,
      partNumber: task.partNumber,
      partCount: task.partCount,
      text: translated,
    })

    await setTranslatorJobStatus(opts.userId, opts.jobId, {
      ...opts.baseStatus,
      state: "running",
      stage: "analyzing",
      updatedAt: Date.now(),
      totalChunks: meaningfulTasks.length,
      translatedChunks: index + 1,
      analyzedChunks: index,
      message: `Translated ${index + 1}/${meaningfulTasks.length}. Checking risks…`,
    })

    const insight = await analyzeChunkInsight({
      translatedText: translated,
      targetLanguage: opts.targetLanguage,
      stateCode: opts.stateCode,
      farmerContext: opts.baseStatus.farmerContext,
    })

    if (insight) {
      await setTranslatorJobInsightChunk(
        opts.userId,
        opts.jobId,
        index,
        insight
      )
    }

    await setTranslatorJobStatus(opts.userId, opts.jobId, {
      ...opts.baseStatus,
      state: "running",
      stage: "translating",
      updatedAt: Date.now(),
      totalChunks: meaningfulTasks.length,
      translatedChunks: index + 1,
      analyzedChunks: index + 1,
      message: `Processed ${index + 1}/${meaningfulTasks.length}.`,
    })
  }

  await setTranslatorJobStatus(opts.userId, opts.jobId, {
    ...opts.baseStatus,
    state: "done",
    stage: "done",
    updatedAt: Date.now(),
    totalChunks: meaningfulTasks.length,
    translatedChunks: meaningfulTasks.length,
    analyzedChunks: meaningfulTasks.length,
    message: "Done (local dev mode).",
  })
}

function isLoopbackBaseUrl(raw: string) {
  try {
    const u = new URL(raw)
    const host = u.hostname
    return host === "localhost" || host === "127.0.0.1" || host === "::1"
  } catch {
    return false
  }
}

function shouldTemporarilyDisableTranslatorQstashQueue() {
  // Temporary debug switch requested by user:
  // run translator processing inline and bypass QStash publish/queueing.
  return true
}

const requestSchema = z
  .object({
    fileUrl: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => {
          try {
            // eslint-disable-next-line no-new
            new URL(value)
            return true
          } catch {
            return false
          }
        },
        { message: "Invalid fileUrl" }
      ),
    mimeType: z.string().trim().min(1).max(200),
    targetLanguage: z.string().trim().min(2).max(10),
    stateCode: z.string().trim().min(2).max(10).optional(),
    ocrPreference: z.enum(["sarvam"]).optional(),
  })
  .strict()

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const isDev = process.env.NODE_ENV !== "production"
  const loopbackBase = isLoopbackBaseUrl(siteConfig.url)
  const qstash = getQstashClient()

  const userId = session.user.id
  const jobId = crypto.randomUUID()

  await ensureFarmerProfilesSchema()

  const profile = await db.query.farmerProfiles.findFirst({
    where: eq(farmerProfiles.userId, userId),
  })

  const now = Date.now()
  const status: TranslatorJobStatus = {
    state: "queued",
    stage: "extracting",
    createdAt: now,
    updatedAt: now,
    fileUrl: parsed.data.fileUrl,
    mimeType: parsed.data.mimeType,
    targetLanguage: parsed.data.targetLanguage,
    stateCode: parsed.data.stateCode?.trim() || undefined,
    // Enforce Sarvam-only OCR for this pipeline.
    ocrPreference: "sarvam",
    farmerContext: profile
      ? {
          supportNeed: profile.supportNeed ?? null,
          state: profile.state ?? null,
          district: profile.district ?? null,
          tehsil: profile.tehsil ?? null,
          village: profile.village ?? null,
        }
      : undefined,
    totalChunks: 0,
    translatedChunks: 0,
    analyzedChunks: 0,
  }

  try {
    await setTranslatorJobStatus(userId, jobId, status)
  } catch (e) {
    if (e instanceof TranslatorJobsStoreMisconfiguredError) {
      const msg = toUserMessage(e, {
        fallbackTitle: "This service isn’t available right now.",
        fallbackDescription: "Please try again later.",
        context: "api.translatorJobs.store",
        status: 500,
      })
      return NextResponse.json(
        { error: msg.title, description: msg.description, code: msg.code },
        { status: 500 }
      )
    }
    throw e
  }

  const disableQstashQueue = shouldTemporarilyDisableTranslatorQstashQueue()

  if (disableQstashQueue) {
    try {
      await processTranslatorJobLocally({
        userId,
        jobId,
        fileUrl: parsed.data.fileUrl,
        mimeType: parsed.data.mimeType,
        targetLanguage: parsed.data.targetLanguage,
        stateCode: parsed.data.stateCode?.trim() || undefined,
        baseStatus: status,
      })

      return NextResponse.json({ data: { jobId } })
    } catch (e) {
      console.error(e)
      const msg = toUserMessage(e, {
        fallbackTitle: "Couldn’t process that document",
        fallbackDescription: "Please try again.",
        context: "api.translatorJobs.inline",
        status: 500,
      })
      await setTranslatorJobStatus(userId, jobId, {
        ...status,
        state: "failed",
        stage: "extracting",
        updatedAt: Date.now(),
        message: msg.title,
      })

      return NextResponse.json(
        { error: msg.title, description: msg.description, code: msg.code },
        { status: 500 }
      )
    }
  }

  // NOTE: Queueing path retained intentionally, but made inaccessible by the
  // temporary hardcoded switch above for debugging Vercel 404 behavior.

  // In local dev, QStash cannot deliver to loopback destinations (localhost/::1).
  // Instead, run the pipeline locally so the analyzer still works without a tunnel.
  if (isDev && loopbackBase) {
    void processTranslatorJobLocally({
      userId,
      jobId,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType,
      targetLanguage: parsed.data.targetLanguage,
      stateCode: parsed.data.stateCode?.trim() || undefined,
      baseStatus: status,
    }).catch(async (e) => {
      console.error(e)
      const msg = toUserMessage(e, {
        fallbackTitle: "Couldn’t process that document",
        fallbackDescription: "Please try again.",
        context: "api.translatorJobs.local",
        status: 500,
      })
      await setTranslatorJobStatus(userId, jobId, {
        ...status,
        state: "failed",
        stage: "extracting",
        updatedAt: Date.now(),
        message: msg.title,
      })
    })

    return NextResponse.json({ data: { jobId } })
  }

  if (!qstash) {
    return NextResponse.json(
      {
        error: "This service isn’t available right now.",
        description: "Please try again later.",
        code: "SERVICE_UNAVAILABLE",
      },
      { status: 503 }
    )
  }

  try {
    const res = await qstash.publishJSON({
      url: `${siteConfig.url}/api/queues/translator-runs`,
      body: { userId, jobId, step: "init" },
    })

    await setTranslatorJobStatus(userId, jobId, {
      ...status,
      state: "extracting",
      updatedAt: Date.now(),
      messageId: res.messageId,
    })

    return NextResponse.json({ data: { jobId } })
  } catch (e) {
    console.error(e)
    const msg = toUserMessage(e, {
      fallbackTitle: "Couldn’t start the translation job",
      fallbackDescription: "Please try again.",
      context: "api.translatorJobs.queue",
      status: 502,
    })
    await setTranslatorJobStatus(userId, jobId, {
      ...status,
      state: "failed",
      updatedAt: Date.now(),
      message: msg.title,
    })

    return NextResponse.json(
      { error: msg.title, description: msg.description, code: msg.code },
      { status: 502 }
    )
  }
}
