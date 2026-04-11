"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Loader2,
  ScanLine,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/file-dropzone"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { TTSPlayer } from "@/components/features/translator/tts-player"
import { SafeHtml } from "@/components/derived/safe-html"
import { uploadFiles } from "@/utils/uploadthing"
import {
  getHighlightRangesForText,
  summarizeDocument,
  type HighlightRange,
} from "@/utils/document-highlights"
import {
  INDIA_STATES,
  INDIA_UNION_TERRITORIES,
  getIndianSubdivision,
} from "@/utils/india-states"

const LANGUAGES = [
  { code: "hi-IN", name: "हिंदी (Hindi)" },
  { code: "mr-IN", name: "मराठी (Marathi)" },
  { code: "gu-IN", name: "ગુજરાતી (Gujarati)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)" },
] as const

const NO_STATE_VALUE = "__no_state" as const

function mapLanguageToChatLocale(language: string) {
  if (language.startsWith("mr")) return "mr"
  if (language.startsWith("en")) return "en"
  return "hi"
}

type AskPreset = {
  title: string
  instruction: string
}

const ASK_PRESETS: Record<"explain" | "redflags" | "urgency", AskPreset> = {
  explain: {
    title: "Explain this section",
    instruction:
      "Explain the selected text in very simple language. Then give practical next steps.",
  },
  redflags: {
    title: "Red-flag check",
    instruction:
      "Check this selected text for legal red flags, fraud risk, or terms that can harm the farmer. List questions to ask before signing.",
  },
  urgency: {
    title: "Urgency check",
    instruction:
      "Tell me if this selected text needs urgent action and what I should do in the next 24 hours.",
  },
}

function renderWithHighlights(text: string, ranges: HighlightRange[]) {
  if (!ranges.length) return text

  const kindClass: Record<HighlightRange["kind"], string> = {
    section:
      "rounded bg-sky-100 px-1 text-sky-950 dark:bg-sky-950/40 dark:text-sky-200",
    law: "rounded bg-amber-100 px-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
    clause:
      "rounded bg-violet-100 px-1 text-violet-950 dark:bg-violet-950/40 dark:text-violet-200",
    record:
      "rounded bg-emerald-100 px-1 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200",
  }

  const nodes: React.ReactNode[] = []
  let cursor = 0

  ranges.forEach((r, idx) => {
    const start = Math.max(0, Math.min(text.length, r.start))
    const end = Math.max(0, Math.min(text.length, r.end))
    if (end <= start) return

    if (cursor < start) {
      nodes.push(
        <React.Fragment key={`t-${idx}`}>
          {text.slice(cursor, start)}
        </React.Fragment>
      )
    }

    nodes.push(
      <mark key={`m-${idx}`} className={kindClass[r.kind]} title={r.label}>
        {text.slice(start, end)}
      </mark>
    )

    cursor = end
  })

  if (cursor < text.length) {
    nodes.push(
      <React.Fragment key="t-end">{text.slice(cursor)}</React.Fragment>
    )
  }

  return nodes
}

type TranslatorJobState =
  | "queued"
  | "extracting"
  | "running"
  | "done"
  | "failed"

type TranslatorJobStatus = {
  state: TranslatorJobState
  stage: "extracting" | "translating" | "analyzing" | "done"
  totalChunks: number
  translatedChunks: number
  analyzedChunks: number
  message?: string
}

type TranslatorChunk = {
  index: number
  pageNumber: number
  partNumber: number
  partCount: number
  text: string
}

type TranslatorInsight = {
  normal: string[]
  redFlags: string[]
  warnings: string[]
  clarify: string[]
  contextualBad: string[]
  raw?: string
}

type TranslatorInsightChunk = { index: number; insight: TranslatorInsight }

type AnalyzerDocument = {
  id: string
  file: File
  name: string
  mimeType: string
  jobId: string | null
  after: number
  status: TranslatorJobStatus | null
  chunks: TranslatorChunk[]
  insights: TranslatorInsightChunk[]
  synthesis: string
}

type TranslatorJobPollResponse = {
  data: {
    status: TranslatorJobStatus
    chunks: TranslatorChunk[]
    insights: TranslatorInsightChunk[]
    nextAfter: number
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function safeFileBase(name: string) {
  const base = name.replace(/\.[^/.]+$/, "")
  return (
    base
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .slice(0, 60) || "document"
  )
}

function downloadTextFile(opts: {
  filename: string
  content: string
  mime?: string
}) {
  const blob = new Blob([opts.content], {
    type: opts.mime || "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = opts.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function isRetryableUploadError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return /network|timeout|fetch|socket|econnreset|etimedout|503|504/i.test(
    message
  )
}

function mergeChunks(prev: TranslatorChunk[], incoming: TranslatorChunk[]) {
  const map = new Map<number, TranslatorChunk>()
  prev.forEach((c) => map.set(c.index, c))
  incoming.forEach((c) => map.set(c.index, c))
  return Array.from(map.values()).sort((a, b) => a.index - b.index)
}

function mergeInsights(
  prev: TranslatorInsightChunk[],
  incoming: TranslatorInsightChunk[]
) {
  const map = new Map<number, TranslatorInsightChunk>()
  prev.forEach((c) => map.set(c.index, c))
  incoming.forEach((c) => map.set(c.index, c))
  return Array.from(map.values()).sort((a, b) => a.index - b.index)
}

function getStepState(opts: { status: TranslatorJobStatus | null }): {
  steps: Array<{
    key: string
    label: string
    state: "todo" | "active" | "done"
  }>
  progressPct: number
} {
  const s = opts.status
  const state = s?.state
  const stage = s?.stage
  const total = s?.totalChunks ? Math.max(1, s.totalChunks) : 1

  const stepKeys = [
    { key: "queued", label: "Queued" },
    { key: "extracting", label: "Reading" },
    { key: "translating", label: "Translating" },
    { key: "analyzing", label: "Checking" },
    { key: "done", label: "Done" },
  ]

  function activeKey() {
    if (!s) return "queued"
    if (state === "queued") return "queued"
    if (state === "failed") return stage || "extracting"
    if (state === "done" || stage === "done") return "done"
    if (stage === "extracting") return "extracting"
    if (stage === "analyzing") return "analyzing"
    if (stage === "translating") return "translating"
    return "queued"
  }

  const active = activeKey()
  const order = stepKeys.map((x) => x.key)
  const activeIndex = Math.max(0, order.indexOf(active))

  const steps = stepKeys.map((x, idx) => ({
    ...x,
    state:
      idx < activeIndex
        ? ("done" as const)
        : idx === activeIndex
          ? ("active" as const)
          : ("todo" as const),
  }))

  let pct = 0
  if (!s) pct = 0
  else if (state === "done" || stage === "done") pct = 100
  else if (stage === "translating")
    pct = Math.round((100 * (s.translatedChunks || 0)) / total)
  else if (stage === "analyzing")
    pct = Math.round((100 * (s.analyzedChunks || 0)) / total)
  else if (stage === "extracting") pct = 5
  else if (state === "queued") pct = 1

  pct = Math.max(0, Math.min(100, pct))
  return { steps, progressPct: pct }
}

function buildCombinedTranslation(chunks: TranslatorChunk[]) {
  return chunks
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((c) => c.text)
    .join("\n\n")
    .trim()
}

function insightToMarkdown(insight: TranslatorInsight) {
  const lines: string[] = []

  const section = (title: string, items: string[]) => {
    if (!items?.length) return
    lines.push(`## ${title}`)
    for (const it of items) lines.push(`- ${it}`)
    lines.push("")
  }

  section("Normal", insight.normal)
  section("Red flags", insight.redFlags)
  section("Warnings", insight.warnings)
  section("Clarify", insight.clarify)
  section("Contextually bad", insight.contextualBad)

  if (insight.raw?.trim()) {
    lines.push("## Raw")
    lines.push(insight.raw.trim())
    lines.push("")
  }

  return lines.join("\n").trim()
}

function buildCombinedInsights(opts: {
  insights: TranslatorInsightChunk[]
  chunks: TranslatorChunk[]
}) {
  const chunkByIndex = new Map(opts.chunks.map((c) => [c.index, c] as const))

  return opts.insights
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((ins) => {
      const meta = chunkByIndex.get(ins.index)
      const title = meta
        ? `### Page ${meta.pageNumber} (${meta.partNumber}/${meta.partCount})`
        : `### Part ${ins.index + 1}`
      return [title, insightToMarkdown(ins.insight)]
        .filter(Boolean)
        .join("\n\n")
    })
    .join("\n\n---\n\n")
    .trim()
}

function containsHtmlTable(input: string) {
  return /<(table|thead|tbody|tfoot|tr|th|td)[\s>]/i.test(input)
}

export function DocumentAnalyzer() {
  const [documents, setDocuments] = React.useState<AnalyzerDocument[]>([])
  const [activeDocumentId, setActiveDocumentId] = React.useState<string | null>(
    null
  )

  const [language, setLanguage] = React.useState<string>("hi-IN")
  const [ttsSegmentSeconds, setTtsSegmentSeconds] = React.useState<number>(30)
  const [stateCode, setStateCode] = React.useState<string>("")
  const ocrPreference = "sarvam" as const

  const [isTranslating, setIsTranslating] = React.useState(false)

  const updateDocument = React.useCallback(
    (id: string, updater: (doc: AnalyzerDocument) => AnalyzerDocument) => {
      setDocuments((prev) => prev.map((d) => (d.id === id ? updater(d) : d)))
    },
    []
  )

  const activeDocument = React.useMemo(
    () => documents.find((d) => d.id === activeDocumentId) ?? null,
    [documents, activeDocumentId]
  )

  const file = activeDocument?.file ?? null

  const translatorJobId = activeDocument?.jobId ?? null
  const translatorAfter = activeDocument?.after ?? -1
  const translatorStatus = activeDocument?.status ?? null
  const translatorChunks = activeDocument?.chunks ?? []
  const translatorInsightChunks = activeDocument?.insights ?? []
  const insights = activeDocument?.synthesis ?? ""

  const lastTranslatorStateRef = React.useRef<
    Record<string, TranslatorJobState | null>
  >({})

  const translatedText = React.useMemo(() => {
    const combined = buildCombinedTranslation(translatorChunks)
    return combined || null
  }, [translatorChunks])

  const chunkNotes = React.useMemo(() => {
    if (!translatorInsightChunks.length) return ""
    return buildCombinedInsights({
      insights: translatorInsightChunks,
      chunks: translatorChunks,
    })
  }, [translatorInsightChunks, translatorChunks])

  const [selectionText, setSelectionText] = React.useState<string>("")
  const [activeTab, setActiveTab] = React.useState<
    | "text"
    | "redflags"
    | "warnings"
    | "clarify"
    | "context"
    | "normal"
    | "synthesis"
    | "highlights"
    | "audio"
  >("text")

  const [askDrawerOpen, setAskDrawerOpen] = React.useState(false)
  const [isAskingAi, setIsAskingAi] = React.useState(false)
  const [askTitle, setAskTitle] = React.useState<string>("Ask Kisan Vakil")
  const [askAnswer, setAskAnswer] = React.useState<string>("")
  const [customQuestion, setCustomQuestion] = React.useState("")

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)

  const translationContainerRef = React.useRef<HTMLDivElement>(null)

  const translatorJobQuery = useQuery({
    queryKey: ["translator-job", activeDocumentId, translatorJobId],
    enabled: !!translatorJobId && !!activeDocumentId,
    queryFn: async () => {
      const id = translatorJobId
      if (!id) throw new Error("Missing job id")

      const res = await fetch(
        `/api/translator-jobs/${id}?after=${translatorAfter}&limit=10`,
        {
          method: "GET",
        }
      )

      const json = (await res.json().catch(() => null)) as
        | TranslatorJobPollResponse
        | { error?: string }
        | null

      if (!res.ok || !json || "error" in json) {
        throw new Error((json as any)?.error || "Could not fetch job status")
      }

      return json as TranslatorJobPollResponse
    },
    refetchInterval: (q) => {
      const state = (q.state.data as any)?.data?.status?.state as
        | TranslatorJobState
        | undefined
      const stage = (q.state.data as any)?.data?.status?.stage as
        | TranslatorJobStatus["stage"]
        | undefined

      if (!state) return 1200

      if (state === "done" || state === "failed") return false
      if (stage === "extracting") return 900
      return 650
    },
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(4000, 500 * 2 ** attempt),
  })

  React.useEffect(() => {
    const payload = translatorJobQuery.data?.data
    if (!payload || !activeDocumentId) return

    updateDocument(activeDocumentId, (doc) => {
      const next: AnalyzerDocument = {
        ...doc,
        status: payload.status,
        after: Math.max(doc.after, payload.nextAfter ?? doc.after),
      }

      if (payload.chunks?.length) {
        next.chunks = mergeChunks(doc.chunks, payload.chunks)
      }

      if (payload.insights?.length) {
        next.insights = mergeInsights(doc.insights, payload.insights)
      }

      return next
    })
  }, [translatorJobQuery.data, activeDocumentId, updateDocument])

  React.useEffect(() => {
    if (!activeDocumentId) return

    const state = translatorStatus?.state
    if (!state) return

    if (lastTranslatorStateRef.current[activeDocumentId] === state) return
    lastTranslatorStateRef.current[activeDocumentId] = state

    const name = activeDocument?.name || "Document"

    if (state === "done") {
      toast.success(`Ready: ${name}`)
    }

    if (state === "failed") {
      toast.error(translatorStatus?.message || `Failed: ${name}`)
    }
  }, [
    activeDocument,
    activeDocumentId,
    translatorStatus?.state,
    translatorStatus?.message,
  ])

  const selectedSubdivision = React.useMemo(
    () => getIndianSubdivision(stateCode),
    [stateCode]
  )

  const summary = React.useMemo(() => {
    if (!translatedText) return null
    return summarizeDocument(translatedText, { stateCode })
  }, [translatedText, stateCode])

  const translatedPages = React.useMemo(() => {
    if (!translatorChunks.length) {
      return [] as Array<{
        pageNumber: number
        expectedParts: number
        completedParts: number
        isComplete: boolean
        parts: TranslatorChunk[]
      }>
    }

    const byPage = new Map<number, TranslatorChunk[]>()
    translatorChunks.forEach((c) => {
      const pageNumber = Number.isFinite(c.pageNumber) ? c.pageNumber : 1
      const list = byPage.get(pageNumber) ?? []
      list.push(c)
      byPage.set(pageNumber, list)
    })

    const pageNumbers = Array.from(byPage.keys()).sort((a, b) => a - b)

    return pageNumbers.map((pageNumber) => {
      const parts = (byPage.get(pageNumber) ?? []).slice()
      parts.sort(
        (a, b) =>
          (a.partNumber ?? 0) - (b.partNumber ?? 0) ||
          (a.index ?? 0) - (b.index ?? 0)
      )

      const expectedParts = Math.max(
        1,
        ...parts.map((p) => (Number.isFinite(p.partCount) ? p.partCount : 1))
      )
      const completedParts = parts.length
      const isComplete = completedParts >= expectedParts

      return {
        pageNumber,
        expectedParts,
        completedParts,
        isComplete,
        parts,
      }
    })
  }, [translatorChunks])

  const chunkMetaByIndex = React.useMemo(() => {
    return new Map(translatorChunks.map((c) => [c.index, c] as const))
  }, [translatorChunks])

  const insightCounts = React.useMemo(() => {
    const counts = {
      redFlags: 0,
      warnings: 0,
      clarify: 0,
      contextualBad: 0,
      normal: 0,
    }

    for (const c of translatorInsightChunks) {
      counts.redFlags += c.insight.redFlags?.length ?? 0
      counts.warnings += c.insight.warnings?.length ?? 0
      counts.clarify += c.insight.clarify?.length ?? 0
      counts.contextualBad += c.insight.contextualBad?.length ?? 0
      counts.normal += c.insight.normal?.length ?? 0
    }

    return counts
  }, [translatorInsightChunks])

  const activeIndex = React.useMemo(() => {
    if (!activeDocumentId) return -1
    return documents.findIndex((d) => d.id === activeDocumentId)
  }, [documents, activeDocumentId])

  const selectByOffset = React.useCallback(
    (delta: number) => {
      if (activeIndex === -1) return
      const next = documents[activeIndex + delta]
      if (!next) return
      setActiveDocumentId(next.id)
      setSelectionText("")
      setAskAnswer("")
      setCustomQuestion("")
      setActiveTab("text")
    },
    [activeIndex, documents]
  )

  const resetAll = React.useCallback(() => {
    setDocuments([])
    setActiveDocumentId(null)
    setIsTranslating(false)
    lastTranslatorStateRef.current = {}

    setSelectionText("")
    setAskDrawerOpen(false)
    setIsAskingAi(false)
    setAskTitle("Ask Kisan Vakil")
    setAskAnswer("")
    setCustomQuestion("")
    setIsAnalyzing(false)
    setActiveTab("text")
  }, [])

  const handleDrop = React.useCallback((accepted: File[]) => {
    if (!accepted?.length) return

    const nextDocs: AnalyzerDocument[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      mimeType: f.type || "application/octet-stream",
      jobId: null,
      after: -1,
      status: null,
      chunks: [],
      insights: [],
      synthesis: "",
    }))

    setDocuments((prev) => [...nextDocs, ...prev])
    setActiveDocumentId(nextDocs[0]?.id ?? null)

    setSelectionText("")
    setAskAnswer("")
    setCustomQuestion("")
    setActiveTab("text")
  }, [])

  const updateSelection = React.useCallback(() => {
    const translationContainer = translationContainerRef.current
    const domSelection = window.getSelection()

    if (
      !translationContainer ||
      !domSelection ||
      domSelection.rangeCount === 0 ||
      domSelection.isCollapsed
    ) {
      setSelectionText("")
      return
    }

    const range = domSelection.getRangeAt(0)
    const selectedText = domSelection.toString().replace(/\s+/g, " ").trim()
    const ancestor =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element)

    if (
      !selectedText ||
      !ancestor ||
      !translationContainer.contains(ancestor)
    ) {
      setSelectionText("")
      return
    }

    setSelectionText(selectedText.slice(0, 2000))
  }, [])

  const handleTranslate = React.useCallback(async () => {
    if (!activeDocumentId || !file) {
      toast.error("Select a document first.")
      return
    }

    const toastId = toast.loading("Uploading…")

    try {
      setIsTranslating(true)

      updateDocument(activeDocumentId, (doc) => ({
        ...doc,
        jobId: null,
        after: -1,
        status: null,
        chunks: [],
        insights: [],
        synthesis: "",
      }))

      setSelectionText("")
      setAskAnswer("")
      setActiveTab("text")

      const maxAttempts = 3
      let uploadRes: unknown = null

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          uploadRes = await uploadFiles("analyzerDocument", {
            files: [file],
          })
          break
        } catch (e) {
          if (attempt >= maxAttempts || !isRetryableUploadError(e)) throw e
          toast.message(
            `Network hiccup — retrying upload (${attempt + 1}/${maxAttempts})…`,
            { id: toastId }
          )
          await sleep(600 * attempt)
        }
      }

      const uploaded = (uploadRes as any)?.[0]?.serverData as
        | { url?: string; type?: string }
        | undefined

      if (!uploaded?.url) {
        throw new Error("Upload failed: no file URL returned")
      }

      if (!uploaded?.type) {
        throw new Error("Upload failed: no mime type returned")
      }

      const { url: fileUrl, type: mimeType } = uploaded

      updateDocument(activeDocumentId, (doc) => ({
        ...doc,
        mimeType,
      }))

      toast.message("Queuing translation…", { id: toastId })

      const response = await fetch("/api/translator-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl,
          mimeType,
          targetLanguage: language,
          stateCode: stateCode || undefined,
          ocrPreference,
        }),
      })

      const data = (await response.json().catch(() => null)) as {
        data?: { jobId?: string }
        error?: string
      } | null

      if (!response.ok || !data?.data?.jobId) {
        throw new Error(data?.error || "Could not queue translation")
      }

      updateDocument(activeDocumentId, (doc) => ({
        ...doc,
        jobId: data.data?.jobId ?? null,
        after: -1,
        status: {
          state: "queued",
          stage: "extracting",
          totalChunks: 0,
          translatedChunks: 0,
          analyzedChunks: 0,
          message: "Queued",
        },
      }))

      toast.success("Queued — processing safely in the background.", {
        id: toastId,
      })
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : "Failed to translate document."
      toast.error(message, { id: toastId })
    } finally {
      setIsTranslating(false)
    }
  }, [activeDocumentId, file, language, stateCode, updateDocument])

  const askOnText = React.useCallback(
    async (opts: {
      title: string
      instruction: string
      contextText: string
    }) => {
      try {
        setAskDrawerOpen(true)
        setAskTitle(opts.title)
        setIsAskingAi(true)
        setAskAnswer("")

        const stateHint = selectedSubdivision
          ? `\n\nState context: ${selectedSubdivision.name} (${selectedSubdivision.code})`
          : ""

        const prompt = [
          opts.instruction,
          stateHint,
          "",
          "Text:",
          `\"\"\"${opts.contextText}\"\"\"`,
          "",
          "Give an actionable answer in short bullet points and plain language.",
          "Also list what documents/receipts I should collect as proof.",
        ].join("\n")

        const response = await fetch("/api/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileId: "kisan-vakil",
            locale: mapLanguageToChatLocale(language),
            stream: false,
            cache: false,
            messages: [
              {
                id: `doc-analyzer-${Date.now()}`,
                role: "user",
                parts: [{ type: "text", text: prompt }],
              },
            ],
          }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.text) {
          throw new Error(data?.error || "Could not get a response.")
        }

        setAskAnswer(data.text)
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : "Ask Kisan Vakil failed."
        setAskAnswer(message)
        toast.error(message)
      } finally {
        setIsAskingAi(false)
      }
    },
    [language, selectedSubdivision]
  )

  const askPreset = React.useCallback(
    async (key: keyof typeof ASK_PRESETS) => {
      if (!selectionText) {
        toast.error("Select a line from the translation first.")
        return
      }

      const preset = ASK_PRESETS[key]
      await askOnText({
        title: preset.title,
        instruction: preset.instruction,
        contextText: selectionText,
      })
    },
    [askOnText, selectionText]
  )

  const askCustom = React.useCallback(async () => {
    if (!selectionText) {
      toast.error("Select a line from the translation first.")
      return
    }

    if (!customQuestion.trim()) {
      toast.error("Type a question first.")
      return
    }

    await askOnText({
      title: "Custom question",
      instruction: customQuestion.trim(),
      contextText: selectionText,
    })
  }, [askOnText, customQuestion, selectionText])

  const analyzeFullDocument = React.useCallback(async () => {
    if (!translatedText) {
      toast.error("Translate the document first.")
      return
    }

    try {
      setIsAnalyzing(true)
      setActiveTab("synthesis")

      const stateContext = selectedSubdivision
        ? `\n\nState context: ${selectedSubdivision.name} (${selectedSubdivision.code}). If any rule depends on state (e.g., stamp duty, land revenue code), explicitly say so.`
        : ""

      const instruction =
        "You are Kisan Vakil. Synthesize a whole-document review.\n" +
        "Use plain language with these sections:\n" +
        "1) What this paper is about (3 bullets)\n" +
        "2) Key clauses (max 8 bullets)\n" +
        "3) Red flags / risky terms (max 10 bullets)\n" +
        "4) What to verify before signing (max 10 bullets)\n" +
        "5) What proof to collect (max 8 bullets)\n" +
        "6) Suggested next steps (max 6 bullets)\n" +
        "If you are unsure, say what information is missing." +
        stateContext

      const corpus = chunkNotes
        ? chunkNotes
        : [
            "(Chunk-by-chunk notes are not available yet. Using an excerpt.)",
            translatedText.slice(0, 5000),
            "…",
            translatedText.slice(-5000),
          ].join("\n\n")

      const prompt = [
        instruction,
        "",
        "Document notes:",
        `\"\"\"${corpus.slice(0, 14000)}\"\"\"`,
      ].join("\n")

      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: "kisan-vakil",
          locale: mapLanguageToChatLocale(language),
          stream: false,
          cache: false,
          messages: [
            {
              id: `doc-analyzer-full-${Date.now()}`,
              role: "user",
              parts: [{ type: "text", text: prompt }],
            },
          ],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || "Could not analyze the document.")
      }

      if (activeDocumentId) {
        updateDocument(activeDocumentId, (doc) => ({
          ...doc,
          synthesis: data.text,
        }))
      }
      toast.success("Review ready.")
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error
          ? error.message
          : "Could not analyze the document."
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    activeDocumentId,
    chunkNotes,
    language,
    selectedSubdivision,
    translatedText,
    updateDocument,
  ])

  const isJobActive =
    !!translatorJobId &&
    (translatorStatus?.state == null ||
      (translatorStatus.state !== "done" &&
        translatorStatus.state !== "failed"))

  type InsightKind =
    | "normal"
    | "redFlags"
    | "warnings"
    | "clarify"
    | "contextualBad"

  const InsightTab = (props: {
    kind: InsightKind
    title: string
    empty: string
  }) => {
    if (!translatedText) {
      return (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Translate the document first.
        </div>
      )
    }

    const sections = translatorInsightChunks
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((chunk) => {
        const meta = chunkMetaByIndex.get(chunk.index)
        const label = meta
          ? `Page ${meta.pageNumber} (${meta.partNumber}/${meta.partCount})`
          : `Part ${chunk.index + 1}`

        const items = (chunk.insight[props.kind] ?? []).filter(Boolean)
        return { chunk, label, items }
      })
      .filter((x) => x.items.length > 0)

    const copyAll = () => {
      const lines: string[] = []
      for (const s of sections) {
        lines.push(`### ${s.label}`)
        for (const it of s.items) lines.push(`- ${it}`)
        lines.push("")
      }

      const out = lines.join("\n").trim()
      navigator.clipboard
        .writeText(out)
        .then(() => toast.success("Copied."))
        .catch(() => toast.error("Could not copy."))
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            <div className="text-xs text-muted-foreground">
              Chunk-by-chunk. Updates as we process.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={copyAll}
            disabled={sections.length === 0}
          >
            <Copy className="size-4" />
            Copy
          </Button>
        </div>

        {isJobActive && translatorStatus?.totalChunks ? (
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              Checking {translatorStatus.analyzedChunks}/
              {Math.max(1, translatorStatus.totalChunks)} chunks…
            </div>
          </div>
        ) : null}

        {sections.length ? (
          <div className="space-y-3">
            {sections.map((s) => (
              <div
                key={s.chunk.index}
                className="rounded-xl border bg-background"
              >
                <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {s.label}
                </div>
                <div className="p-3">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                    {s.items.map((it, idx) => (
                      <li key={idx} className="break-words">
                        {it}
                      </li>
                    ))}
                  </ul>

                  {s.chunk.insight.raw?.trim() ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                        Raw model output
                      </summary>
                      <pre className="mt-2 rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                        {s.chunk.insight.raw}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            {isJobActive ? "Still checking…" : props.empty}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
              DO NOT SIGN BLINDLY
            </span>
            <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold tracking-wide text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200">
              Analyzer (beta)
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Document analyzer
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload a photo or PDF, hear it in your language, and spot risky
            clauses before you sign.
          </p>

          <div className="grid gap-2 xs:grid-cols-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <FileText className="size-3.5" />
                Step 1
              </div>
              <div className="mt-1 text-sm font-medium">Add the paper</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Take a photo or upload a PDF.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <ScanLine className="size-3.5" />
                Step 2
              </div>
              <div className="mt-1 text-sm font-medium">Choose language</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pick the language you speak at home.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <ShieldAlert className="size-3.5" />
                Step 3
              </div>
              <div className="mt-1 text-sm font-medium">Check and listen</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Review the warnings, then play the audio.
              </p>
            </div>
          </div>
        </div>

        <div className="grid w-full min-w-0 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <Button
            variant="outline"
            onClick={resetAll}
            disabled={documents.length === 0}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                disabled={
                  !translatedText && !translatorChunks.length && !chunkNotes
                }
              >
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!translatedText}
                onClick={() => {
                  const base = safeFileBase(activeDocument?.name || "document")
                  downloadTextFile({
                    filename: `${base}.translation.txt`,
                    content: translatedText || "",
                  })
                }}
              >
                Translation (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!chunkNotes}
                onClick={() => {
                  const base = safeFileBase(activeDocument?.name || "document")
                  downloadTextFile({
                    filename: `${base}.review.md`,
                    content: chunkNotes || "",
                    mime: "text/markdown;charset=utf-8",
                  })
                }}
              >
                Chunk review (.md)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!translatorInsightChunks.length}
                onClick={() => {
                  const base = safeFileBase(activeDocument?.name || "document")
                  downloadTextFile({
                    filename: `${base}.review.json`,
                    content: JSON.stringify(translatorInsightChunks, null, 2),
                    mime: "application/json;charset=utf-8",
                  })
                }}
              >
                Chunk review (.json)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!insights.trim()}
                onClick={() => {
                  const base = safeFileBase(activeDocument?.name || "document")
                  downloadTextFile({
                    filename: `${base}.synthesis.md`,
                    content: insights || "",
                    mime: "text/markdown;charset=utf-8",
                  })
                }}
              >
                Whole-paper synthesis (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleTranslate}
            disabled={
              !activeDocumentId || !file || isTranslating || isJobActive
            }
            className="w-full gap-2 sm:w-auto"
          >
            {isTranslating || isJobActive ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isTranslating
                  ? "Starting…"
                  : translatorStatus?.stage === "extracting"
                    ? "Reading pages…"
                    : translatorStatus?.stage === "analyzing"
                      ? "Checking…"
                      : "Translating…"}
              </>
            ) : (
              <>
                <ScanLine className="size-4" />
                Translate
              </>
            )}
          </Button>
        </div>
      </div>

      {translatorStatus ? (
        <div className="rounded-xl border bg-muted/10 p-3 text-xs text-muted-foreground">
          {(() => {
            const { steps, progressPct } = getStepState({
              status: translatorStatus,
            })
            const isActiveNow =
              translatorStatus.state !== "done" &&
              translatorStatus.state !== "failed"

            return (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((st) => (
                    <span
                      key={st.key}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold",
                        st.state === "done" &&
                          "bg-background text-muted-foreground",
                        st.state === "todo" &&
                          "bg-muted/20 text-muted-foreground",
                        st.state === "active" && "bg-background text-foreground"
                      )}
                    >
                      {st.state === "active" && isActiveNow ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : null}
                      {st.label}
                    </span>
                  ))}

                  <span className="flex w-full items-center justify-between gap-3 text-[11px] sm:ml-auto sm:w-auto sm:justify-end">
                    <span>
                      {translatorStatus.translatedChunks}/
                      {Math.max(1, translatorStatus.totalChunks)} translated
                    </span>
                    <span>
                      {translatorStatus.analyzedChunks}/
                      {Math.max(1, translatorStatus.totalChunks)} checked
                    </span>
                  </span>
                </div>

                <div className="mt-2">
                  <Progress value={progressPct} />
                </div>

                {translatorStatus.message ? (
                  <div className="mt-2 break-words">
                    {translatorStatus.message}
                  </div>
                ) : null}
              </>
            )
          })()}
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-4">
          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold">Upload</div>
              <div className="text-xs text-muted-foreground">PDF or photo</div>
            </div>

            <Dropzone
              src={documents.length ? documents.map((d) => d.file) : undefined}
              maxFiles={10}
              maxSize={10 * 1024 * 1024}
              accept={{
                "application/pdf": [".pdf"],
                "image/*": [".png", ".jpg", ".jpeg", ".webp"],
              }}
              onDrop={(accepted) => handleDrop(accepted)}
              className={cn(
                "rounded-xl border-dashed bg-muted/20 p-4! sm:p-6!",
                documents.length && "bg-emerald-50/40 dark:bg-emerald-950/10"
              )}
            >
              <DropzoneEmptyState>
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="text-sm font-semibold">
                    Tap to add a paper
                  </div>
                  <div className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Upload a photo or PDF. We will translate it and mark risky
                    parts in simple language.
                  </div>
                </div>
              </DropzoneEmptyState>
              <DropzoneContent className="px-2" />
            </Dropzone>

            {documents.length ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Documents
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setDocuments([])
                      setActiveDocumentId(null)
                      setSelectionText("")
                      setAskAnswer("")
                      setCustomQuestion("")
                      setActiveTab("text")
                    }}
                  >
                    Clear
                  </Button>
                </div>

                <ScrollArea className="max-h-44 pr-2">
                  <div className="space-y-1.5 pr-2">
                    {documents.map((d) => {
                      const isActive = d.id === activeDocumentId
                      const st = d.status?.state
                      const label = st ? st : d.jobId ? "queued" : "ready"

                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setActiveDocumentId(d.id)
                            setSelectionText("")
                            setAskAnswer("")
                            setCustomQuestion("")
                            setActiveTab("text")
                          }}
                          className={cn(
                            "w-full rounded-lg border px-2 py-2 text-left",
                            "transition-colors hover:bg-muted/20",
                            isActive
                              ? "border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20"
                              : "bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold">
                                {d.name}
                              </div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {label}
                                {d.status?.totalChunks ? (
                                  <>
                                    {" "}
                                    • {d.status.translatedChunks}/
                                    {Math.max(1, d.status.totalChunks)}
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {isActive ? (
                              <span className="shrink-0 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
                                Active
                              </span>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2"
                    onClick={() => selectByOffset(-1)}
                    disabled={activeIndex <= 0}
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2"
                    onClick={() => selectByOffset(1)}
                    disabled={
                      activeIndex === -1 || activeIndex >= documents.length - 1
                    }
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                {activeDocument ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="size-3.5" />
                    <span className="truncate">
                      Selected: {activeDocument.name}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-3 text-sm font-semibold">Language</div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Pick the language you speak at home so the audio is easy to
              follow.
            </p>
          </section>

          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-3 text-sm font-semibold">Read aloud length</div>
            <Select
              value={String(ttsSegmentSeconds)}
              onValueChange={(v) => setTtsSegmentSeconds(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select read length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 seconds (recommended)</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
                <SelectItem value="90">90 seconds</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Short audio works better on weak networks and is easier to replay.
            </p>
          </section>

          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">OCR provider</div>
              <span className="rounded-full border bg-muted/30 px-2 py-1 text-[11px] font-semibold text-foreground">
                Sarvam
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              OCR runs on Sarvam Document Intelligence for clearer photo
              reading.
            </p>
          </section>

          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-3 text-sm font-semibold">State (optional)</div>
            <Select
              value={stateCode || NO_STATE_VALUE}
              onValueChange={(value) =>
                setStateCode(value === NO_STATE_VALUE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATE_VALUE}>
                  No state selected
                </SelectItem>
                <SelectItem value="__states" disabled>
                  States
                </SelectItem>
                {INDIA_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value="__uts" disabled>
                  Union territories
                </SelectItem>
                {INDIA_UNION_TERRITORIES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This changes what we highlight (land record terms, state-dependent
              checks like stamp duty).
            </p>
          </section>

          <section className="rounded-2xl border bg-background p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Full-document check</div>
              <div className="text-xs text-muted-foreground">AI</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Summary, key clauses, red flags, and what to verify before
              signing.
            </p>
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={analyzeFullDocument}
                disabled={!translatedText || isAnalyzing || isJobActive}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Synthesizing…
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4" />
                    Synthesize whole paper
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 sm:w-auto"
                onClick={() => setActiveTab("highlights")}
                disabled={!translatedText}
              >
                <Sparkles className="size-4" />
                View highlights
              </Button>
            </div>
          </section>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <section className="overflow-hidden rounded-2xl border bg-background">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex w-full flex-col"
            >
              <div className="border-b px-3 py-2.5 sm:px-4 sm:py-3">
                <TabsList
                  variant="line"
                  className={cn(
                    "w-full justify-start gap-1 rounded-none bg-transparent p-0",
                    "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  )}
                >
                  <TabsTrigger
                    value="text"
                    className="flex-none px-2 text-xs sm:text-sm"
                  >
                    Translation
                  </TabsTrigger>
                  <TabsTrigger
                    value="redflags"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Red flags
                    {insightCounts.redFlags ? (
                      <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                        {insightCounts.redFlags}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="warnings"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Warnings
                    {insightCounts.warnings ? (
                      <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                        {insightCounts.warnings}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="clarify"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Clarify
                    {insightCounts.clarify ? (
                      <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                        {insightCounts.clarify}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="context"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Context
                    {insightCounts.contextualBad ? (
                      <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                        {insightCounts.contextualBad}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="normal"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Normal
                    {insightCounts.normal ? (
                      <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                        {insightCounts.normal}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="synthesis"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Synthesis
                  </TabsTrigger>
                  <TabsTrigger
                    value="highlights"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Highlights
                  </TabsTrigger>
                  <TabsTrigger
                    value="audio"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Audio
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="text" className="m-0 p-3 sm:p-4">
                {!translatedText ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {isJobActive ? (
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          Working in the background…
                        </div>
                        <div>
                          {translatorStatus?.message ||
                            "Reading and translating your document safely, chunk by chunk."}
                        </div>
                      </div>
                    ) : (
                      <>
                        Upload files, select one, then hit{" "}
                        <span className="font-medium">Translate</span>. Select a
                        risky line to ask Kisan Vakil for an explanation.
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      ref={translationContainerRef}
                      onMouseUp={() =>
                        window.requestAnimationFrame(updateSelection)
                      }
                      onKeyUp={() =>
                        window.requestAnimationFrame(updateSelection)
                      }
                      onTouchEnd={() =>
                        window.requestAnimationFrame(updateSelection)
                      }
                      className={cn(
                        "max-h-[55vh] overflow-auto rounded-lg border bg-background px-3 py-3 sm:max-h-[62vh] sm:px-4",
                        selectionText
                          ? "ring-1 ring-orange-200 dark:ring-orange-900/40"
                          : ""
                      )}
                    >
                      <div className="prose prose-slate prose-p:mb-4 prose-p:text-sm prose-p:leading-relaxed last:prose-p:mb-0 dark:prose-invert max-w-none select-text">
                        {translatedPages.map((page) => (
                          <div key={page.pageNumber} className="mb-6 last:mb-0">
                            {translatedPages.length > 1 ? (
                              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                <span>Page {page.pageNumber}</span>
                                <span>
                                  {page.isComplete
                                    ? "done"
                                    : `${page.completedParts}/${page.expectedParts}`}
                                </span>
                              </div>
                            ) : null}

                            {page.parts.map((part) => {
                              const raw = part.text || ""

                              if (containsHtmlTable(raw)) {
                                return (
                                  <SafeHtml
                                    key={`part-${part.index}`}
                                    html={raw}
                                    className="text-sm leading-relaxed text-foreground/90"
                                  />
                                )
                              }

                              const paras = raw
                                .split(/\n+/)
                                .map((p) => p.trim())
                                .filter(Boolean)

                              return paras.map((text, idx) => (
                                <p
                                  key={`${part.index}-${idx}`}
                                  id={`p-${part.index}-${idx}`}
                                  className="break-words"
                                >
                                  {renderWithHighlights(
                                    text,
                                    summary
                                      ? getHighlightRangesForText(text, summary)
                                      : []
                                  )}
                                </p>
                              ))
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Floating / contextual toolbar */}
                    <div
                      className={cn(
                        "sticky bottom-0 z-10 -mx-3 rounded-b-xl border-t bg-background/80 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4",
                        selectionText
                          ? "bg-orange-50/70 dark:bg-orange-950/20"
                          : ""
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                          {selectionText
                            ? "Selected line — quick actions"
                            : "Select a line to unlock quick actions"}
                        </div>
                        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-2 xs:col-span-2"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(translatedText)
                                .then(() =>
                                  toast.success("Copied translation.")
                                )
                                .catch(() => toast.error("Could not copy."))
                            }
                          >
                            <Copy className="size-4" />
                            Copy all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-2 sm:w-auto"
                            onClick={() => {
                              if (!selectionText) return
                              navigator.clipboard
                                .writeText(selectionText)
                                .then(() => toast.success("Copied selection."))
                                .catch(() => toast.error("Could not copy."))
                            }}
                            disabled={!selectionText}
                          >
                            <Copy className="size-4" />
                            Copy line
                          </Button>
                        </div>
                      </div>

                      {selectionText ? (
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <div className="line-clamp-2 text-xs text-muted-foreground">
                            {selectionText}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectionText("")
                              window.getSelection()?.removeAllRanges?.()
                            }}
                            title="Clear selection"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : null}

                      <div className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap">
                        <Button
                          size="sm"
                          className="w-full gap-2 xs:col-span-2"
                          variant="default"
                          onClick={() => askPreset("explain")}
                          disabled={!selectionText}
                        >
                          <Sparkles className="size-4" />
                          Explain
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2"
                          variant="outline"
                          onClick={() => askPreset("redflags")}
                          disabled={!selectionText}
                        >
                          <ShieldAlert className="size-4" />
                          Red flags
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2"
                          variant="outline"
                          onClick={() => askPreset("urgency")}
                          disabled={!selectionText}
                        >
                          <AlertTriangle className="size-4" />
                          Urgency
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="redflags" className="m-0 p-3 sm:p-4">
                <InsightTab
                  kind="redFlags"
                  title="Red flags"
                  empty="No red flags found in the analyzed chunks."
                />
              </TabsContent>

              <TabsContent value="warnings" className="m-0 p-3 sm:p-4">
                <InsightTab
                  kind="warnings"
                  title="Warnings"
                  empty="No warnings found in the analyzed chunks."
                />
              </TabsContent>

              <TabsContent value="clarify" className="m-0 p-3 sm:p-4">
                <InsightTab
                  kind="clarify"
                  title="Clarify"
                  empty="No clarification items found in the analyzed chunks."
                />
              </TabsContent>

              <TabsContent value="context" className="m-0 p-3 sm:p-4">
                <InsightTab
                  kind="contextualBad"
                  title="Contextually bad"
                  empty="No state/profile-specific risks found yet."
                />
              </TabsContent>

              <TabsContent value="normal" className="m-0 p-3 sm:p-4">
                <InsightTab
                  kind="normal"
                  title="Normal (what it says)"
                  empty="No notes yet."
                />
              </TabsContent>

              <TabsContent value="synthesis" className="m-0 p-3 sm:p-4">
                {!translatedText ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Translate the document first.
                  </div>
                ) : insights ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          Whole-paper synthesis
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Consolidated summary + red-flag review.
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2 sm:w-auto"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(insights)
                              .then(() => toast.success("Copied."))
                              .catch(() => toast.error("Could not copy."))
                          }
                        >
                          <Copy className="size-4" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          className="w-full gap-2 sm:w-auto"
                          onClick={analyzeFullDocument}
                          disabled={isAnalyzing || isJobActive}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Synthesizing…
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="size-4" />
                              Re-run
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {insights}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                      {isJobActive
                        ? "Chunk-by-chunk checks will improve the synthesis as we process."
                        : "Click 'Synthesize whole paper' on the left to generate a consolidated review."}
                    </div>
                    <Button
                      className="w-full gap-2 sm:w-auto"
                      onClick={analyzeFullDocument}
                      disabled={!translatedText || isAnalyzing || isJobActive}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Synthesizing…
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="size-4" />
                          Synthesize whole paper
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="highlights" className="m-0 p-3 sm:p-4">
                {!translatedText || !summary ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Translate the document first.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-sm font-semibold">
                        What we detected
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        These are heuristics (not legal advice). Use them as a
                        checklist.
                      </div>

                      <div className="mt-3">
                        {/* Mobile: category chips (scrollable) */}
                        <div className="sm:hidden">
                          <ScrollArea className="w-full">
                            <div className="flex w-max gap-2 pr-2">
                              {summary.classes.map((c) => (
                                <span
                                  key={c.id}
                                  className={cn(
                                    "shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold",
                                    c.score === 0 && "opacity-50"
                                  )}
                                  title={`Score: ${c.score}`}
                                >
                                  {c.label}
                                  {c.score > 0 ? (
                                    <span className="ml-2 rounded-full border bg-muted/30 px-1.5 py-0.5 text-[10px]">
                                      {c.score}
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Desktop: ranked list with bars */}
                        <div className="hidden sm:block">
                          <div className="grid gap-2">
                            {(() => {
                              const max = Math.max(
                                1,
                                ...summary.classes.map((c) => c.score)
                              )
                              return summary.classes.map((c) => (
                                <div
                                  key={c.id}
                                  className={cn(
                                    "rounded-lg border bg-background px-3 py-2",
                                    c.score === 0 && "opacity-60"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-semibold">
                                      {c.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {c.score}
                                    </div>
                                  </div>
                                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-emerald-500/70"
                                      style={{
                                        width: `${Math.round((c.score / max) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>

                      {selectedSubdivision && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          State context:{" "}
                          <span className="font-medium">
                            {selectedSubdivision.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border bg-background p-4">
                        <div className="text-sm font-semibold">
                          Legal references
                        </div>
                        <div className="mt-2 space-y-2">
                          {summary.findings
                            .filter(
                              (f) => f.kind === "section" || f.kind === "law"
                            )
                            .slice(0, 12)
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex items-start justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm leading-snug font-medium">
                                    {f.label}
                                  </div>
                                  {f.examples?.length ? (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Examples: {f.examples.join(", ")}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="shrink-0 rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold">
                                  {f.count}
                                </div>
                              </div>
                            ))}
                          {!summary.findings.some(
                            (f) => f.kind === "section" || f.kind === "law"
                          ) && (
                            <div className="text-sm text-muted-foreground">
                              No common law/section references detected.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-background p-4">
                        <div className="text-sm font-semibold">Clauses</div>
                        <div className="mt-2 space-y-2">
                          {summary.findings
                            .filter((f) => f.kind === "clause")
                            .slice(0, 12)
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex items-start justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm leading-snug font-medium">
                                    {f.label}
                                  </div>
                                </div>
                                <div className="shrink-0 rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold">
                                  {f.count}
                                </div>
                              </div>
                            ))}
                          {!summary.findings.some(
                            (f) => f.kind === "clause"
                          ) && (
                            <div className="text-sm text-muted-foreground">
                              No typical clause keywords detected.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {summary.stateContext && (
                      <div className="rounded-lg border bg-background p-4">
                        <div className="text-sm font-semibold">
                          State-specific checklist
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          These vary by state; treat as “what to verify”
                          prompts.
                        </div>

                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                              Common land record terms
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {summary.stateContext.landRecordTerms.length ? (
                                summary.stateContext.landRecordTerms.map(
                                  (t) => (
                                    <span
                                      key={t}
                                      className="rounded-full border bg-muted/20 px-2.5 py-1 text-xs font-semibold"
                                    >
                                      {t}
                                    </span>
                                  )
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No state-specific land record terms mapped
                                  yet.
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                              State law families (check the state versions)
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {summary.stateContext.lawFamilies.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audio" className="m-0 p-3 sm:p-4">
                {translatedText ? (
                  <TTSPlayer
                    text={translatedText}
                    language={language}
                    segmentSeconds={ttsSegmentSeconds}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Translate the document first.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      <Drawer open={askDrawerOpen} onOpenChange={setAskDrawerOpen}>
        <DrawerContent className="mx-auto max-h-[86vh] w-full max-w-4xl">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{askTitle}</DrawerTitle>
            <DrawerDescription>
              Plain-language help based on the selected line.
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="h-[60vh] px-4">
            <div className="space-y-4 py-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                  Selected text
                </div>
                <div className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {selectionText || "No selected text available."}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                  Kisan Vakil response
                </div>

                <div className="mt-2">
                  {isAskingAi ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking…
                    </div>
                  ) : askAnswer ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {askAnswer}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Choose an action above or ask a custom question.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                  Custom follow-up
                </div>
                <Textarea
                  value={customQuestion}
                  onChange={(event) => setCustomQuestion(event.target.value)}
                  placeholder="Example: What should I verify in the revenue office before signing this?"
                  className="mt-2 min-h-24"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={askCustom}
                    disabled={
                      isAskingAi || !selectionText || !customQuestion.trim()
                    }
                    className="gap-2"
                  >
                    <Sparkles className="size-4" />
                    Ask question
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
