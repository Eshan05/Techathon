import "server-only"

import { getUpstashRedis } from "@/lib/cache/upstash"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export type TranslatorJobState =
  | "queued"
  | "extracting"
  | "running"
  | "done"
  | "failed"

export type TranslatorJobStage =
  | "extracting"
  | "translating"
  | "analyzing"
  | "done"

export type TranslatorOcrPreference = "sarvam"

export type TranslatorSourceChunk = {
  text: string
  pageNumber: number
  partNumber: number
  partCount: number
}

export type TranslatorChunk = {
  index: number
  pageNumber: number
  partNumber: number
  partCount: number
  text: string
}

export type TranslatorInsight = {
  normal: string[]
  redFlags: string[]
  warnings: string[]
  clarify: string[]
  contextualBad: string[]
  raw?: string
}

export type TranslatorJobStatus = {
  state: TranslatorJobState
  stage: TranslatorJobStage
  createdAt: number
  updatedAt: number

  fileUrl: string
  mimeType: string
  targetLanguage: string
  stateCode?: string

  // OCR provider preference for scanned PDFs/images.
  // This pipeline enforces Sarvam-only OCR.
  ocrPreference?: TranslatorOcrPreference
  farmerContext?: {
    supportNeed?: string | null
    state?: string | null
    district?: string | null
    tehsil?: string | null
    village?: string | null
  }

  totalChunks: number
  translatedChunks: number
  analyzedChunks: number

  message?: string
  messageId?: string
  retryCount?: number
}

const TTL_SECONDS = 60 * 60 * 24 // 24h

type MemoryEntry = { value: string; expiresAt: number }

const FS_ROOT = path.join(os.tmpdir(), "kisan-vakil", "translator-jobs", "v1")

function shouldPreferRedis() {
  const forced = (process.env.TRANSLATOR_JOBS_STORE ?? "").trim().toLowerCase()
  if (forced === "local") return false
  if (forced === "redis") return true

  // Default behavior:
  // - In local dev, prefer local storage (filesystem) so polling works even with multiple dev workers.
  // - On Vercel/production, prefer Redis for cross-instance durability.
  const isProd = process.env.NODE_ENV === "production"
  const isVercel = Boolean(process.env.VERCEL)
  return isProd || isVercel
}

function fsPathForKey(key: string) {
  const name = Buffer.from(key).toString("base64url")
  return path.join(FS_ROOT, `${name}.json`)
}

async function fsGet(key: string) {
  const p = fsPathForKey(key)
  try {
    const raw = await readFile(p, "utf8")
    const parsed = JSON.parse(raw) as MemoryEntry
    if (!parsed || typeof parsed.value !== "string") return null

    if (typeof parsed.expiresAt === "number" && Date.now() > parsed.expiresAt) {
      await unlink(p).catch(() => null)
      return null
    }

    return parsed.value
  } catch {
    return null
  }
}

async function fsSet(key: string, value: string) {
  await mkdir(FS_ROOT, { recursive: true })
  const p = fsPathForKey(key)
  const tmp = `${p}.${crypto.randomUUID()}.tmp`
  const entry: MemoryEntry = {
    value,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  }
  await writeFile(tmp, JSON.stringify(entry), "utf8")
  await rename(tmp, p)
}

// Local-dev fallback when UPSTASH_* env vars are not set.
// This keeps the analyzer usable without requiring Redis.
const memoryStore: Map<string, MemoryEntry> = (() => {
  const g = globalThis as unknown as {
    __kisanVakilTranslatorJobsMemoryStore?: Map<string, MemoryEntry>
  }

  if (!g.__kisanVakilTranslatorJobsMemoryStore) {
    g.__kisanVakilTranslatorJobsMemoryStore = new Map<string, MemoryEntry>()
  }

  return g.__kisanVakilTranslatorJobsMemoryStore
})()

function memGet(key: string) {
  const e = memoryStore.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return e.value
}

function memSet(key: string, value: string) {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  })
}

async function localGet(key: string) {
  const fromMem = memGet(key)
  if (fromMem) return fromMem

  const fromFs = await fsGet(key)
  if (fromFs) memSet(key, fromFs)
  return fromFs
}

async function localSet(key: string, value: string) {
  memSet(key, value)
  await fsSet(key, value)
}

function jobKey(userId: string, jobId: string) {
  return `trjob:v1:${userId}:${jobId}`
}

function srcKey(userId: string, jobId: string, index: number) {
  return `trjob:v1:${userId}:${jobId}:src:${index}`
}

function outKey(userId: string, jobId: string, index: number) {
  return `trjob:v1:${userId}:${jobId}:out:${index}`
}

function insKey(userId: string, jobId: string, index: number) {
  return `trjob:v1:${userId}:${jobId}:ins:${index}`
}

export async function setTranslatorJobStatus(
  userId: string,
  jobId: string,
  status: TranslatorJobStatus
) {
  if (!shouldPreferRedis()) {
    await localSet(jobKey(userId, jobId), JSON.stringify(status))
    return
  }

  const redis = getUpstashRedis()
  if (!redis) {
    await localSet(jobKey(userId, jobId), JSON.stringify(status))
    return
  }

  await redis.set(jobKey(userId, jobId), JSON.stringify(status), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobStatus(userId: string, jobId: string) {
  if (!shouldPreferRedis()) {
    const raw = await localGet(jobKey(userId, jobId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorJobStatus
    } catch {
      return null
    }
  }

  const redis = getUpstashRedis()
  if (!redis) {
    const raw = await localGet(jobKey(userId, jobId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorJobStatus
    } catch {
      return null
    }
  }

  const raw = await redis.get<string>(jobKey(userId, jobId))
  if (!raw) return null

  try {
    return JSON.parse(raw) as TranslatorJobStatus
  } catch {
    return null
  }
}

export async function setTranslatorJobSourceChunk(
  userId: string,
  jobId: string,
  index: number,
  chunk: TranslatorSourceChunk
) {
  if (!shouldPreferRedis()) {
    await localSet(srcKey(userId, jobId, index), JSON.stringify(chunk))
    return
  }

  const redis = getUpstashRedis()
  if (!redis) {
    await localSet(srcKey(userId, jobId, index), JSON.stringify(chunk))
    return
  }

  await redis.set(srcKey(userId, jobId, index), JSON.stringify(chunk), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobSourceChunk(
  userId: string,
  jobId: string,
  index: number
) {
  if (!shouldPreferRedis()) {
    const raw = await localGet(srcKey(userId, jobId, index))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorSourceChunk
    } catch {
      return null
    }
  }

  const redis = getUpstashRedis()
  if (!redis) {
    const raw = await localGet(srcKey(userId, jobId, index))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorSourceChunk
    } catch {
      return null
    }
  }

  const raw = await redis.get<string>(srcKey(userId, jobId, index))
  if (!raw) return null

  try {
    return JSON.parse(raw) as TranslatorSourceChunk
  } catch {
    return null
  }
}

export async function setTranslatorJobOutputChunk(
  userId: string,
  jobId: string,
  chunk: TranslatorChunk
) {
  if (!shouldPreferRedis()) {
    await localSet(outKey(userId, jobId, chunk.index), JSON.stringify(chunk))
    return
  }

  const redis = getUpstashRedis()
  if (!redis) {
    await localSet(outKey(userId, jobId, chunk.index), JSON.stringify(chunk))
    return
  }

  await redis.set(outKey(userId, jobId, chunk.index), JSON.stringify(chunk), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobOutputChunk(
  userId: string,
  jobId: string,
  index: number
) {
  if (!shouldPreferRedis()) {
    const raw = await localGet(outKey(userId, jobId, index))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorChunk
    } catch {
      return null
    }
  }

  const redis = getUpstashRedis()
  if (!redis) {
    const raw = await localGet(outKey(userId, jobId, index))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TranslatorChunk
    } catch {
      return null
    }
  }

  const raw = await redis.get<string>(outKey(userId, jobId, index))
  if (!raw) return null

  try {
    return JSON.parse(raw) as TranslatorChunk
  } catch {
    return null
  }
}

export async function setTranslatorJobInsightChunk(
  userId: string,
  jobId: string,
  index: number,
  insight: TranslatorInsight
) {
  if (!shouldPreferRedis()) {
    await localSet(insKey(userId, jobId, index), JSON.stringify(insight))
    return
  }

  const redis = getUpstashRedis()
  if (!redis) {
    await localSet(insKey(userId, jobId, index), JSON.stringify(insight))
    return
  }

  await redis.set(insKey(userId, jobId, index), JSON.stringify(insight), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobInsightChunk(
  userId: string,
  jobId: string,
  index: number
) {
  if (!shouldPreferRedis()) {
    const raw = await localGet(insKey(userId, jobId, index))
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as TranslatorInsight
      const fallback = {
        normal: [],
        redFlags: [],
        warnings: [],
        clarify: [],
        contextualBad: [],
      }

      return {
        ...fallback,
        ...parsed,
        raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
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

  const redis = getUpstashRedis()
  if (!redis) {
    const raw = await localGet(insKey(userId, jobId, index))
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as TranslatorInsight
      const fallback = {
        normal: [],
        redFlags: [],
        warnings: [],
        clarify: [],
        contextualBad: [],
      }

      return {
        ...fallback,
        ...parsed,
        raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
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

  const raw = await redis.get<string>(insKey(userId, jobId, index))
  if (!raw || typeof raw !== "string") return null

  try {
    const parsed = JSON.parse(raw) as TranslatorInsight
    const fallback = {
      normal: [],
      redFlags: [],
      warnings: [],
      clarify: [],
      contextualBad: [],
    }

    return {
      ...fallback,
      ...parsed,
      raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
    }
  } catch {
    // Backwards compat: older jobs stored markdown strings.
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

export async function getTranslatorJobChunksAfter(opts: {
  userId: string
  jobId: string
  after: number
  limit: number
}) {
  if (!shouldPreferRedis()) {
    const start = Math.max(-1, opts.after) + 1
    const end = start + Math.max(1, opts.limit) - 1
    const indexes = Array.from(
      { length: end - start + 1 },
      (_v, i) => start + i
    )

    const outputs: TranslatorChunk[] = []
    for (const i of indexes) {
      const raw = await localGet(outKey(opts.userId, opts.jobId, i))
      if (!raw) continue
      try {
        outputs.push(JSON.parse(raw) as TranslatorChunk)
      } catch {
        // ignore
      }
    }

    const insights: Array<{ index: number; insight: TranslatorInsight }> = []
    for (const i of indexes) {
      const raw = await localGet(insKey(opts.userId, opts.jobId, i))
      if (typeof raw !== "string" || !raw.trim()) continue

      try {
        const parsed = JSON.parse(raw) as TranslatorInsight
        insights.push({
          index: i,
          insight: {
            normal: Array.isArray(parsed?.normal) ? parsed.normal : [],
            redFlags: Array.isArray(parsed?.redFlags) ? parsed.redFlags : [],
            warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
            clarify: Array.isArray(parsed?.clarify) ? parsed.clarify : [],
            contextualBad: Array.isArray(parsed?.contextualBad)
              ? parsed.contextualBad
              : [],
            raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
          },
        })
      } catch {
        insights.push({
          index: i,
          insight: {
            normal: [],
            redFlags: [],
            warnings: [],
            clarify: [],
            contextualBad: [],
            raw,
          },
        })
      }
    }

    outputs.sort((a, b) => a.index - b.index)
    insights.sort((a, b) => a.index - b.index)

    return { outputs, insights }
  }

  const redis = getUpstashRedis()
  if (!redis) {
    const start = Math.max(-1, opts.after) + 1
    const end = start + Math.max(1, opts.limit) - 1
    const indexes = Array.from(
      { length: end - start + 1 },
      (_v, i) => start + i
    )

    const outputs: TranslatorChunk[] = []
    for (const i of indexes) {
      const raw = await localGet(outKey(opts.userId, opts.jobId, i))
      if (!raw) continue
      try {
        outputs.push(JSON.parse(raw) as TranslatorChunk)
      } catch {
        // ignore
      }
    }

    const insights: Array<{ index: number; insight: TranslatorInsight }> = []
    for (const i of indexes) {
      const raw = await localGet(insKey(opts.userId, opts.jobId, i))
      if (typeof raw !== "string" || !raw.trim()) continue

      try {
        const parsed = JSON.parse(raw) as TranslatorInsight
        insights.push({
          index: i,
          insight: {
            normal: Array.isArray(parsed?.normal) ? parsed.normal : [],
            redFlags: Array.isArray(parsed?.redFlags) ? parsed.redFlags : [],
            warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
            clarify: Array.isArray(parsed?.clarify) ? parsed.clarify : [],
            contextualBad: Array.isArray(parsed?.contextualBad)
              ? parsed.contextualBad
              : [],
            raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
          },
        })
      } catch {
        insights.push({
          index: i,
          insight: {
            normal: [],
            redFlags: [],
            warnings: [],
            clarify: [],
            contextualBad: [],
            raw,
          },
        })
      }
    }

    outputs.sort((a, b) => a.index - b.index)
    insights.sort((a, b) => a.index - b.index)

    return { outputs, insights }
  }

  const start = Math.max(-1, opts.after) + 1
  const end = start + Math.max(1, opts.limit) - 1
  const indexes = Array.from({ length: end - start + 1 }, (_v, i) => start + i)

  const [outRaw, insRaw] = await Promise.all([
    Promise.all(
      indexes.map(
        async (i) =>
          [
            i,
            await redis.get<string>(outKey(opts.userId, opts.jobId, i)),
          ] as const
      )
    ),
    Promise.all(
      indexes.map(
        async (i) =>
          [
            i,
            await redis.get<string>(insKey(opts.userId, opts.jobId, i)),
          ] as const
      )
    ),
  ])

  const outputs: TranslatorChunk[] = []
  for (const [_i, raw] of outRaw) {
    if (!raw) continue
    try {
      outputs.push(JSON.parse(raw) as TranslatorChunk)
    } catch {
      // ignore
    }
  }

  const insights: Array<{ index: number; insight: TranslatorInsight }> = []
  for (const [i, raw] of insRaw) {
    if (typeof raw !== "string" || !raw.trim()) continue

    try {
      const parsed = JSON.parse(raw) as TranslatorInsight
      insights.push({
        index: i,
        insight: {
          normal: Array.isArray(parsed?.normal) ? parsed.normal : [],
          redFlags: Array.isArray(parsed?.redFlags) ? parsed.redFlags : [],
          warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
          clarify: Array.isArray(parsed?.clarify) ? parsed.clarify : [],
          contextualBad: Array.isArray(parsed?.contextualBad)
            ? parsed.contextualBad
            : [],
          raw: typeof parsed?.raw === "string" ? parsed.raw : undefined,
        },
      })
    } catch {
      insights.push({
        index: i,
        insight: {
          normal: [],
          redFlags: [],
          warnings: [],
          clarify: [],
          contextualBad: [],
          raw,
        },
      })
    }
  }

  outputs.sort((a, b) => a.index - b.index)
  insights.sort((a, b) => a.index - b.index)

  return { outputs, insights }
}
