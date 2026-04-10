"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  FileText,
  Languages,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { TTSPlayer } from "@/components/features/translator/tts-player"
import { toast } from "sonner"

const LANGUAGES = [
  { code: "hi-IN", name: "हिंदी (Hindi)" },
  { code: "mr-IN", name: "मराठी (Marathi)" },
  { code: "gu-IN", name: "ગુજરાતી (Gujarati)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)" },
]

const TOOLBAR_OFFSET_Y = 12

type FloatingSelection = {
  text: string
  x: number
  y: number
}

function mapLanguageToChatLocale(language: string) {
  if (language.startsWith("mr")) return "mr"
  if (language.startsWith("en")) return "en"
  return "hi"
}

export default function TranslatorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>("hi-IN")
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [selection, setSelection] = useState<FloatingSelection | null>(null)
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [askDrawerOpen, setAskDrawerOpen] = useState(false)
  const [askTitle, setAskTitle] = useState<string>("Ask Kisan Vakil")
  const [askAnswer, setAskAnswer] = useState<string>("")
  const [customQuestion, setCustomQuestion] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const translationContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    const clearFloatingSelection = () => {
      setSelection(null)
    }

    window.addEventListener("scroll", clearFloatingSelection, true)
    window.addEventListener("resize", clearFloatingSelection)

    return () => {
      window.removeEventListener("scroll", clearFloatingSelection, true)
      window.removeEventListener("resize", clearFloatingSelection)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setTranslatedText(null)
      setSelection(null)
      setAskAnswer("")
      setCustomQuestion("")

      if (selectedFile.type.startsWith("image/")) {
        setPreviewUrl((currentPreviewUrl) => {
          if (currentPreviewUrl) {
            URL.revokeObjectURL(currentPreviewUrl)
          }

          return URL.createObjectURL(selectedFile)
        })
      } else {
        setPreviewUrl((currentPreviewUrl) => {
          if (currentPreviewUrl) {
            URL.revokeObjectURL(currentPreviewUrl)
          }

          return null
        })
      }
    }
  }

  const handleTranslate = async () => {
    if (!file) {
      toast.error("Please select a document or image first.")
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

      if (!response.ok) {
        throw new Error("Translation failed")
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setTranslatedText(data.text)
      setSelection(null)
      setAskAnswer("")
      toast.success("Document translated successfully!")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to translate document.")
    } finally {
      setIsTranslating(false)
    }
  }

  const updateSelection = () => {
    const translationContainer = translationContainerRef.current
    const domSelection = window.getSelection()

    if (
      !translationContainer ||
      !domSelection ||
      domSelection.rangeCount === 0 ||
      domSelection.isCollapsed
    ) {
      setSelection(null)
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
      setSelection(null)
      return
    }

    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) {
      setSelection(null)
      return
    }

    const left = Math.min(
      Math.max(rect.left + rect.width / 2, 120),
      window.innerWidth - 120
    )
    const top = Math.max(rect.top - TOOLBAR_OFFSET_Y, 80)

    setSelection({
      text: selectedText.slice(0, 2000),
      x: left,
      y: top,
    })
  }

  const copySelection = async () => {
    if (!selection?.text) return

    try {
      await navigator.clipboard.writeText(selection.text)
      toast.success("Selected text copied.")
    } catch {
      toast.error("Could not copy text right now.")
    }
  }

  const askKisanVakil = async (title: string, instruction: string) => {
    if (!selection?.text) return

    try {
      setAskDrawerOpen(true)
      setAskTitle(title)
      setIsAskingAi(true)
      setAskAnswer("")

      const prompt = [
        instruction,
        "",
        "Selected text:",
        `\"\"\"${selection.text}\"\"\"`,
        "",
        "Give an actionable answer in short bullet points and plain language.",
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
              id: `translator-selection-${Date.now()}`,
              role: "user",
              parts: [{ type: "text", text: prompt }],
            },
          ],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.text) {
        throw new Error(
          data?.error || "Could not get a response from Kisan Vakil."
        )
      }

      setAskAnswer(data.text)
    } catch (error: any) {
      console.error(error)
      setAskAnswer(
        error.message || "Could not get a response from Kisan Vakil."
      )
      toast.error(error.message || "Ask Kisan Vakil failed.")
    } finally {
      setIsAskingAi(false)
    }
  }

  const askCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      toast.error("Type a question first.")
      return
    }

    await askKisanVakil("Custom question", customQuestion.trim())
  }

  return (
    <div className="relative min-h-svh overflow-x-clip bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_55%)]" />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <Link href="/dashboard">
                  <ChevronLeft className="size-5" />
                </Link>
              </Button>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Document Translator
                </h1>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Translate land papers into your language and ask Kisan Vakil
                  about specific lines.
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3 dark:text-slate-400">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                OCR + translation
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                Voice playback
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                AI legal explain
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Languages className="size-6" />
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Translate to
              </label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full cursor-pointer bg-transparent text-lg font-bold text-slate-900 outline-none dark:text-white"
              >
                {LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    className="text-base text-black"
                  >
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed shadow-none transition-colors ${
            file
              ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex min-h-55 flex-col items-center justify-center gap-4 p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />

            {previewUrl ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 w-full object-cover"
                />
              </div>
            ) : file ? (
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <FileText className="size-8" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Upload className="size-10" />
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {file ? file.name : "Tap to upload paper"}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {file
                  ? "Tap again to replace"
                  : "Images and PDF documents are supported"}
              </p>
            </div>
          </CardContent>
        </Card>

        {file && !translatedText && (
          <Button
            onClick={handleTranslate}
            disabled={isTranslating}
            size="lg"
            className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold tracking-wide text-white hover:bg-blue-700"
          >
            {isTranslating ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Reading and translating...
              </>
            ) : (
              "Translate Document"
            )}
          </Button>
        )}

        {translatedText && (
          <div className="flex animate-in flex-col gap-4 duration-500 fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                Result
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <TTSPlayer text={translatedText} language={language} />

            <Card className="rounded-3xl border-slate-200 shadow-sm dark:border-slate-800">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Select any text for quick actions
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(translatedText)
                        toast.success("Full translation copied.")
                      } catch {
                        toast.error("Could not copy translation.")
                      }
                    }}
                  >
                    <Copy className="size-4" />
                    Copy all
                  </Button>
                </div>

                <div
                  ref={translationContainerRef}
                  onMouseUp={() =>
                    window.requestAnimationFrame(updateSelection)
                  }
                  onKeyUp={() => window.requestAnimationFrame(updateSelection)}
                  onTouchEnd={() =>
                    window.requestAnimationFrame(updateSelection)
                  }
                  className="prose prose-slate prose-p:mb-4 prose-p:text-base prose-p:leading-relaxed last:prose-p:mb-0 dark:prose-invert max-w-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-slate-800 select-text dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 [&_*::selection]:bg-amber-200/80 [&_*::selection]:text-slate-900"
                >
                  {translatedText.split("\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setFile(null)
                setTranslatedText(null)
                setSelection(null)
                setAskAnswer("")
                setCustomQuestion("")
                setPreviewUrl((currentPreviewUrl) => {
                  if (currentPreviewUrl) {
                    URL.revokeObjectURL(currentPreviewUrl)
                  }
                  return null
                })
              }}
              className="h-14 w-full rounded-2xl border-2 font-bold"
            >
              Translate another document
            </Button>
          </div>
        )}
      </div>

      {selection && (
        <div
          className="fixed z-80 -translate-x-1/2 -translate-y-full"
          style={{ left: selection.x, top: selection.y }}
        >
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copySelection}
              title="Copy selected text"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                askKisanVakil(
                  "Explain this section",
                  "Explain the selected text in very simple language. Then give practical next steps."
                )
              }
            >
              <Sparkles className="size-4" />
              Explain
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                askKisanVakil(
                  "Red-flag check",
                  "Check this selected text for legal red flags, fraud risk, or terms that can harm the farmer."
                )
              }
            >
              <ShieldAlert className="size-4" />
              Red flags
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                askKisanVakil(
                  "Ask Kisan Vakil",
                  "Answer the user based on this selected text. Keep it direct and practical."
                )
              }
            >
              <MessageSquare className="size-4" />
              Ask
            </Button>
          </div>
        </div>
      )}

      <Drawer open={askDrawerOpen} onOpenChange={setAskDrawerOpen}>
        <DrawerContent className="mx-auto max-h-[86vh] w-full max-w-3xl">
          <DrawerHeader className="border-b border-slate-200 text-left dark:border-slate-800">
            <DrawerTitle>{askTitle}</DrawerTitle>
            <DrawerDescription>
              Ask Kisan Vakil about the selected part of your translated
              document.
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="h-[56vh] px-4">
            <div className="space-y-4 py-4">
              <Card className="rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
                <CardContent className="p-4">
                  <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Selected text
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {selection?.text || "No selected text available."}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                  <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Kisan Vakil response
                  </p>

                  {isAskingAi ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking...
                    </div>
                  ) : askAnswer ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                      {askAnswer}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Choose an action from the floating toolbar or ask a custom
                      question.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <CardContent className="space-y-3 p-4">
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Custom follow-up
                  </p>

                  <Textarea
                    value={customQuestion}
                    onChange={(event) => setCustomQuestion(event.target.value)}
                    placeholder="Example: What should I verify in the revenue office before signing this?"
                    className="min-h-20"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={askCustomQuestion}
                      disabled={
                        isAskingAi || !selection?.text || !customQuestion.trim()
                      }
                    >
                      <Sparkles className="size-4" />
                      Ask question
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() =>
                        askKisanVakil(
                          "Urgency check",
                          "Tell me if this selected text needs urgent action and what I should do in the next 24 hours."
                        )
                      }
                      disabled={isAskingAi || !selection?.text}
                    >
                      <AlertTriangle className="size-4" />
                      Urgency check
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
