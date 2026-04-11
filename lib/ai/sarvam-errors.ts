import { getHttpStatusFromUnknown } from "@/lib/ai/retry"

const RETRYABLE_SARVAM_STATUSES = new Set([429, 500, 502, 503, 504])

function toCleanString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function readNestedValue(root: unknown, path: string[]): unknown {
  let current: unknown = root

  for (const segment of path) {
    if (!current || typeof current !== "object") return null
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

function readHeaderValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== "object") return null

  const maybeGet = (headers as { get?: unknown }).get
  if (typeof maybeGet === "function") {
    const value = (maybeGet as (key: string) => unknown)(name)
    const cleaned = toCleanString(value)
    if (cleaned) return cleaned

    const lowercase = (maybeGet as (key: string) => unknown)(name.toLowerCase())
    const cleanedLowercase = toCleanString(lowercase)
    if (cleanedLowercase) return cleanedLowercase
  }

  const raw = (headers as Record<string, unknown>)[name]
  const cleanedRaw = toCleanString(raw)
  if (cleanedRaw) return cleanedRaw

  const rawLowercase = (headers as Record<string, unknown>)[name.toLowerCase()]
  const cleanedLowercaseRaw = toCleanString(rawLowercase)
  if (cleanedLowercaseRaw) return cleanedLowercaseRaw

  return null
}

function getErrorMessage(error: unknown): string {
  const msg =
    toCleanString((error as { message?: unknown } | null)?.message) ??
    toCleanString(error)

  if (msg) return msg

  try {
    return JSON.stringify(error)
  } catch {
    return "Unknown error"
  }
}

export function getSarvamErrorCodeFromError(error: unknown): string | null {
  return (
    toCleanString(readNestedValue(error, ["body", "error", "code"])) ??
    toCleanString(readNestedValue(error, ["error", "code"]))
  )
}

export function getSarvamRequestIdFromError(error: unknown): string | null {
  const nestedId =
    toCleanString(readNestedValue(error, ["body", "error", "request_id"])) ??
    toCleanString(readNestedValue(error, ["error", "request_id"]))

  if (nestedId) return nestedId

  const headers = readNestedValue(error, ["rawResponse", "headers"])
  const headerId = readHeaderValue(headers, "x-request-id")
  if (headerId) return headerId

  const message = getErrorMessage(error)
  const lower = message.toLowerCase()
  const keys = ["request_id", "request-id", "x-request-id"] as const

  for (const key of keys) {
    const idx = lower.indexOf(key)
    if (idx === -1) continue

    const tail = message.slice(idx + key.length)
    const normalized = tail
      .replaceAll('"', " ")
      .replaceAll("'", " ")
      .replaceAll(":", " ")
      .replaceAll("=", " ")
      .trim()

    const first = normalized.split(/\s+/)[0] ?? ""
    if (/^[A-Za-z0-9_-]{8,}$/.test(first)) return first
  }

  return null
}

export function isRetryableSarvamTranslateError(error: unknown): boolean {
  const status = getHttpStatusFromUnknown(error)
  if (typeof status === "number" && RETRYABLE_SARVAM_STATUSES.has(status)) {
    return true
  }

  const code = (getSarvamErrorCodeFromError(error) || "").toLowerCase()
  if (
    code === "internal_server_error" ||
    code === "service_unavailable" ||
    code === "rate_limit_exceeded"
  ) {
    return true
  }

  const message = getErrorMessage(error).toLowerCase()
  return /timeout|timed out|econnreset|socket|network|internal server error|service unavailable/.test(
    message
  )
}

export function buildSarvamTranslateErrorMessage(error: unknown): string {
  const status = getHttpStatusFromUnknown(error)
  const code = getSarvamErrorCodeFromError(error)
  const requestId = getSarvamRequestIdFromError(error)
  const retryable = isRetryableSarvamTranslateError(error)

  const details: string[] = []
  if (typeof status === "number") details.push(`status ${status}`)
  if (code) details.push(`code ${code}`)

  const detailText = details.length ? ` (${details.join(", ")})` : ""

  let message = retryable
    ? `Sarvam translation is temporarily unavailable${detailText}.`
    : `Sarvam translation failed${detailText}.`

  if (requestId) message += ` Request ID: ${requestId}.`
  if (retryable) message += " Please retry in a minute."

  return message
}
