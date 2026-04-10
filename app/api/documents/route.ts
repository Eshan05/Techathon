import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { documents } from "@/lib/db/schema"
import { getDocumentJobStatuses } from "@/lib/qstash/document-jobs"

export const runtime = "nodejs"

const documentCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    kind: z.string().trim().min(1).max(50),

    uploadthingKey: z.string().trim().min(1).max(400).nullable().optional(),
    url: z.string().trim().url().nullable().optional(),

    mimeType: z.string().trim().min(1).max(200).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional(),
    sha256: z.string().trim().min(8).max(128).nullable().optional(),

    landParcelId: z.string().trim().min(1).max(64).nullable().optional(),
    issuedAt: z.number().int().nonnegative().nullable().optional(),
  })
  .strict()

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.query.documents.findMany({
    where: eq(documents.userId, session.user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  const jobMap = await getDocumentJobStatuses(
    session.user.id,
    rows.map((r) => r.id)
  )

  const withJobs = rows.map((r) => ({
    ...r,
    job: jobMap[r.id] ?? null,
  }))

  return NextResponse.json({ data: withJobs })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = documentCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const id = crypto.randomUUID()

  const values = {
    id,
    userId: session.user.id,
    title: parsed.data.title,
    kind: parsed.data.kind,
    uploadthingKey: parsed.data.uploadthingKey ?? null,
    url: parsed.data.url ?? null,
    mimeType: parsed.data.mimeType ?? null,
    sizeBytes: parsed.data.sizeBytes ?? null,
    sha256: parsed.data.sha256 ?? null,
    landParcelId: parsed.data.landParcelId ?? null,
    issuedAt:
      parsed.data.issuedAt === null || parsed.data.issuedAt === undefined
        ? null
        : new Date(parsed.data.issuedAt),
  }

  await db.insert(documents).values(values)

  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
  })

  return NextResponse.json({ data: row }, { status: 201 })
}
