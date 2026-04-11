import { NextResponse } from "next/server"
import { z } from "zod"

import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"

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

async function resolveJobIdFromCtx(ctx: unknown): Promise<string | null> {
  const maybeParams = (ctx as any)?.params
  const params =
    maybeParams && typeof maybeParams?.then === "function"
      ? await maybeParams
      : maybeParams
  const id = typeof params?.id === "string" ? params.id : null
  return id && id.trim() ? id.trim() : null
}

export const POST = verifySignatureAppRouter(
  async (req: Request, ctx: unknown) => {
    try {
      const jobId = await resolveJobIdFromCtx(ctx)
      if (!jobId) {
        return NextResponse.json(
          { error: "Missing job id in route params" },
          { status: 500 }
        )
      }

      const json = await req.json().catch(() => null)
      if (!json || typeof json !== "object") {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 500 }
        )
      }

      // TODO: handle webhook payload for jobId
      return NextResponse.json({ ok: true, jobId }, { status: 200 })
    } catch (e) {
      console.error(e)
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Server error" },
        { status: 500 }
      )
    }
  },
  {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  }
)

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
