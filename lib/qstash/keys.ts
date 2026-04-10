import "server-only"

export function getQstashSigningKeys(): {
  currentSigningKey: string
  nextSigningKey?: string
} | null {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim()
  if (!currentSigningKey) return null

  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim()

  return {
    currentSigningKey,
    nextSigningKey: nextSigningKey || undefined,
  }
}
