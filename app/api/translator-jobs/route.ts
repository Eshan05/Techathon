import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { ensureFarmerProfilesSchema } from "@/lib/db/compat"
import { siteConfig } from "@/lib/site"
import { getQstashClient } from "@/lib/qstash/client"
import { db } from "@/lib/db/db"
import { farmerProfiles } from "@/lib/db/schema"
import {
  setTranslatorJobStatus,
  type TranslatorJobStatus,
} from "@/lib/qstash/translator-jobs"

export const runtime = "nodejs"

const requestSchema = z
  .object({
    fileUrl: z.string().url(),
    mimeType: z.string().trim().min(1).max(200),
    targetLanguage: z.string().trim().min(2).max(10),
    stateCode: z.string().trim().min(2).max(10).optional(),
  })
  .strict()

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const qstash = getQstashClient()
  if (!qstash) {
    return NextResponse.json(
      { error: "QStash is not configured (missing QSTASH_TOKEN)." },
      { status: 500 }
    )
  }

  const userId = session.user.id
  const jobId = crypto.randomUUID()

  await ensureFarmerProfilesSchema()

  const profile = await db.query.farmerProfiles.findFirst({
    where: eq(farmerProfiles.userId, userId),
  })

  const now = Date.now()
  const status: TranslatorJobStatus = {
    state: "queued",
    stage: "extracting",
    createdAt: now,
    updatedAt: now,
    fileUrl: parsed.data.fileUrl,
    mimeType: parsed.data.mimeType,
    targetLanguage: parsed.data.targetLanguage,
    stateCode: parsed.data.stateCode?.trim() || undefined,
    farmerContext: profile
      ? {
          supportNeed: profile.supportNeed ?? null,
          state: profile.state ?? null,
          district: profile.district ?? null,
          tehsil: profile.tehsil ?? null,
          village: profile.village ?? null,
        }
      : undefined,
    totalChunks: 0,
    translatedChunks: 0,
    analyzedChunks: 0,
  }

  await setTranslatorJobStatus(userId, jobId, status)

  try {
    const res = await qstash.publishJSON({
      url: `${siteConfig.url}/api/qstash/translator-jobs/process`,
      body: { userId, jobId, step: "init" },
    })

    await setTranslatorJobStatus(userId, jobId, {
      ...status,
      state: "extracting",
      updatedAt: Date.now(),
      messageId: res.messageId,
    })

    return NextResponse.json({ data: { jobId } })
  } catch (e) {
    console.error(e)
    await setTranslatorJobStatus(userId, jobId, {
      ...status,
      state: "failed",
      updatedAt: Date.now(),
      message: "Could not queue processing",
    })

    return NextResponse.json(
      { error: "Could not queue processing" },
      { status: 502 }
    )
  }
}
