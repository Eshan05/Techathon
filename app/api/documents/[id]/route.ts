import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { documents } from "@/lib/db/schema"
import { getDocumentJobStatus } from "@/lib/qstash/document-jobs"

export const runtime = "nodejs"

const documentPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    kind: z.string().trim().min(1).max(50).optional(),

    uploadthingKey: z.string().trim().min(1).max(400).nullable().optional(),
    url: z.string().trim().url().nullable().optional(),

    mimeType: z.string().trim().min(1).max(200).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional(),
    sha256: z.string().trim().min(8).max(128).nullable().optional(),

    landParcelId: z.string().trim().min(1).max(64).nullable().optional(),
    issuedAt: z.number().int().nonnegative().nullable().optional(),
  })
  .strict()

export async function GET(
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

  const job = await getDocumentJobStatus(session.user.id, id)

  return NextResponse.json({ data: { ...row, job } })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = documentPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const next = {
    title: parsed.data.title ?? existing.title,
    kind: parsed.data.kind ?? existing.kind,
    uploadthingKey:
      parsed.data.uploadthingKey === undefined
        ? existing.uploadthingKey
        : parsed.data.uploadthingKey,
    url: parsed.data.url === undefined ? existing.url : parsed.data.url,
    mimeType:
      parsed.data.mimeType === undefined
        ? existing.mimeType
        : parsed.data.mimeType,
    sizeBytes:
      parsed.data.sizeBytes === undefined
        ? existing.sizeBytes
        : parsed.data.sizeBytes,
    sha256:
      parsed.data.sha256 === undefined ? existing.sha256 : parsed.data.sha256,
    landParcelId:
      parsed.data.landParcelId === undefined
        ? existing.landParcelId
        : parsed.data.landParcelId,
    issuedAt:
      parsed.data.issuedAt === undefined
        ? existing.issuedAt
        : parsed.data.issuedAt === null
          ? null
          : new Date(parsed.data.issuedAt),
  }

  await db
    .update(documents)
    .set(next)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))

  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
  })

  return NextResponse.json({ data: row })
}

export async function DELETE(
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

  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))

  return NextResponse.json({ data: { id } })
}
