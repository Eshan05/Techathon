import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { farmerProfiles, onboarding } from "@/lib/db/schema"
import { toUserMessage } from "@/lib/errors"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const profileRow = await db.query.farmerProfiles.findFirst({
      where: eq(farmerProfiles.userId, session.user.id),
    })

    let row: Awaited<ReturnType<typeof db.query.onboarding.findFirst>> | null =
      null

    try {
      row = await db.query.onboarding.findFirst({
        where: eq(onboarding.userId, session.user.id),
      })
    } catch (error) {
      // Some environments may not have the onboarding table migrated yet.
      // Treat that as "no onboarding row" so dashboard access can still work.
      console.warn("Onboarding table lookup failed", error)
    }

    const identityStatus = row?.identityStatus ?? "pending"
    const landStatus = row?.landStatus ?? "pending"
    const faceStatus = row?.faceStatus ?? "pending"
    const currentStep = row?.currentStep ?? 1
    const overallStatus = row?.overallStatus ?? "in_progress"

    const isOnboarded =
      !!profileRow ||
      overallStatus === "completed" ||
      (identityStatus === "verified" &&
        landStatus === "verified" &&
        faceStatus === "verified")

    return NextResponse.json({
      isOnboarded,
      currentStep,
      overallStatus,
      identityStatus,
      landStatus,
      faceStatus,
    })
  } catch (error) {
    console.error(error)
    const msg = toUserMessage(error, {
      fallbackTitle: "Couldn’t load onboarding status",
      fallbackDescription: "Please try again.",
      context: "api.onboarding.status",
      status: 500,
    })
    return NextResponse.json(
      { error: msg.title, description: msg.description, code: msg.code },
      { status: 500 }
    )
  }
}
