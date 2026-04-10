import "server-only"

import { Client } from "@upstash/qstash"

export function getQstashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN?.trim()
  if (!token || token === "=") return null

  const baseUrl = process.env.QSTASH_URL?.trim()

  return new Client({
    token,
    baseUrl: baseUrl || undefined,
  })
}
