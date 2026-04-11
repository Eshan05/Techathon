import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { documents } from "@/lib/db/schema"
import { getQstashClient } from "@/lib/qstash/client"
import { setDocumentOcrJobStatus } from "@/lib/qstash/document-ocr-jobs"
import { siteConfig } from "@/lib/site"
import { toUserMessage } from "@/lib/errors"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
  })

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!row.url || !row.mimeType) {
    return NextResponse.json(
      { error: "Document is missing a URL or mime type" },
      { status: 400 }
    )
  }

  const qstash = getQstashClient()
  if (!qstash) {
    return NextResponse.json(
      { error: "QStash not configured" },
      { status: 501 }
    )
  }

  const baseJob = { state: "queued" as const, updatedAt: Date.now() }
  await setDocumentOcrJobStatus(session.user.id, id, baseJob)

  try {
    const res = await qstash.publishJSON({
      url: `${siteConfig.url}/api/queues/document-ocr-jobs`,
      body: { userId: session.user.id, documentId: id },
    })

    const job = {
      ...baseJob,
      updatedAt: Date.now(),
      messageId: res.messageId,
    }

    await setDocumentOcrJobStatus(session.user.id, id, job)

    return NextResponse.json({ data: { job } })
  } catch (e) {
    console.error(e)

    const msg = toUserMessage(e, {
      fallbackTitle: "Couldn’t start OCR for this document",
      fallbackDescription: "Please try again.",
      context: "api.documents.ocrJobs",
      status: 500,
    })

    const job = {
      state: "failed" as const,
      updatedAt: Date.now(),
      message: msg.title,
    }

    await setDocumentOcrJobStatus(session.user.id, id, job)

    return NextResponse.json(
      {
        error: msg.title,
        description: msg.description,
        code: msg.code,
        data: { job },
      },
      { status: 500 }
    )
  }
}
