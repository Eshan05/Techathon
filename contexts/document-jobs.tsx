"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { DocumentJobState, DocumentJobStatus } from "@/lib/qstash/types"
import type {
  DocumentOcrJobState,
  DocumentOcrJobStatus,
} from "@/lib/qstash/document-ocr-jobs"

type DocLike = {
  id: string
  title: string
  sha256?: string | null
  job?: DocumentJobStatus | null
  ocrJob?: DocumentOcrJobStatus | null
}

function isPending(state: DocumentJobState | null) {
  return state === "queued" || state === "processing"
}

function isOcrPending(state: DocumentOcrJobState | null) {
  return (
    state === "queued" ||
    state === "extracting" ||
    state === "chunking" ||
    state === "saving"
  )
}

export function DocumentJobsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const qc = useQueryClient()
  const prevById = React.useRef(new Map<string, DocumentJobState | null>())
  const prevOcrById = React.useRef(
    new Map<string, DocumentOcrJobState | null>()
  )

  React.useEffect(() => {
    const tick = () => {
      const docs = qc.getQueryData(["documents"]) as DocLike[] | undefined
      if (!Array.isArray(docs) || docs.length === 0) return

      let hasPending = false

      for (const d of docs) {
        const nextState = d.job?.state ?? null
        const prevState = prevById.current.get(d.id) ?? null

        const nextOcrState = d.ocrJob?.state ?? null
        const prevOcrState = prevOcrById.current.get(d.id) ?? null

        if (isPending(nextState) || isOcrPending(nextOcrState))
          hasPending = true

        // Avoid spamming on first paint: only toast meaningful transitions.
        if (prevState !== nextState) {
          if (prevState && isPending(prevState) && nextState === "done") {
            toast.success(`Verified: ${d.title}`, {
              id: `docjob:${d.id}:done`,
            })
          }

          if (prevState && isPending(prevState) && nextState === "failed") {
            toast.error(`Verification failed: ${d.title}`, {
              id: `docjob:${d.id}:failed`,
            })
          }

          // When a doc enters the queue while you are on the dashboard, reassure the user.
          if (!prevState && nextState === "queued") {
            toast.message(`Verifying in background: ${d.title}`, {
              id: `docjob:${d.id}:queued`,
            })
          }

          prevById.current.set(d.id, nextState)
        }

        if (prevOcrState !== nextOcrState) {
          if (
            prevOcrState &&
            isOcrPending(prevOcrState) &&
            nextOcrState === "done"
          ) {
            toast.success(`OCR ready: ${d.title}`, {
              id: `dococr:${d.id}:done`,
            })
          }

          if (
            prevOcrState &&
            isOcrPending(prevOcrState) &&
            nextOcrState === "failed"
          ) {
            toast.error(`OCR failed: ${d.title}`, {
              id: `dococr:${d.id}:failed`,
            })
          }

          if (!prevOcrState && nextOcrState === "queued") {
            toast.message(`Making searchable: ${d.title}`, {
              id: `dococr:${d.id}:queued`,
            })
          }

          prevOcrById.current.set(d.id, nextOcrState)
        }
      }

      if (hasPending) {
        void qc.invalidateQueries({
          queryKey: ["documents"],
          refetchType: "active",
        })
      }
    }

    const timer = setInterval(tick, 4000)
    tick()

    return () => clearInterval(timer)
  }, [qc])

  return <>{children}</>
}
