import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { farmerProfiles } from "@/lib/db/schema"

export const runtime = "nodejs"

const upsertFarmerProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).nullable().optional(),
    phone: z.string().trim().min(7).max(20).nullable().optional(),
    preferredLanguage: z.string().trim().min(2).max(20).optional(),

    state: z.string().trim().min(1).max(120).nullable().optional(),
    district: z.string().trim().min(1).max(120).nullable().optional(),
    tehsil: z.string().trim().min(1).max(120).nullable().optional(),
    village: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict()

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const row = await db.query.farmerProfiles.findFirst({
    where: eq(farmerProfiles.userId, session.user.id),
  })

  const fallback = {
    userId: session.user.id,
    fullName: session.user.name ?? null,
    phone: null,
    preferredLanguage: "hi",
    state: null,
    district: null,
    tehsil: null,
    village: null,
  }

  return NextResponse.json({ data: row ?? fallback })
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = upsertFarmerProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const values = {
    userId: session.user.id,
    fullName: parsed.data.fullName ?? null,
    phone: parsed.data.phone ?? null,
    preferredLanguage: parsed.data.preferredLanguage ?? "hi",
    state: parsed.data.state ?? null,
    district: parsed.data.district ?? null,
    tehsil: parsed.data.tehsil ?? null,
    village: parsed.data.village ?? null,
    updatedAt: new Date(),
  }

  await db.insert(farmerProfiles).values(values).onConflictDoUpdate({
    target: farmerProfiles.userId,
    set: values,
  })

  const row = await db.query.farmerProfiles.findFirst({
    where: eq(farmerProfiles.userId, session.user.id),
  })

  return NextResponse.json({ data: row })
}
