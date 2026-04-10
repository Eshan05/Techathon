import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { landParcels } from "@/lib/db/schema"

export const runtime = "nodejs"

const landParcelCreateSchema = z
  .object({
    nickname: z.string().trim().min(1).max(120).nullable().optional(),

    state: z.string().trim().min(1).max(120).nullable().optional(),
    district: z.string().trim().min(1).max(120).nullable().optional(),
    tehsil: z.string().trim().min(1).max(120).nullable().optional(),
    village: z.string().trim().min(1).max(120).nullable().optional(),

    khataNo: z.string().trim().min(1).max(64).nullable().optional(),
    khasraNo: z.string().trim().min(1).max(64).nullable().optional(),
    mutationNo: z.string().trim().min(1).max(64).nullable().optional(),

    ownerName: z.string().trim().min(1).max(120).nullable().optional(),
    ownershipShare: z.string().trim().min(1).max(64).nullable().optional(),

    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.query.landParcels.findMany({
    where: eq(landParcels.userId, session.user.id),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  })

  return NextResponse.json({ data: rows })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = landParcelCreateSchema.safeParse(body)
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
    nickname: parsed.data.nickname ?? null,
    state: parsed.data.state ?? null,
    district: parsed.data.district ?? null,
    tehsil: parsed.data.tehsil ?? null,
    village: parsed.data.village ?? null,
    khataNo: parsed.data.khataNo ?? null,
    khasraNo: parsed.data.khasraNo ?? null,
    mutationNo: parsed.data.mutationNo ?? null,
    ownerName: parsed.data.ownerName ?? null,
    ownershipShare: parsed.data.ownershipShare ?? null,
    notes: parsed.data.notes ?? null,
  }

  await db.insert(landParcels).values(values)

  const row = await db.query.landParcels.findFirst({
    where: and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)),
  })

  return NextResponse.json({ data: row }, { status: 201 })
}
