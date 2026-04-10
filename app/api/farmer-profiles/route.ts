import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { ensureFarmerProfilesSchema } from "@/lib/db/compat"
import { db } from "@/lib/db/db"
import { farmerProfiles } from "@/lib/db/schema"

export const runtime = "nodejs"

const upsertFarmerProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).nullable().optional(),
    phone: z.string().trim().min(7).max(20).nullable().optional(),
    preferredLanguage: z.string().trim().min(2).max(20).optional(),
    supportNeed: z
      .enum(["land-records", "schemes", "notices", "complaints", "cases"])
      .nullable()
      .optional(),
    trustedHelperName: z.string().trim().min(1).max(120).nullable().optional(),
    trustedHelperPhone: z.string().trim().min(7).max(20).nullable().optional(),

    state: z.string().trim().min(1).max(120).nullable().optional(),
    district: z.string().trim().min(1).max(120).nullable().optional(),
    tehsil: z.string().trim().min(1).max(120).nullable().optional(),
    village: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict()

type FarmerProfileRow =
  | {
      fullName: string | null
      phone: string | null
      preferredLanguage: string | null
      supportNeed: string | null
      trustedHelperName: string | null
      trustedHelperPhone: string | null
      state: string | null
      district: string | null
      tehsil: string | null
      village: string | null
    }
  | null
  | undefined

function normalizeProfile(
  row: FarmerProfileRow,
  session: { user: { id: string; name?: string | null } }
) {
  return {
    userId: session.user.id,
    fullName: row?.fullName ?? session.user.name ?? null,
    phone: row?.phone ?? null,
    preferredLanguage: row?.preferredLanguage ?? "hi",
    supportNeed: row?.supportNeed ?? "land-records",
    trustedHelperName: row?.trustedHelperName ?? null,
    trustedHelperPhone: row?.trustedHelperPhone ?? null,
    state: row?.state ?? null,
    district: row?.district ?? null,
    tehsil: row?.tehsil ?? null,
    village: row?.village ?? null,
  }
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureFarmerProfilesSchema()

  const row = await db.query.farmerProfiles.findFirst({
    where: eq(farmerProfiles.userId, session.user.id),
  })

  return NextResponse.json({ data: normalizeProfile(row, session) })
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureFarmerProfilesSchema()

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
    supportNeed: parsed.data.supportNeed ?? "land-records",
    trustedHelperName: parsed.data.trustedHelperName ?? null,
    trustedHelperPhone: parsed.data.trustedHelperPhone ?? null,
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

  return NextResponse.json({ data: normalizeProfile(row, session) })
}
