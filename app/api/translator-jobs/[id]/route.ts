import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth/auth"
import {
  getTranslatorJobChunksAfter,
  getTranslatorJobStatus,
  TranslatorJobsStoreMisconfiguredError,
} from "@/lib/qstash/translator-jobs"

export const runtime = "nodejs"

const querySchema = z.object({
  after: z.coerce.number().int().min(-1).default(-1),
  limit: z.coerce.number().int().min(1).max(25).default(10),
})

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await ctx.params
  const jobId = params.id

  const url = new URL(req.url)
  const parsedQuery = querySchema.safeParse({
    after: url.searchParams.get("after") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 })
  }

  const userId = session.user.id
  let status: Awaited<ReturnType<typeof getTranslatorJobStatus>>
  try {
    status = await getTranslatorJobStatus(userId, jobId)
  } catch (e) {
    if (e instanceof TranslatorJobsStoreMisconfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    throw e
  }

  if (!status) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[translator-jobs] Job not found", { userId, jobId })
    }
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  let outputs: Awaited<
    ReturnType<typeof getTranslatorJobChunksAfter>
  >["outputs"]
  let insights: Awaited<
    ReturnType<typeof getTranslatorJobChunksAfter>
  >["insights"]
  try {
    ;({ outputs, insights } = await getTranslatorJobChunksAfter({
      userId,
      jobId,
      after: parsedQuery.data.after,
      limit: parsedQuery.data.limit,
    }))
  } catch (e) {
    if (e instanceof TranslatorJobsStoreMisconfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    throw e
  }

  const nextAfter = Math.max(
    parsedQuery.data.after,
    ...outputs.map((c) => c.index),
    ...insights.map((c) => c.index)
  )

  return NextResponse.json({
    data: {
      status,
      chunks: outputs,
      insights,
      nextAfter,
    },
  })
}
