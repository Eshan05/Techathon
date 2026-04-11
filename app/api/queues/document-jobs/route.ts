import { NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/db"
import { documents } from "@/lib/db/schema"
import { getQstashSigningKeys } from "@/lib/qstash/keys"
import {
  setDocumentJobStatus,
  sha256Base64Url,
} from "@/lib/qstash/document-jobs"
import { toUserMessage } from "@/lib/errors"

export const runtime = "nodejs"

const payloadSchema = z
  .object({
    userId: z.string().trim().min(1),
    documentId: z.string().trim().min(1),
  })
  .strict()

export async function POST(request: Request) {
  const signature =
    request.headers.get("upstash-signature") ??
    request.headers.get("Upstash-Signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  const keys = getQstashSigningKeys()
  if (!keys) {
    return NextResponse.json(
      { error: "QStash signing keys not configured" },
      { status: 500 }
    )
  }

  const body = await request.text()

  const url = new URL(request.url)
  const subject = `${url.origin}${url.pathname}`

  const receiver = new Receiver({
    currentSigningKey: keys.currentSigningKey,
    nextSigningKey: keys.nextSigningKey,
  })

  try {
    await receiver.verify({ signature, body, url: subject })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { userId, documentId } = parsed.data

  const messageId = request.headers.get("upstash-message-id") ?? undefined

  await setDocumentJobStatus(userId, documentId, {
    state: "processing",
    updatedAt: Date.now(),
    messageId,
  })

  try {
    const row = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.userId, userId)),
    })

    if (!row) {
      await setDocumentJobStatus(userId, documentId, {
        state: "failed",
        updatedAt: Date.now(),
        message: "Document not found",
      })
      return NextResponse.json({ ok: true })
    }

    if (!row.url) {
      await setDocumentJobStatus(userId, documentId, {
        state: "failed",
        updatedAt: Date.now(),
        message: "Document has no URL",
      })
      return NextResponse.json({ ok: true })
    }

    if (row.sha256) {
      await setDocumentJobStatus(userId, documentId, {
        state: "done",
        updatedAt: Date.now(),
        message: "Already indexed",
      })
      return NextResponse.json({ ok: true })
    }

    const r = await fetch(row.url)
    if (!r.ok) {
      throw new Error(`Failed to fetch file (${r.status})`)
    }

    const buf = new Uint8Array(await r.arrayBuffer())
    const sha256 = await sha256Base64Url(buf)

    await db
      .update(documents)
      .set({ sha256 })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))

    await setDocumentJobStatus(userId, documentId, {
      state: "done",
      updatedAt: Date.now(),
      message: "Indexed",
      messageId,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)

    const msg = toUserMessage(e, {
      fallbackTitle: "Document processing failed",
      fallbackDescription: "Please try again.",
      context: "queue.documentJobs",
      status: 500,
    })
    await setDocumentJobStatus(userId, documentId, {
      state: "failed",
      updatedAt: Date.now(),
      message: msg.title,
      messageId,
    })

    return NextResponse.json(
      { error: msg.title, description: msg.description, code: msg.code },
      { status: 500 }
    )
  }
}
