export type UserFacingError = {
  title: string
  description?: string
  code?: string
  status?: number
  retryable?: boolean
}

export type ToUserMessageOptions = {
  fallbackTitle: string
  fallbackDescription?: string
  /** Optional string like "auth.signIn" or "vault.upload" for more tailored defaults. */
  context?: string
  /** If you already know the HTTP status, pass it here for better mapping. */
  status?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function normalizeCode(input: string) {
  return input
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function looksLikeOpaqueCode(message: string) {
  // e.g. INVALID_CREDENTIALS, EMAIL_ALREADY_EXISTS, UNAUTHORIZED
  return /^[A-Z0-9]+(?:_[A-Z0-9]+){1,}$/.test(message.trim())
}

function extractMessageAndMeta(error: unknown): {
  message: string | null
  code: string | null
  status: number | null
  name: string | null
} {
  if (typeof error === "string") {
    return { message: error, code: null, status: null, name: null }
  }

  if (error instanceof Error) {
    const anyErr = error as any
    const code = coerceString(anyErr.code)
    const status =
      typeof anyErr.status === "number"
        ? anyErr.status
        : typeof anyErr.statusCode === "number"
          ? anyErr.statusCode
          : null

    return {
      message: typeof error.message === "string" ? error.message : null,
      code: code ? normalizeCode(code) : null,
      status,
      name: typeof error.name === "string" ? error.name : null,
    }
  }

  if (isRecord(error)) {
    // Common API shapes:
    // - { error: "..." }
    // - { error: { message, code, status } }
    // - { message: "..." }
    const topMessage = coerceString(error.message)

    const topCode = coerceString(error.code)
    const topStatusRaw = error.status ?? error.statusCode
    const topStatus =
      typeof topStatusRaw === "number" &&
      Number.isFinite(topStatusRaw) &&
      topStatusRaw >= 100 &&
      topStatusRaw <= 599
        ? topStatusRaw
        : null

    const nested = error.error
    if (typeof nested === "string") {
      return {
        message: nested,
        code: topCode ? normalizeCode(topCode) : null,
        status: topStatus,
        name: null,
      }
    }

    if (isRecord(nested)) {
      const nestedMsg =
        coerceString(nested.message) ?? coerceString(nested.error)
      const nestedCode = coerceString(nested.code)
      const nestedStatusRaw = nested.status ?? nested.statusCode
      const nestedStatus =
        typeof nestedStatusRaw === "number" &&
        Number.isFinite(nestedStatusRaw) &&
        nestedStatusRaw >= 100 &&
        nestedStatusRaw <= 599
          ? nestedStatusRaw
          : null

      return {
        message: nestedMsg ?? topMessage,
        code: normalizeCode(nestedCode ?? topCode ?? "") || null,
        status: nestedStatus ?? topStatus,
        name: null,
      }
    }

    return {
      message: topMessage,
      code: topCode ? normalizeCode(topCode) : null,
      status: topStatus,
      name: null,
    }
  }

  return { message: null, code: null, status: null, name: null }
}

function isNetworky(message: string) {
  return /failed to fetch|networkerror|fetch failed|load failed|socket|econn|etimedout|enotfound|eai_again|dns/i.test(
    message
  )
}

function isRateLimited(message: string, status?: number | null) {
  if (status === 429) return true
  return /rate\s*limit|too many requests|\b429\b/i.test(message)
}

function isPayloadTooLarge(message: string, status?: number | null) {
  if (status === 413) return true
  return /payload too large|request entity too large|file too large/i.test(
    message
  )
}

function isUnauthorized(
  message: string,
  code?: string | null,
  status?: number | null
) {
  if (status === 401) return true
  if (code && code === "UNAUTHORIZED") return true
  return /unauthorized|not authenticated|session expired/i.test(message)
}

function isForbidden(message: string, status?: number | null) {
  if (status === 403) return true
  return /forbidden|not allowed|permission/i.test(message)
}

function isNotFound(message: string, status?: number | null) {
  if (status === 404) return true
  return /not found|missing/i.test(message)
}

function simplifyTechnicalMessage(message: string) {
  let m = message.trim()

  // Collapse common noisy prefixes.
  m = m.replace(/^Error:\s*/i, "")
  m = m.replace(/^TypeError:\s*/i, "")
  m = m.replace(/^ZodError:\s*/i, "")

  // Avoid leaking stack-ish lines.
  if (/\n\s*at\s+/i.test(m)) {
    m = m.split("\n")[0]?.trim() || m
  }

  // Hide JSON parsing errors that are rarely actionable.
  if (
    /Unexpected token </i.test(m) ||
    /Unexpected end of JSON input/i.test(m)
  ) {
    return "The server returned an unexpected response."
  }

  // Hide low-level fetch abort noise.
  if (/AbortError/i.test(m)) {
    return "The request was cancelled."
  }

  // SQLite/Drizzle errors are almost never user-actionable.
  if (/SQLITE_|drizzle|libsql/i.test(m)) {
    return "A data error happened while saving."
  }

  return m
}

function mapAuthLikeCodes(codeOrMessage: string): UserFacingError | null {
  const code = normalizeCode(codeOrMessage)

  const MAP: Record<string, UserFacingError> = {
    INVALID_CREDENTIALS: {
      title: "Email or password didn’t match.",
      description: "Double-check and try again.",
    },
    INVALID_EMAIL_OR_PASSWORD: {
      title: "Email or password didn’t match.",
      description: "Double-check and try again.",
    },
    EMAIL_ALREADY_EXISTS: {
      title: "That email is already registered.",
      description: "Try signing in instead.",
    },
    USER_ALREADY_EXISTS: {
      title: "That account already exists.",
      description: "Try signing in instead.",
    },
    EMAIL_NOT_VERIFIED: {
      title: "Please verify your email to continue.",
      description: "Open the link we sent to your inbox.",
    },
    INVALID_OTP: {
      title: "That code doesn’t look right.",
      description: "Check the 6-digit code and try again.",
    },
    INVALID_TOTP: {
      title: "That code doesn’t look right.",
      description: "Check the 6-digit code and try again.",
    },
    TOTP_INVALID: {
      title: "That code doesn’t look right.",
      description: "Check the 6-digit code and try again.",
    },
    TWO_FACTOR_REQUIRED: {
      title: "Two-factor verification is required.",
      description: "Enter the code from your authenticator app.",
    },
    NOT_ALLOWED_ERROR: {
      title: "Cancelled.",
      description: "You closed the passkey prompt.",
    },
    NOTALLOWEDERROR: {
      title: "Cancelled.",
      description: "You closed the passkey prompt.",
    },
  }

  return MAP[code] ?? null
}

export function toUserMessage(
  error: unknown,
  opts: ToUserMessageOptions
): UserFacingError {
  const extracted = extractMessageAndMeta(error)

  const status = opts.status ?? extracted.status ?? undefined
  const rawMessage = extracted.message ?? undefined
  const rawCode = extracted.code ?? undefined

  // If the error looks like a code, try mapping it.
  if (rawMessage && looksLikeOpaqueCode(rawMessage)) {
    const mapped = mapAuthLikeCodes(rawMessage)
    if (mapped) return { ...mapped, code: normalizeCode(rawMessage), status }
  }

  if (rawCode) {
    const mapped = mapAuthLikeCodes(rawCode)
    if (mapped) return { ...mapped, code: rawCode, status }
  }

  const message = rawMessage ? simplifyTechnicalMessage(rawMessage) : null

  if (message && /failed to fetch file\s*\(\s*\d{3}\s*\)/i.test(message)) {
    return {
      title: "Couldn’t download the document file.",
      description:
        "The file link may have expired. Please re-upload and try again.",
      code: rawCode ?? "FILE_FETCH_FAILED",
      status,
      retryable: true,
    }
  }

  if (message && /upload failed/i.test(message)) {
    return {
      title: "Upload didn’t complete.",
      description: "Please try again. If it keeps failing, try a smaller file.",
      code: rawCode ?? "UPLOAD_FAILED",
      status,
      retryable: true,
    }
  }

  if (
    message &&
    /qstash.*not configured|missing\s+qstash_token/i.test(message)
  ) {
    return {
      title: "This service isn’t available right now.",
      description: "Please try again later.",
      code: rawCode ?? "SERVICE_UNAVAILABLE",
      status: status ?? 503,
      retryable: true,
    }
  }

  if (message && isRateLimited(message, status)) {
    return {
      title: "Too many requests right now.",
      description: "Please wait a minute and try again.",
      code: rawCode ?? "RATE_LIMITED",
      status: status ?? 429,
      retryable: true,
    }
  }

  if (message && isNetworky(message)) {
    return {
      title: "Can’t reach the server.",
      description: "Check your internet connection and try again.",
      code: rawCode ?? "NETWORK",
      status,
      retryable: true,
    }
  }

  if (message && isPayloadTooLarge(message, status)) {
    return {
      title: "That file is too large.",
      description: "Try a smaller PDF/photo, or compress it and retry.",
      code: rawCode ?? "PAYLOAD_TOO_LARGE",
      status: status ?? 413,
      retryable: false,
    }
  }

  if (message && isUnauthorized(message, rawCode, status)) {
    return {
      title: "Please sign in to continue.",
      description: "Your session may have expired.",
      code: rawCode ?? "UNAUTHORIZED",
      status: status ?? 401,
      retryable: false,
    }
  }

  if (message && isForbidden(message, status)) {
    return {
      title: "You don’t have permission to do that.",
      description: "If you think this is a mistake, contact support.",
      code: rawCode ?? "FORBIDDEN",
      status: status ?? 403,
      retryable: false,
    }
  }

  if (message && isNotFound(message, status)) {
    return {
      title: "We couldn’t find what you asked for.",
      description: "It may have been deleted or you may not have access.",
      code: rawCode ?? "NOT_FOUND",
      status: status ?? 404,
      retryable: false,
    }
  }

  // Contextual polish: if the message is still too technical, prefer fallback.
  if (message) {
    const tooTechnical =
      /\b(ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|SQLITE_|TypeError|SyntaxError|ZodError)\b/i.test(
        message
      ) || /\[object Object\]/i.test(message)

    if (!tooTechnical) {
      // If we have a decent message (plain English), use it.
      return {
        title: message,
        code:
          rawCode ??
          (looksLikeOpaqueCode(rawMessage ?? "")
            ? normalizeCode(rawMessage ?? "")
            : undefined),
        status,
      }
    }
  }

  // Default: safe, friendly fallback.
  return {
    title: opts.fallbackTitle,
    description: opts.fallbackDescription,
    code: rawCode,
    status,
  }
}
