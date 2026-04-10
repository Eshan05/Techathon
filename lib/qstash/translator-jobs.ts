import "server-only"

import { getUpstashRedis } from "@/lib/cache/upstash"

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

export type TranslatorJobStatus = {
  state: TranslatorJobState
  stage: TranslatorJobStage
  createdAt: number
  updatedAt: number

  fileUrl: string
  mimeType: string
  targetLanguage: string
  stateCode?: string

  totalChunks: number
  translatedChunks: number
  analyzedChunks: number

  message?: string
  messageId?: string
  retryCount?: number
}

const TTL_SECONDS = 60 * 60 * 24 // 24h

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
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(jobKey(userId, jobId), JSON.stringify(status), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobStatus(userId: string, jobId: string) {
  const redis = getUpstashRedis()
  if (!redis) return null

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
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(srcKey(userId, jobId, index), JSON.stringify(chunk), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobSourceChunk(
  userId: string,
  jobId: string,
  index: number
) {
  const redis = getUpstashRedis()
  if (!redis) return null

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
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(outKey(userId, jobId, chunk.index), JSON.stringify(chunk), {
    ex: TTL_SECONDS,
  })
}

export async function getTranslatorJobOutputChunk(
  userId: string,
  jobId: string,
  index: number
) {
  const redis = getUpstashRedis()
  if (!redis) return null

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
  markdown: string
) {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(insKey(userId, jobId, index), markdown, { ex: TTL_SECONDS })
}

export async function getTranslatorJobInsightChunk(
  userId: string,
  jobId: string,
  index: number
) {
  const redis = getUpstashRedis()
  if (!redis) return null

  const raw = await redis.get<string>(insKey(userId, jobId, index))
  return typeof raw === "string" ? raw : null
}

export async function getTranslatorJobChunksAfter(opts: {
  userId: string
  jobId: string
  after: number
  limit: number
}) {
  const redis = getUpstashRedis()
  if (!redis) return { outputs: [], insights: [] }

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

  const insights: Array<{ index: number; markdown: string }> = []
  for (const [i, raw] of insRaw) {
    if (typeof raw === "string" && raw.trim()) {
      insights.push({ index: i, markdown: raw })
    }
  }

  outputs.sort((a, b) => a.index - b.index)
  insights.sort((a, b) => a.index - b.index)

  return { outputs, insights }
}
