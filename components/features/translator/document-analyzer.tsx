"use client"

import * as React from "react"
import {
  AlertTriangle,
  FileText,
  Loader2,
  ScanLine,
  ShieldAlert,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { TTSPlayer } from "@/components/features/translator/tts-player"
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

export function DocumentAnalyzer() {
  const [file, setFile] = React.useState<File | null>(null)
  const [language, setLanguage] = React.useState<string>("hi-IN")
  const [stateCode, setStateCode] = React.useState<string>("")

  const [isTranslating, setIsTranslating] = React.useState(false)
  const [translatedText, setTranslatedText] = React.useState<string | null>(
    null
  )

  const [selectionText, setSelectionText] = React.useState<string>("")
  const [activeTab, setActiveTab] = React.useState<
    "text" | "audio" | "insights" | "highlights"
  >("text")

  const [askDrawerOpen, setAskDrawerOpen] = React.useState(false)
  const [isAskingAi, setIsAskingAi] = React.useState(false)
  const [askTitle, setAskTitle] = React.useState<string>("Ask Kisan Vakil")
  const [askAnswer, setAskAnswer] = React.useState<string>("")
  const [customQuestion, setCustomQuestion] = React.useState("")

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [insights, setInsights] = React.useState<string>("")

  const translationContainerRef = React.useRef<HTMLDivElement>(null)

  const selectedSubdivision = React.useMemo(
    () => getIndianSubdivision(stateCode),
    [stateCode]
  )

  const paragraphs = React.useMemo(() => {
    if (!translatedText) return [] as string[]
    return translatedText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
  }, [translatedText])

  const summary = React.useMemo(() => {
    if (!translatedText) return null
    return summarizeDocument(translatedText, { stateCode })
  }, [translatedText, stateCode])

  const highlightedParagraphs = React.useMemo(() => {
    if (!summary) return [] as Array<{ text: string; ranges: HighlightRange[] }>
    return paragraphs.map((p) => ({
      text: p,
      ranges: getHighlightRangesForText(p, summary),
    }))
  }, [paragraphs, summary])

  const resetAll = React.useCallback(() => {
    setFile(null)
    setIsTranslating(false)
    setTranslatedText(null)
    setSelectionText("")
    setAskDrawerOpen(false)
    setIsAskingAi(false)
    setAskTitle("Ask Kisan Vakil")
    setAskAnswer("")
    setCustomQuestion("")
    setIsAnalyzing(false)
    setInsights("")
    setActiveTab("text")
  }, [])

  const handleDrop = React.useCallback((accepted: File[]) => {
    const next = accepted?.[0] ?? null
    setFile(next)
    setTranslatedText(null)
    setSelectionText("")
    setAskAnswer("")
    setCustomQuestion("")
    setInsights("")
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
    if (!file) {
      toast.error("Please upload a document or image first.")
      return
    }

    try {
      setIsTranslating(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("language", language)

      const response = await fetch("/api/translate-document", {
        method: "POST",
        body: formData,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || "Translation failed")
      }

      setTranslatedText(data.text)
      setSelectionText("")
      setAskAnswer("")
      setInsights("")
      toast.success("Translation ready.")
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : "Failed to translate document."
      toast.error(message)
    } finally {
      setIsTranslating(false)
    }
  }, [file, language])

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
      setActiveTab("insights")

      const stateContext = selectedSubdivision
        ? `\n\nState context: ${selectedSubdivision.name} (${selectedSubdivision.code}). If any rule depends on state (e.g., stamp duty, land revenue code), explicitly say so.`
        : ""

      const instruction =
        "You are Kisan Vakil. Analyze the translated document below. Output in plain language with these sections:\n" +
        "1) What this paper is about (3 bullets)\n" +
        "2) Key clauses (max 8 bullets)\n" +
        "3) Red flags / risky terms (max 10 bullets)\n" +
        "4) What to verify before signing (max 10 bullets)\n" +
        "5) What proof to collect (max 8 bullets)\n" +
        "6) Suggested next steps (max 6 bullets)\n" +
        "If you are unsure, say what information is missing." +
        stateContext

      const prompt = [
        instruction,
        "",
        "Translated document:",
        `\"\"\"${translatedText.slice(0, 12000)}\"\"\"`,
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

      setInsights(data.text)
      toast.success("Insights ready.")
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
  }, [language, selectedSubdivision, translatedText])

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
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
          <p className="text-sm text-muted-foreground">
            Upload a paper, get a translation, listen to it, then review
            detected clauses and legal references.
          </p>
        </div>

        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <Button
            variant="outline"
            onClick={resetAll}
            disabled={!file && !translatedText}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={!file || isTranslating}
            className="w-full gap-2 sm:w-auto"
          >
            {isTranslating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Translating…
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

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="space-y-4 sm:space-y-6 lg:col-span-4">
          <section className="rounded-xl border bg-background p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Upload</div>
              <div className="text-xs text-muted-foreground">PDF or photo</div>
            </div>

            <Dropzone
              src={file ? [file] : undefined}
              maxFiles={1}
              maxSize={10 * 1024 * 1024}
              accept={{
                "application/pdf": [".pdf"],
                "image/*": [".png", ".jpg", ".jpeg", ".webp"],
              }}
              onDrop={(accepted) => handleDrop(accepted)}
              className={cn(
                "rounded-lg border-dashed bg-muted/20",
                file && "bg-emerald-50/40 dark:bg-emerald-950/10"
              )}
            >
              <DropzoneEmptyState />
              <DropzoneContent className="px-2" />
            </Dropzone>

            {file && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                <span className="truncate">{file.name}</span>
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-background p-3 sm:p-4">
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
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: set this to your spoken language so audio playback is useful.
            </p>
          </section>

          <section className="rounded-xl border bg-background p-3 sm:p-4">
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
            <p className="mt-2 text-xs text-muted-foreground">
              This changes what we highlight (land record terms, state-dependent
              checks like stamp duty).
            </p>
          </section>

          <section className="rounded-xl border bg-background p-3 sm:p-4">
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
                disabled={!translatedText || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4" />
                    Analyze whole document
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

        <div className="lg:col-span-8">
          <section className="overflow-hidden rounded-xl border bg-background">
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
                  <TabsTrigger
                    value="insights"
                    className="flex-none px-2 text-xs sm:text-sm"
                    disabled={!translatedText}
                  >
                    Insights
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="text" className="m-0 p-3 sm:p-4">
                {!translatedText ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Upload a file and hit{" "}
                    <span className="font-medium">Translate</span>. Then select
                    a risky line to ask Kisan Vakil for an explanation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "rounded-lg border bg-muted/20 p-3",
                        selectionText
                          ? "border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20"
                          : ""
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                          {selectionText
                            ? "Selected text — quick actions"
                            : "Select a line to unlock quick actions"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(translatedText)
                                .then(() =>
                                  toast.success("Copied translation.")
                                )
                                .catch(() => toast.error("Could not copy."))
                            }
                          >
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
                            Copy line
                          </Button>
                        </div>
                      </div>

                      {selectionText && (
                        <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {selectionText}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <Button
                          size="sm"
                          className="col-span-2 gap-2 sm:col-span-1"
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
                      className="max-h-[55vh] overflow-auto rounded-lg border bg-background px-3 py-3 sm:max-h-[62vh] sm:px-4"
                    >
                      <div className="prose prose-slate prose-p:mb-4 prose-p:text-sm prose-p:leading-relaxed last:prose-p:mb-0 dark:prose-invert max-w-none select-text">
                        {highlightedParagraphs.map((p, index) => (
                          <p
                            key={index}
                            id={`p-${index}`}
                            className="break-words"
                          >
                            {renderWithHighlights(p.text, p.ranges)}
                          </p>
                        ))}
                      </div>
                    </div>
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
                  <TTSPlayer text={translatedText} language={language} />
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Translate the document first.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="insights" className="m-0 p-3 sm:p-4">
                {!translatedText ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Translate the document first.
                  </div>
                ) : insights ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">Insights</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(insights)
                            .then(() => toast.success("Copied insights."))
                            .catch(() => toast.error("Could not copy."))
                        }
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {insights}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Run{" "}
                    <span className="font-medium">Analyze whole document</span>{" "}
                    to get red flags and next steps.
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
