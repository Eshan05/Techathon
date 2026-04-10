import "server-only"

import { getUpstashRedis } from "@/lib/cache/upstash"

export type DocumentOcrJobState =
  | "queued"
  | "extracting"
  | "chunking"
  | "saving"
  | "done"
  | "failed"

export type DocumentOcrJobStatus = {
  state: DocumentOcrJobState
  updatedAt: number
  totalChunks?: number
  processedChunks?: number
  message?: string
  messageId?: string
}

const TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function key(userId: string, documentId: string) {
  return `dococr:v1:${userId}:${documentId}`
}

export async function setDocumentOcrJobStatus(
  userId: string,
  documentId: string,
  status: DocumentOcrJobStatus
) {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(key(userId, documentId), JSON.stringify(status), {
    ex: TTL_SECONDS,
  })
}

export async function getDocumentOcrJobStatus(
  userId: string,
  documentId: string
) {
  const redis = getUpstashRedis()
  if (!redis) return null

  const raw = await redis.get<string>(key(userId, documentId))
  if (!raw) return null

  try {
    return JSON.parse(raw) as DocumentOcrJobStatus
  } catch {
    return null
  }
}

export async function getDocumentOcrJobStatuses(
  userId: string,
  documentIds: string[]
): Promise<Record<string, DocumentOcrJobStatus | null>> {
  const redis = getUpstashRedis()
  if (!redis) {
    return Object.fromEntries(documentIds.map((id) => [id, null]))
  }

  const results = await Promise.all(
    documentIds.map(
      async (id) => [id, await getDocumentOcrJobStatus(userId, id)] as const
    )
  )

  return Object.fromEntries(results)
}
