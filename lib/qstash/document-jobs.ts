import "server-only"

import crypto from "node:crypto"

import { getUpstashRedis } from "@/lib/cache/upstash"

export type DocumentJobState = "queued" | "processing" | "done" | "failed"

export type DocumentJobStatus = {
  state: DocumentJobState
  updatedAt: number
  message?: string
  messageId?: string
}

function key(userId: string, documentId: string) {
  return `docjob:${userId}:${documentId}`
}

export async function setDocumentJobStatus(
  userId: string,
  documentId: string,
  status: DocumentJobStatus
) {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(key(userId, documentId), JSON.stringify(status), {
    ex: 60 * 60 * 24 * 7,
  })
}

export async function getDocumentJobStatus(userId: string, documentId: string) {
  const redis = getUpstashRedis()
  if (!redis) return null

  const raw = await redis.get<string>(key(userId, documentId))
  if (!raw) return null

  try {
    return JSON.parse(raw) as DocumentJobStatus
  } catch {
    return null
  }
}

export async function getDocumentJobStatuses(
  userId: string,
  documentIds: string[]
): Promise<Record<string, DocumentJobStatus | null>> {
  const redis = getUpstashRedis()
  if (!redis) {
    return Object.fromEntries(documentIds.map((id) => [id, null]))
  }

  const results = await Promise.all(
    documentIds.map(
      async (id) => [id, await getDocumentJobStatus(userId, id)] as const
    )
  )

  return Object.fromEntries(results)
}

export async function sha256Base64Url(bytes: Uint8Array) {
  const hash = crypto.createHash("sha256").update(bytes).digest()
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}
