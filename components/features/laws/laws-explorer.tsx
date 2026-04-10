"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  BookOpenText,
  Calendar,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from "lucide-react"
import { FaGavel } from "react-icons/fa6"
import { FiTag } from "react-icons/fi"
import { HiMiniMicrophone, HiMiniStop } from "react-icons/hi2"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TTSPlayer } from "@/components/features/translator/tts-player"
import { cn } from "@/lib/utils"

type SearchMode = "keyword" | "nl"

type LawLocale = "en" | "hi" | "mr"

type LawSearchHit = {
  id: string
  score: number
  priority?: number
  jurisdiction?: {
    country: "IN"
    stateCode?: string
    stateName?: string
    region?: string
  }
  title: string
  shortTitle?: string
  year?: number
  status: string
  kind: string
  topics: string[]
  snippet: string
}

type LawDetail = {
  id: string
  title: string
  shortTitle?: string
  year?: number
  status: string
  kind: string
  topics: string[]
  keywords: string[]
  plainLanguage: {
    summary: string
    whenApplies: string[]
    keyPoints: string[]
    whatToDo: string[]
    requiredDocs: string[]
    redFlags: string[]
    edgeCases: string[]
    sideEffects: string[]
  }
  legal: null | { overview?: string; keySections?: string[] }
  sources: Array<{ label: string; url: string; kind: string }>
  related: Array<{
    id: string
    title: string
    shortTitle?: string
    year?: number
    kind: string
    status: string
    topics: string[]
    snippet: string
  }>
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const LAW_CONTENT_LANGUAGES: Array<{ value: LawLocale; label: string }> = [
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
  { value: "en", label: "English" },
]

export function LawsExplorer() {
  const t = useTranslations("Laws")
  const locale = useLocale()

  const defaultLawLocale = React.useMemo<LawLocale>(() => {
    if (locale === "en" || locale === "hi" || locale === "mr") return locale
    return "hi"
  }, [locale])

  const [contentLocale, setContentLocale] =
    React.useState<LawLocale>(defaultLawLocale)

  const [mode, setMode] = React.useState<SearchMode>("nl")
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query, 250)

  const [lawDrawerOpen, setLawDrawerOpen] = React.useState(false)
  const [selectedLawId, setSelectedLawId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!lawDrawerOpen) setContentLocale(defaultLawLocale)
  }, [defaultLawLocale, lawDrawerOpen])

  const [askDrawerOpen, setAskDrawerOpen] = React.useState(false)
  const [askAnswer, setAskAnswer] = React.useState("")
  const [askTitle, setAskTitle] = React.useState<string>(t("askTitle"))
  const [customQuestion, setCustomQuestion] = React.useState("")

  const [topicFilters, setTopicFilters] = React.useState<string[]>([])
  const [kindFilters, setKindFilters] = React.useState<string[]>([])

  const recognitionRef = React.useRef<any>(null)
  const [speechSupported, setSpeechSupported] = React.useState(false)
  const [speechListening, setSpeechListening] = React.useState(false)
  const [speechTarget, setSpeechTarget] = React.useState<
    null | "query" | "followUp"
  >(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const supported =
      !!(window as any).SpeechRecognition ||
      !!(window as any).webkitSpeechRecognition
    setSpeechSupported(supported)

    return () => {
      try {
        recognitionRef.current?.abort?.()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  const lawContentRef = React.useRef<HTMLDivElement | null>(null)
  const [selectionText, setSelectionText] = React.useState("")
  const [selectionRect, setSelectionRect] = React.useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  const searchQuery = useQuery({
    queryKey: ["laws", "search", locale, mode, debouncedQuery],
    queryFn: async (): Promise<LawSearchHit[]> => {
      const url = new URL("/api/laws", window.location.origin)
      url.searchParams.set("locale", locale)
      url.searchParams.set("mode", mode)
      if (debouncedQuery.trim()) url.searchParams.set("q", debouncedQuery)

      const res = await fetch(url.toString())
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("searchFailed"))
      return data?.data ?? []
    },
  })

  const lawDetailQuery = useQuery({
    queryKey: ["laws", "detail", contentLocale, selectedLawId],
    enabled: !!selectedLawId,
    queryFn: async (): Promise<LawDetail> => {
      const id = selectedLawId
      if (!id) throw new Error("Missing id")
      const url = new URL(`/api/laws/${id}`, window.location.origin)
      url.searchParams.set("locale", contentLocale)
      const res = await fetch(url.toString())
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("detailFailed"))
      return data.data
    },
  })

  const askMutation = useMutation({
    mutationFn: async (input: {
      lawId: string
      question?: string
      selectionText?: string
    }) => {
      const url = new URL(
        `/api/laws/${input.lawId}/questions`,
        window.location.origin
      )
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: contentLocale,
          question: input.question,
          selectionText: input.selectionText,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("askFailed"))
      return data.data as { lawId: string; text: string }
    },
    onSuccess: (data) => {
      setAskAnswer(data.text)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("askFailed")
      setAskAnswer(message)
      toast.error(message)
    },
  })

  const updateSelection = React.useCallback(() => {
    const container = lawContentRef.current
    const domSelection = window.getSelection()

    if (
      !container ||
      !domSelection ||
      domSelection.rangeCount === 0 ||
      domSelection.isCollapsed
    ) {
      setSelectionText("")
      setSelectionRect(null)
      return
    }

    const range = domSelection.getRangeAt(0)
    const selectedText = domSelection.toString().replace(/\s+/g, " ").trim()

    const ancestor =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element)

    if (!selectedText || !ancestor || !container.contains(ancestor)) {
      setSelectionText("")
      setSelectionRect(null)
      return
    }

    const rect = range.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) {
      setSelectionText("")
      setSelectionRect(null)
      return
    }

    setSelectionText(selectedText.slice(0, 2000))
    setSelectionRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })
  }, [])

  React.useEffect(() => {
    if (!lawDrawerOpen) {
      setSelectionText("")
      setSelectionRect(null)
      return
    }

    const onMouseUp = () => updateSelection()
    const onKeyUp = () => updateSelection()
    document.addEventListener("mouseup", onMouseUp)
    document.addEventListener("keyup", onKeyUp)
    document.addEventListener("selectionchange", onMouseUp)

    return () => {
      document.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("keyup", onKeyUp)
      document.removeEventListener("selectionchange", onMouseUp)
    }
  }, [lawDrawerOpen, updateSelection])

  const openLaw = React.useCallback(
    (id: string) => {
      setSelectedLawId(id)
      setLawDrawerOpen(true)
      setAskDrawerOpen(false)
      setAskAnswer("")
      setCustomQuestion("")
      setSelectionText("")
      setSelectionRect(null)
      setContentLocale(defaultLawLocale)
    },
    [defaultLawLocale]
  )

  const openAsk = React.useCallback(
    (opts: { title: string; question?: string; selectionText?: string }) => {
      const lawId = selectedLawId
      if (!lawId) return

      setAskDrawerOpen(true)
      setAskTitle(opts.title)
      setAskAnswer("")

      askMutation.mutate({
        lawId,
        question: opts.question,
        selectionText: opts.selectionText,
      })
    },
    [askMutation, selectedLawId]
  )

  const law = lawDetailQuery.data ?? null

  const displayTopic = React.useCallback(
    (topic: string) => formatTopicLabel(topic, locale),
    [locale]
  )

  const allTopics = React.useMemo(() => {
    const topics = new Set<string>()
    for (const hit of searchQuery.data ?? []) {
      for (const topic of hit.topics ?? []) topics.add(topic)
    }
    return Array.from(topics).sort((a, b) => a.localeCompare(b))
  }, [searchQuery.data])

  const allKinds = React.useMemo(() => {
    const kinds = new Set<string>()
    for (const hit of searchQuery.data ?? []) {
      if (hit.kind) kinds.add(hit.kind)
    }
    return Array.from(kinds).sort((a, b) => a.localeCompare(b))
  }, [searchQuery.data])

  const hasFilters = topicFilters.length > 0 || kindFilters.length > 0

  const filteredHits = React.useMemo(() => {
    const hits = searchQuery.data ?? []
    return hits.filter((hit) => {
      if (topicFilters.length > 0) {
        const ok = hit.topics?.some((topic) => topicFilters.includes(topic))
        if (!ok) return false
      }

      if (kindFilters.length > 0) {
        if (!kindFilters.includes(hit.kind)) return false
      }

      return true
    })
  }, [searchQuery.data, topicFilters, kindFilters])

  const topTopics = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const hit of searchQuery.data ?? []) {
      for (const topic of hit.topics ?? []) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1)
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }))
  }, [searchQuery.data])

  const kindLabel = React.useCallback(
    (kind: string) => {
      const normalized = (kind ?? "").toLowerCase()
      const key = `kind_${normalized}` as const
      // If the translation key doesn't exist, fall back safely.
      try {
        return t(key)
      } catch {
        return normalized ? normalized.replace(/-/g, " ") : t("unknown")
      }
    },
    [t]
  )

  const statusLabel = React.useCallback(
    (status: string) => {
      const normalized = (status ?? "").toLowerCase()
      const key = `status_${normalized}` as const
      try {
        return t(key)
      } catch {
        return normalized ? normalized.replace(/-/g, " ") : t("unknown")
      }
    },
    [t]
  )

  const stopVoice = React.useCallback(() => {
    try {
      recognitionRef.current?.stop?.()
    } catch {
      // ignore
    }
    recognitionRef.current = null
    setSpeechListening(false)
    setSpeechTarget(null)
  }, [])

  const startVoice = React.useCallback(
    (target: "query" | "followUp") => {
      if (typeof window === "undefined") return

      const Ctor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

      if (!Ctor) {
        toast.error(t("voiceNotSupported"))
        return
      }

      if (speechListening) {
        stopVoice()
        return
      }

      const recognition = new Ctor()
      recognitionRef.current = recognition

      recognition.lang = resolveSpeechLanguage(locale)
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const transcript =
          event?.results?.[0]?.[0]?.transcript?.toString?.().trim?.() ?? ""
        if (!transcript) return

        if (target === "query") {
          setQuery((prev) =>
            prev.trim() ? `${prev.trim()} ${transcript}` : transcript
          )
        } else {
          setCustomQuestion((prev) =>
            prev.trim() ? `${prev.trim()} ${transcript}` : transcript
          )
        }
      }

      recognition.onerror = (event: any) => {
        const err = event?.error?.toString?.() ?? ""
        if (err === "not-allowed" || err === "service-not-allowed") {
          toast.error(t("voicePermissionDenied"))
        } else {
          toast.error(t("voiceFailed"))
        }
      }

      recognition.onend = () => {
        setSpeechListening(false)
        setSpeechTarget(null)
        recognitionRef.current = null
      }

      setSpeechTarget(target)
      setSpeechListening(true)
      try {
        recognition.start()
      } catch {
        setSpeechListening(false)
        setSpeechTarget(null)
        recognitionRef.current = null
        toast.error(t("voiceFailed"))
      }
    },
    [locale, speechListening, stopVoice, t]
  )

  const ttsText = React.useMemo(() => {
    if (!law) return ""

    const parts: string[] = []
    parts.push(law.plainLanguage.summary)

    if (law.plainLanguage.whenApplies.length) {
      parts.push(...law.plainLanguage.whenApplies)
    }

    if (law.plainLanguage.whatToDo.length) {
      parts.push(...law.plainLanguage.whatToDo)
    }

    return parts.join("\n")
  }, [law])

  const ttsLanguage = React.useMemo(() => {
    if (contentLocale === "mr") return "mr-IN"
    if (contentLocale === "en") return "en-IN"
    return "hi-IN"
  }, [contentLocale])

  const toolbar = selectionRect && selectionText

  const toolbarLeft = toolbar
    ? clamp(
        selectionRect.left + selectionRect.width / 2,
        88,
        window.innerWidth - 88
      )
    : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl border bg-muted/20">
                <FaGavel className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg leading-tight font-semibold">
                  {t("title")}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {t("subtitle")}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => {
              setQuery("")
              toast.success(t("cleared"))
            }}
            disabled={!query.trim()}
          >
            <BookOpenText className="size-4" />
            {t("clear")}
          </Button>
        </div>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as SearchMode)}
        className="flex w-full flex-col space-y-2"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="keyword">{t("modeKeyword")}</TabsTrigger>
          <TabsTrigger value="nl">{t("modeNL")}</TabsTrigger>
        </TabsList>

        <TabsContent value="keyword" className="m-0">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>
                <Search />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholderKeyword")}
              aria-label={t("placeholderKeyword")}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                variant={
                  speechListening && speechTarget === "query"
                    ? "secondary"
                    : "ghost"
                }
                disabled={!speechSupported}
                title={
                  speechSupported
                    ? speechListening && speechTarget === "query"
                      ? t("voiceStop")
                      : t("voiceStart")
                    : t("voiceNotSupported")
                }
                aria-label={t("voice")}
                onClick={() => startVoice("query")}
              >
                {speechListening && speechTarget === "query" ? (
                  <HiMiniStop className="size-4" />
                ) : (
                  <HiMiniMicrophone className="size-4" />
                )}
              </InputGroupButton>
              <InputGroupButton
                onClick={() => setQuery((q) => q.trim())}
                disabled={!query.trim()}
              >
                {t("search")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TabsContent>

        <TabsContent value="nl" className="m-0">
          <InputGroup className="h-auto">
            <InputGroupAddon align="block-start" className="border-b">
              <InputGroupText>
                <Sparkles />
                {t("nlHint")}
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholderNL")}
              aria-label={t("placeholderNL")}
              className="h-12"
            />
            <InputGroupAddon align="block-end" className="border-t">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {t("nlNote")}
                </div>
                <div className="flex items-center gap-2">
                  <InputGroupButton
                    size="icon-sm"
                    variant={
                      speechListening && speechTarget === "query"
                        ? "secondary"
                        : "ghost"
                    }
                    disabled={!speechSupported}
                    title={
                      speechSupported
                        ? speechListening && speechTarget === "query"
                          ? t("voiceStop")
                          : t("voiceStart")
                        : t("voiceNotSupported")
                    }
                    aria-label={t("voice")}
                    onClick={() => startVoice("query")}
                  >
                    {speechListening && speechTarget === "query" ? (
                      <HiMiniStop className="size-4" />
                    ) : (
                      <HiMiniMicrophone className="size-4" />
                    )}
                  </InputGroupButton>

                  <InputGroupButton
                    onClick={() => setQuery((q) => q.trim())}
                    disabled={!query.trim()}
                    className="gap-2"
                  >
                    <Search className="size-3.5" />
                    {t("search")}
                  </InputGroupButton>
                </div>
              </div>
            </InputGroupAddon>
          </InputGroup>

          <div className="mt-2 rounded-xl border bg-muted/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                {t("nlExamplesTitle")}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setQuery("")}
                disabled={!query.trim()}
              >
                {t("clear")}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {getNlExamples(locale).map((ex) => (
                <Button
                  key={ex}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full"
                  onClick={() => setQuery(ex)}
                >
                  {ex}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {topTopics.length > 0 ? (
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground">
              {t("categoriesTitle")}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-2"
              onClick={() => setTopicFilters([])}
              disabled={topicFilters.length === 0}
            >
              {t("clear")}
            </Button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {topTopics.map(({ topic, count }) => {
              const active = topicFilters.includes(topic)
              return (
                <Button
                  key={topic}
                  type="button"
                  variant={active ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "h-7 shrink-0 gap-2 rounded-full border px-3",
                    active
                      ? "border-primary/30"
                      : "border-border/60 bg-muted/20 hover:bg-muted/30"
                  )}
                  onClick={() =>
                    setTopicFilters((prev) =>
                      prev.includes(topic)
                        ? prev.filter((x) => x !== topic)
                        : [...prev, topic]
                    )
                  }
                >
                  <FiTag className="size-3.5" />
                  <span className="max-w-[200px] truncate">
                    {displayTopic(topic)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="text-sm font-semibold">{t("resultsTitle")}</div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <SlidersHorizontal className="size-4" />
                  {t("filters")}
                  {hasFilters ? (
                    <Badge variant="secondary" className="ml-1 px-2">
                      {topicFilters.length + kindFilters.length}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-3">
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {t("filterTopics")}
                    </div>
                    <div className="mt-2 grid max-h-44 gap-2 overflow-auto pr-1">
                      {allTopics.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          {t("none")}
                        </div>
                      ) : (
                        allTopics.map((topic) => (
                          <label
                            key={topic}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={topicFilters.includes(topic)}
                              onCheckedChange={(checked) => {
                                const next = checked ? true : false
                                setTopicFilters((prev) =>
                                  next
                                    ? prev.includes(topic)
                                      ? prev
                                      : [...prev, topic]
                                    : prev.filter((x) => x !== topic)
                                )
                              }}
                            />
                            <span className="min-w-0 truncate">
                              {displayTopic(topic)}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {t("filterKinds")}
                    </div>
                    <div className="mt-2 grid gap-2">
                      {allKinds.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          {t("none")}
                        </div>
                      ) : (
                        allKinds.map((kind) => (
                          <label
                            key={kind}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={kindFilters.includes(kind)}
                              onCheckedChange={(checked) => {
                                const next = checked ? true : false
                                setKindFilters((prev) =>
                                  next
                                    ? prev.includes(kind)
                                      ? prev
                                      : [...prev, kind]
                                    : prev.filter((x) => x !== kind)
                                )
                              }}
                            />
                            <span className="min-w-0 truncate">
                              {kindLabel(kind)}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {t("showing", {
                        shown: filteredHits.length,
                        total: searchQuery.data?.length ?? 0,
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      disabled={!hasFilters}
                      onClick={() => {
                        setTopicFilters([])
                        setKindFilters([])
                      }}
                    >
                      {t("clearFilters")}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="text-xs text-muted-foreground">
              {searchQuery.isFetching
                ? t("searching")
                : t("resultsCount", { count: filteredHits.length })}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[56vh]">
          <div className="p-2">
            {searchQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("loading")}
              </div>
            ) : searchQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                {t("searchFailed")}
              </div>
            ) : (filteredHits.length ?? 0) === 0 ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                {hasFilters ? t("emptyFilters") : t("empty")}
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredHits.map((hit) => (
                  <div
                    key={hit.id}
                    onClick={() => openLaw(hit.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        openLaw(hit.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group w-full cursor-pointer rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      selectedLawId === hit.id && lawDrawerOpen
                        ? "border-primary/40 bg-muted/20"
                        : null
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border bg-muted/20">
                        <FaGavel className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {hit.title}
                            </div>
                            {hit.shortTitle ? (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {hit.shortTitle}
                              </div>
                            ) : null}
                          </div>
                          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>

                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {hit.snippet}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {hit.year ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3.5" />
                              {hit.year}
                            </span>
                          ) : null}
                          {hit.kind ? (
                            <span className="inline-flex items-center gap-1">
                              <BookOpenText className="size-3.5" />
                              {kindLabel(hit.kind)}
                            </span>
                          ) : null}
                          {hit.status ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                              {statusLabel(hit.status)}
                            </span>
                          ) : null}
                          {hit.jurisdiction?.stateName ? (
                            <span className="inline-flex items-center gap-1">
                              <FiTag className="size-3.5" />
                              {hit.jurisdiction.stateName}
                            </span>
                          ) : null}
                        </div>

                        {hit.topics?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {hit.topics.slice(0, 6).map((topic) => {
                              const active = topicFilters.includes(topic)
                              return (
                                <Button
                                  key={topic}
                                  type="button"
                                  variant={active ? "default" : "secondary"}
                                  size="sm"
                                  className={cn(
                                    "h-6 gap-1.5 rounded-full border px-2 text-[11px]",
                                    active
                                      ? "border-primary/30"
                                      : "border-border/60 bg-muted/20 hover:bg-muted/30"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setTopicFilters((prev) =>
                                      prev.includes(topic)
                                        ? prev.filter((x) => x !== topic)
                                        : [...prev, topic]
                                    )
                                  }}
                                >
                                  <FiTag className="size-3.5" />
                                  <span className="max-w-[180px] truncate">
                                    {displayTopic(topic)}
                                  </span>
                                </Button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Credenza open={lawDrawerOpen} onOpenChange={setLawDrawerOpen}>
        <CredenzaContent className="mx-auto max-h-[80vh] w-full max-w-4xl overflow-hidden lg:max-w-4xl!">
          <CredenzaHeader className="border-b text-left">
            <CredenzaTitle className="flex flex-col gap-1">
              <span className="text-base">
                {law?.title ?? t("drawerTitle")}
              </span>
              {law?.shortTitle ? (
                <span className="text-xs text-muted-foreground">
                  {law.shortTitle}
                </span>
              ) : null}
            </CredenzaTitle>
            <CredenzaDescription className="flex flex-wrap items-center gap-2">
              {law?.year ? <Badge variant="outline">{law.year}</Badge> : null}
              {law?.kind ? (
                <Badge variant={kindBadgeVariant(law.kind)}>
                  {kindLabel(law.kind)}
                </Badge>
              ) : null}
              {law?.status ? (
                <Badge variant={statusBadgeVariant(law.status)}>
                  {statusLabel(law.status)}
                </Badge>
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={contentLocale}
                  onValueChange={(value) =>
                    setContentLocale(value as LawLocale)
                  }
                >
                  <SelectTrigger className="h-8 w-35">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAW_CONTENT_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CredenzaDescription>
          </CredenzaHeader>

          <ScrollArea className="h-[70vh] w-full overflow-x-hidden px-4">
            <CredenzaBody className="w-full max-w-full">
              <div ref={lawContentRef} className="space-y-4 py-4">
                {lawDetailQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("loadingLaw")}
                  </div>
                ) : lawDetailQuery.isError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    {t("detailFailed")}
                  </div>
                ) : law ? (
                  <>
                    <div className="rounded-xl border bg-muted/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                          {t("simpleTitle")}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              openAsk({
                                title: t("askAboutLaw"),
                                question: t("askAboutLawPrompt"),
                              })
                            }
                            disabled={askMutation.isPending}
                          >
                            <Sparkles className="size-4" />
                            {t("ask")}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-foreground/90">
                        {law.plainLanguage.summary}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">
                          {t("listenTitle")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("listenHint")}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Volume2 className="size-4" />
                          {t("listenNote")}
                        </div>
                        <div className="mt-2">
                          <TTSPlayer text={ttsText} language={ttsLanguage} />
                        </div>
                      </div>
                    </div>

                    <Section
                      title={t("whenApplies")}
                      items={law.plainLanguage.whenApplies}
                    />

                    <Section
                      title={t("keyPoints")}
                      items={law.plainLanguage.keyPoints}
                    />

                    <Section
                      title={t("whatToDo")}
                      items={law.plainLanguage.whatToDo}
                    />

                    <Section
                      title={t("requiredDocs")}
                      items={law.plainLanguage.requiredDocs}
                    />

                    <Separator />

                    <Section
                      title={t("redFlags")}
                      items={law.plainLanguage.redFlags}
                      tone="warn"
                    />

                    <Section
                      title={t("edgeCases")}
                      items={law.plainLanguage.edgeCases}
                    />

                    <Section
                      title={t("sideEffects")}
                      items={law.plainLanguage.sideEffects}
                    />

                    <div className="rounded-xl border bg-background p-4">
                      <div className="text-sm font-semibold">
                        {t("officialTitle")}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("officialHint")}
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        {law.sources.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {t("officialEmpty")}
                          </div>
                        ) : (
                          law.sources.map((s) => (
                            <Button
                              key={s.url}
                              asChild
                              variant="outline"
                              className="justify-start gap-2"
                            >
                              <a href={s.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" />
                                {s.label}
                              </a>
                            </Button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background p-4">
                      <div className="text-sm font-semibold">
                        {t("relatedTitle")}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {law.related.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            {t("relatedEmpty")}
                          </div>
                        ) : (
                          law.related.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => openLaw(r.id)}
                              className="w-full rounded-xl border bg-muted/10 p-3 text-left hover:bg-muted/20"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">
                                    {r.title}
                                  </div>
                                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {r.snippet}
                                  </div>
                                </div>
                                <div className="shrink-0 text-xs text-muted-foreground">
                                  {r.year ?? ""}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </CredenzaBody>
          </ScrollArea>

          {toolbar ? (
            <div
              className="fixed z-50 -translate-x-1/2"
              style={{
                top: Math.max(selectionRect.top - 52, 12),
                left: toolbarLeft,
              }}
            >
              <div className="flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-sm backdrop-blur">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-2 rounded-full"
                  onClick={() =>
                    openAsk({
                      title: t("askSelectionTitle"),
                      question: t("askSelectionPrompt"),
                      selectionText,
                    })
                  }
                  disabled={askMutation.isPending}
                >
                  <Sparkles className="size-4" />
                  {t("ask")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(selectionText)
                      .then(() => toast.success(t("copied")))
                      .catch(() => toast.error(t("copyFailed")))
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CredenzaContent>
      </Credenza>

      <Credenza open={askDrawerOpen} onOpenChange={setAskDrawerOpen}>
        <CredenzaContent className="mx-auto max-h-[86vh] w-full max-w-4xl">
          <CredenzaHeader className="border-b text-left">
            <CredenzaTitle>{askTitle}</CredenzaTitle>
            <CredenzaDescription>{t("askSubtitle")}</CredenzaDescription>
          </CredenzaHeader>

          <ScrollArea className="h-[62vh] px-4">
            <CredenzaBody>
              <div className="space-y-4 py-4">
                {selectionText ? (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {t("selectedText")}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {selectionText}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-xl border bg-background p-4">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                    {t("vakilResponse")}
                  </div>
                  <div className="mt-2">
                    {askMutation.isPending ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t("thinking")}
                      </div>
                    ) : askAnswer ? (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {askAnswer}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t("askEmpty")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                    {t("followUp")}
                  </div>
                  <Textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder={t("followUpPlaceholder")}
                    className="mt-2 min-h-24"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => startVoice("followUp")}
                      disabled={!speechSupported}
                      title={
                        speechSupported
                          ? speechListening && speechTarget === "followUp"
                            ? t("voiceStop")
                            : t("voiceStart")
                          : t("voiceNotSupported")
                      }
                    >
                      {speechListening && speechTarget === "followUp" ? (
                        <HiMiniStop className="size-4" />
                      ) : (
                        <HiMiniMicrophone className="size-4" />
                      )}
                      {t("voice")}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        openAsk({
                          title: t("customQuestionTitle"),
                          question: customQuestion.trim(),
                          selectionText: selectionText || undefined,
                        })
                      }
                      disabled={askMutation.isPending || !customQuestion.trim()}
                    >
                      <Sparkles className="size-4" />
                      {t("askQuestion")}
                    </Button>
                  </div>
                </div>
              </div>
            </CredenzaBody>
          </ScrollArea>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}

function getNlExamples(locale: string) {
  if (locale === "mr") {
    return [
      "मला 7/12 वर नाव चढवायचं आहे",
      "कोणी कागदांवर सही करायला सांगत आहे — काय तपासू?",
      "म्युटेशन/फेरफार झाला नाही तर काय करावे?",
      "जमीन विक्रीमध्ये फसवणूक कशी ओळखू?",
      "भाडेकरू/किरायेदाराचा वाद आहे",
      "एनए (NA) परवानगी कधी लागते?",
    ]
  }

  if (locale === "hi") {
    return [
      "7/12 में नाम नहीं है — क्या करना चाहिए?",
      "कोई कागज़ पर साइन करवा रहा है — क्या चेक करूं?",
      "म्यूटेशन/दाखिल-खारिज नहीं हुआ तो क्या करें?",
      "जमीन बिक्री में धोखाधड़ी कैसे पहचानें?",
      "किरायेदारी/बटाई का विवाद है",
      "NA अनुमति कब लगती है?",
    ]
  }

  return [
    "My name is missing in 7/12 — what should I do?",
    "Someone is forcing me to sign papers — what should I check?",
    "Mutation is pending — what is the next step?",
    "How to detect fraud in land sale?",
    "Tenancy dispute with cultivator/tenant",
    "When do I need NA permission?",
  ]
}

function statusBadgeVariant(
  status?: string
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = (status ?? "").toLowerCase().trim()
  if (
    [
      "repealed",
      "not-in-force",
      "not_in_force",
      "invalid",
      "inactive",
    ].includes(normalized)
  ) {
    return "destructive"
  }

  if (["in-force", "in_force", "inforce", "active"].includes(normalized)) {
    return "secondary"
  }

  if (["draft", "proposed", "pending"].includes(normalized)) {
    return "outline"
  }

  return "outline"
}

function kindBadgeVariant(
  kind?: string
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = (kind ?? "").toLowerCase().trim()
  if (["act", "acts"].includes(normalized)) return "default"
  if (["rule", "rules", "regulation", "regulations"].includes(normalized)) {
    return "secondary"
  }
  if (["scheme", "yojana"].includes(normalized)) return "outline"
  return "outline"
}

function Section({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone?: "warn"
}) {
  if (!items || items.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-4",
        tone === "warn" ? "border-destructive/25 bg-destructive/5" : null
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 grid gap-2">
        {items.map((x, idx) => (
          <div key={`${idx}-${x.slice(0, 20)}`} className="flex gap-2">
            <div className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
            <div className="text-sm leading-relaxed text-foreground/90">
              {x}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function resolveSpeechLanguage(locale: string) {
  if (locale === "mr") return "mr-IN"
  if (locale === "en") return "en-IN"
  return "hi-IN"
}

function formatTopicLabel(topic: string, locale: string) {
  const raw = (topic ?? "").trim()
  if (!raw) return raw
  if (locale !== "en") return raw

  const normalized = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  const preserveUpper = new Set(["apmc", "na", "rti", "mlrc", "ror"])

  return normalized
    .split(" ")
    .map((word) => {
      const w = word.trim()
      if (!w) return w
      if (/\d/.test(w) || w.includes("/") || w.toUpperCase() === w) return w
      if (preserveUpper.has(w.toLowerCase())) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(" ")
}
