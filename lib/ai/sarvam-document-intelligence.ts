import "server-only"

import JSZip from "jszip"
import { SarvamAIClient } from "sarvamai"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { sleep } from "@/lib/ai/retry"

export type SarvamDocumentIntelligenceProgress = {
  jobState?: string
  totalPages: number
  pagesProcessed: number
  pagesSucceeded: number
  pagesFailed: number
}

function pickBestTextFile(zip: JSZip) {
  const files = Object.values(zip.files).filter((f) => !f.dir)
  if (!files.length) return null

  const md = files.find((f) => /\.md$/i.test(f.name))
  if (md) return md

  const txt = files.find((f) => /\.txt$/i.test(f.name))
  if (txt) return txt

  return files[0] ?? null
}

function extensionForMimeType(mimeType: string) {
  const mime = mimeType.trim().toLowerCase()
  if (mime.includes("pdf")) return "pdf"
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"

  const m = mime.match(/^image\/(.+)$/)
  if (m?.[1]) return m[1].replace(/[^a-z0-9]+/g, "").slice(0, 10) || "img"
  return "bin"
}

export async function extractTextWithSarvamDocumentIntelligence(opts: {
  bytes: Uint8Array
  mimeType: string
  language: string
  onProgress?: (p: SarvamDocumentIntelligenceProgress) => void | Promise<void>
}): Promise<string> {
  if (!process.env.SARVAM_API_KEY?.trim()) {
    throw new Error("Missing SARVAM_API_KEY")
  }

  const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY,
  })

  const di = (client as any).documentIntelligence
  if (!di?.createJob) {
    throw new Error("Sarvam document intelligence client not available")
  }

  const job = await di.createJob(
    {
      language: opts.language,
      outputFormat: "md",
      pollingIntervalMs: 2000,
      maxPollingAttempts: 180,
    },
    {
      timeoutInSeconds: 60,
      maxRetries: 2,
    }
  )

  // IMPORTANT: sarvamai defaults Blob uploads to filename "document.pdf".
  // That breaks image OCR (bytes are JPG/PNG but job thinks PDF).
  // We upload using a temp file path so the SDK uses the correct extension.
  const ext = extensionForMimeType(opts.mimeType)
  const dir = path.join(os.tmpdir(), "kisan-vakil", "sarvam-di-upload", "v1")
  await mkdir(dir, { recursive: true })
  const tmpPath = path.join(dir, `${crypto.randomUUID()}.${ext}`)

  try {
    await writeFile(tmpPath, Buffer.from(opts.bytes))
    await job.uploadFile(tmpPath)
  } finally {
    await unlink(tmpPath).catch(() => null)
  }
  await job.start()

  const terminalStates = ["Completed", "PartiallyCompleted", "Failed"]
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const status = await job.getStatus()
    const metrics = job.getPageMetrics()

    await opts.onProgress?.({
      jobState: status?.job_state,
      totalPages: metrics.totalPages,
      pagesProcessed: metrics.pagesProcessed,
      pagesSucceeded: metrics.pagesSucceeded,
      pagesFailed: metrics.pagesFailed,
    })

    if (terminalStates.includes(status.job_state)) {
      if (status.job_state === "Failed") {
        throw new Error("Sarvam document OCR failed")
      }
      break
    }

    await sleep(2000)
  }

  const downloadLinks = await job.getDownloadLinks()
  const first = Object.values(downloadLinks?.download_urls ?? {})[0] as
    | { file_url?: string }
    | undefined

  if (!first?.file_url) {
    throw new Error("Sarvam document OCR: missing download URL")
  }

  const resp = await fetch(first.file_url)
  if (!resp.ok) {
    throw new Error(
      `Sarvam document OCR: failed to download output (${resp.status})`
    )
  }

  const zipBytes = new Uint8Array(await resp.arrayBuffer())
  const zip = await JSZip.loadAsync(zipBytes)
  const best = pickBestTextFile(zip)
  if (!best) {
    throw new Error("Sarvam document OCR: output ZIP was empty")
  }

  const text = (await best.async("string")).trim()
  if (!text) {
    throw new Error("Sarvam document OCR: extracted empty text")
  }

  return text
}
