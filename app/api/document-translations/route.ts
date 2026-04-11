import { NextRequest, NextResponse } from "next/server"
import { SarvamAIClient } from "sarvamai"

import { retryWithExponentialBackoff } from "@/lib/ai/retry"
import {
  buildSarvamTranslateErrorMessage,
  isRetryableSarvamTranslateError,
} from "@/lib/ai/sarvam-errors"
import { extractTextWithSarvamDocumentIntelligence } from "@/lib/ai/sarvam-document-intelligence"
import { toUserMessage } from "@/lib/errors"

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
})

type TranslateTargetLanguage = NonNullable<
  Parameters<typeof client.text.translate>[0]["target_language_code"]
>

const ALLOWED_TARGET_LANGUAGES: readonly TranslateTargetLanguage[] = [
  "hi-IN",
  "mr-IN",
  "gu-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "bn-IN",
  "pa-IN",
]

function resolveTargetLanguage(input: string): TranslateTargetLanguage {
  return ALLOWED_TARGET_LANGUAGES.includes(input as TranslateTargetLanguage)
    ? (input as TranslateTargetLanguage)
    : "hi-IN"
}

export const maxDuration = 60 // Allow 60 seconds

function splitIntoChunks(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\r/g, "").trim()
  if (!cleaned) return []

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ""

  function flush() {
    const out = buf.trim()
    if (out) chunks.push(out)
    buf = ""
  }

  for (const p of paragraphs) {
    const next = buf ? `${buf}\n\n${p}` : p

    if (next.length <= maxChars) {
      buf = next
      continue
    }

    if (!buf) {
      const parts = p.split(/(?<=[.!?।])\s+/)
      let local = ""
      for (const part of parts) {
        const candidate = local ? `${local} ${part}` : part
        if (candidate.length <= maxChars) {
          local = candidate
        } else {
          if (local) chunks.push(local.trim())
          local = part
        }
      }
      if (local.trim()) chunks.push(local.trim())
      continue
    }

    flush()
    buf = p
  }

  flush()
  return chunks
}

async function translateTextWithSarvam(opts: {
  text: string
  targetLanguage: TranslateTargetLanguage
}): Promise<string> {
  const MAX_CHARS = 950

  function hardSplit(text: string) {
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
    const r = await retryWithExponentialBackoff(
      async () =>
        await client.text.translate(
          {
            input: part,
            source_language_code: "auto",
            target_language_code: opts.targetLanguage,
            speaker_gender: "Male",
          },
          {
            timeoutInSeconds: 60,
            maxRetries: 2,
          }
        ),
      {
        maxAttempts: 4,
        baseDelayMs: 900,
        maxDelayMs: 9000,
        jitterRatio: 0.25,
        shouldRetry: isRetryableSarvamTranslateError,
      }
    ).catch((error) => {
      throw new Error(buildSarvamTranslateErrorMessage(error))
    })

    const t = (r.translated_text || "").trim()
    if (t) translatedParts.push(t)
  }

  return translatedParts.join("\n\n").trim()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const targetLanguageValue = formData.get("language")

    if (!file || typeof targetLanguageValue !== "string") {
      return NextResponse.json(
        { error: "Missing file or target language" },
        { status: 400 }
      )
    }

    const targetLanguage = resolveTargetLanguage(targetLanguageValue)

    const bytes = new Uint8Array(await file.arrayBuffer())

    let extractedText = ""
    if (file.type?.startsWith("text/")) {
      extractedText = new TextDecoder().decode(bytes)
    } else if (file.type?.includes("pdf") || file.type?.startsWith("image/")) {
      extractedText = await extractTextWithSarvamDocumentIntelligence({
        bytes,
        mimeType: file.type,
        language: targetLanguage,
      })
    } else {
      // Best-effort: try Sarvam OCR anyway.
      extractedText = await extractTextWithSarvamDocumentIntelligence({
        bytes,
        mimeType: file.type || "application/octet-stream",
        language: targetLanguage,
      })
    }

    if (!extractedText.trim()) {
      throw new Error("Could not extract any text from the document.")
    }

    const translatedText = await translateTextWithSarvam({
      text: extractedText,
      targetLanguage,
    })

    return NextResponse.json({ text: translatedText })
  } catch (error: unknown) {
    console.error("Translation error:", error)
    const msg = toUserMessage(error, {
      fallbackTitle: "Couldn’t translate that document",
      fallbackDescription: "Try a clearer photo/PDF and retry.",
      context: "api.documentTranslations",
      status: 500,
    })
    return NextResponse.json(
      { error: msg.title, description: msg.description, code: msg.code },
      { status: 500 }
    )
  }
}
