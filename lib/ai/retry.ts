import "server-only"

export type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs?: number
  jitterRatio?: number
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (info: {
    attempt: number
    maxAttempts: number
    delayMs: number
    error: unknown
  }) => void | Promise<void>
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function getHttpStatusFromUnknown(error: unknown): number | null {
  if (!error || typeof error !== "object") return null

  const anyErr = error as any

  if (typeof anyErr.status === "number") return anyErr.status
  if (typeof anyErr.code === "number") return anyErr.code
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode

  if (typeof anyErr.status === "string") {
    const n = Number(anyErr.status)
    if (Number.isFinite(n) && n >= 100 && n <= 599) return n
  }

  if (typeof anyErr.code === "string") {
    const n = Number(anyErr.code)
    if (Number.isFinite(n) && n >= 100 && n <= 599) return n
  }

  if (typeof anyErr.statusCode === "string") {
    const n = Number(anyErr.statusCode)
    if (Number.isFinite(n) && n >= 100 && n <= 599) return n
  }

  const resp = anyErr.response
  if (resp && typeof resp === "object") {
    if (typeof (resp as any).status === "number") return (resp as any).status
    if (typeof (resp as any).statusCode === "number")
      return (resp as any).statusCode
  }

  const nested = anyErr.error
  if (nested && typeof nested === "object") {
    if (typeof (nested as any).code === "number") return (nested as any).code
    if (typeof (nested as any).status === "number")
      return (nested as any).status
    if (typeof (nested as any).statusCode === "number")
      return (nested as any).statusCode
    if (typeof (nested as any).code === "string") {
      const n = Number((nested as any).code)
      if (Number.isFinite(n) && n >= 100 && n <= 599) return n
    }
  }

  const message =
    typeof anyErr.message === "string" ? anyErr.message : String(error)

  // Sometimes providers embed JSON in the message.
  const match = message.match(/"code"\s*:\s*(\d{3})/)
  if (match) return Number(match[1])

  const match2 = message.match(/\b(429|503)\b/)
  if (match2) return Number(match2[1])

  const match3 = message.match(/status(?:\s*code)?\s*[:=]\s*(\d{3})/i)
  if (match3) return Number(match3[1])

  return null
}

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  const maxAttempts = Math.max(1, opts.maxAttempts)
  const base = Math.max(0, opts.baseDelayMs)
  const maxDelay = Math.max(base, opts.maxDelayMs ?? 8000)
  const jitter = Math.max(0, Math.min(0.5, opts.jitterRatio ?? 0.25))

  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (e) {
      lastError = e

      const retryable = opts.shouldRetry ? opts.shouldRetry(e) : true
      if (!retryable || attempt >= maxAttempts) throw e

      const rawDelay = Math.min(maxDelay, base * 2 ** (attempt - 1))
      const delta = rawDelay * jitter
      const randomized = Math.max(0, rawDelay + (Math.random() * 2 - 1) * delta)

      const delayMs = Math.round(randomized)
      await opts.onRetry?.({
        attempt,
        maxAttempts,
        delayMs,
        error: e,
      })

      await sleep(delayMs)
    }
  }

  throw lastError
}
