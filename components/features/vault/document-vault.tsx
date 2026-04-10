"use client"

import * as React from "react"
import {
  FileUp,
  Files,
  FolderOpen,
  Link2,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/file-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import type { DocumentJobStatus } from "@/lib/qstash/types"
import {
  docKindToMasterCategory,
  MASTER_CATEGORIES,
  type MasterCategoryId,
} from "@/utils/document-master-categories"
import { uploadFiles } from "@/utils/uploadthing"

type DocumentRow = {
  id: string
  title: string
  kind: string
  uploadthingKey: string | null
  url: string | null
  mimeType: string | null
  sizeBytes: number | null
  sha256: string | null
  landParcelId: string | null
  issuedAt: string | null
  createdAt: string
  job?: DocumentJobStatus | null
}

type LandParcelRow = {
  id: string
  nickname: string | null
  state: string | null
  district: string | null
  tehsil: string | null
  village: string | null
  khataNo: string | null
  khasraNo: string | null
}

const DOC_KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "sale-deed", label: "Sale deed / Gift deed / Partition deed" },
  { value: "land-record", label: "Land record (RTC / 7-12 / Jamabandi / RoR)" },
  { value: "mutation", label: "Mutation / Dakhil-Kharij" },
  { value: "encumbrance", label: "Encumbrance certificate (EC)" },
  { value: "court-notice", label: "Court notice / summons" },
  { value: "legal-notice", label: "Legal notice" },
  { value: "agreement", label: "Agreement / contract" },
  { value: "id-proof", label: "ID proof" },
  { value: "receipt", label: "Receipt / bill" },
  { value: "other", label: "Other" },
]

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isRetryableUploadError(e: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false
  }

  const msg = e instanceof Error ? e.message : String(e ?? "")
  return /fetch|network|timeout|econn|socket|503|502|504/i.test(msg)
}

async function fetchDocuments(): Promise<DocumentRow[]> {
  const r = await fetch("/api/documents", { credentials: "same-origin" })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(json?.error ?? "Failed to load documents")
  return (json?.data ?? []) as DocumentRow[]
}

async function fetchLandParcels(): Promise<LandParcelRow[]> {
  const r = await fetch("/api/land-parcels", { credentials: "same-origin" })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(json?.error ?? "Failed to load land parcels")
  return (json?.data ?? []) as LandParcelRow[]
}

async function patchDocument(
  id: string,
  patch: Partial<{
    title: string
    kind: string
    issuedAt: number | null
    landParcelId: string | null
  }>
): Promise<DocumentRow> {
  const r = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(json?.error ?? "Failed to update document")
  return json.data as DocumentRow
}

async function deleteDocument(id: string): Promise<void> {
  const r = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(json?.error ?? "Failed to delete document")
}

async function scheduleDocumentProcessing(
  id: string
): Promise<DocumentJobStatus> {
  const r = await fetch(`/api/documents/${id}/process`, {
    method: "POST",
    credentials: "same-origin",
  })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(json?.error ?? "Failed to start verification")

  const job = (json?.data?.job ?? null) as DocumentJobStatus | null
  if (!job) throw new Error("No job returned")
  return job
}

function parcelLabel(p: LandParcelRow) {
  const bits = [p.nickname, p.village, p.tehsil, p.district, p.state]
    .map((x) => x?.trim())
    .filter(Boolean)
  return bits.length ? bits.join(" · ") : p.id
}

export function DocumentVault() {
  const qc = useQueryClient()

  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<MasterCategoryId | "all">(
    "all"
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [uploadFile, setUploadFile] = React.useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = React.useState("")
  const [uploadKind, setUploadKind] = React.useState<string>("land-record")
  const [uploadIssuedAt, setUploadIssuedAt] = React.useState<string>("")
  const [uploadLandParcelId, setUploadLandParcelId] =
    React.useState<string>("unlinked")
  const [isUploading, setIsUploading] = React.useState(false)

  const [schedulingId, setSchedulingId] = React.useState<string | null>(null)

  const {
    data: docs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  })

  const { data: parcels } = useQuery({
    queryKey: ["land-parcels"],
    queryFn: fetchLandParcels,
  })

  const categoryCounts = React.useMemo(() => {
    const list = docs ?? []
    const counts: Record<string, number> = { all: list.length }

    for (const c of MASTER_CATEGORIES) counts[c.id] = 0

    for (const d of list) {
      const c = docKindToMasterCategory(d.kind)
      if (!c) continue
      counts[c] = (counts[c] ?? 0) + 1
    }

    return counts
  }, [docs])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = docs ?? []

    if (category !== "all") {
      list = list.filter((d) => docKindToMasterCategory(d.kind) === category)
    }

    if (!q) return list
    return list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q)
    )
  }, [docs, category, query])

  const selected = React.useMemo(() => {
    if (!selectedId) return null
    return (docs ?? []).find((d) => d.id === selectedId) ?? null
  }, [docs, selectedId])

  React.useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  React.useEffect(() => {
    if (error) {
      console.error(error)
      toast.error("Failed to load your vault")
    }
  }, [error])

  const handleDrop = React.useCallback((accepted: File[]) => {
    const next = accepted?.[0] ?? null
    setUploadFile(next)
    setUploadTitle(next ? next.name.replace(/\.[a-zA-Z0-9]+$/, "") : "")
  }, [])

  const submitUpload = React.useCallback(async () => {
    if (!uploadFile) return toast.error("Choose a file first")

    const title = uploadTitle.trim()
    if (!title) return toast.error("Add a title")

    const kind = uploadKind.trim()
    if (!kind) return toast.error("Choose a document type")

    const issuedAtMs = uploadIssuedAt
      ? new Date(uploadIssuedAt).getTime()
      : null

    const toastId = toast.loading("Uploading…")

    try {
      setIsUploading(true)

      const maxAttempts = 3
      let res: unknown = null

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          res = await uploadFiles("vaultDocument", {
            files: [uploadFile],
            input: {
              title,
              kind,
              issuedAt: issuedAtMs,
              landParcelId:
                uploadLandParcelId === "unlinked" ? null : uploadLandParcelId,
            },
          })
          break
        } catch (e) {
          if (attempt >= maxAttempts || !isRetryableUploadError(e)) {
            throw e
          }

          toast.message(
            `Network hiccup — retrying (${attempt + 1}/${maxAttempts})…`,
            {
              id: toastId,
            }
          )
          await sleep(600 * attempt)
        }
      }

      const created = (res as any)?.[0]?.serverData?.document as
        | DocumentRow
        | undefined

      toast.success("Saved to vault", { id: toastId })
      setUploadOpen(false)
      setUploadFile(null)
      setUploadIssuedAt("")
      setUploadLandParcelId("unlinked")

      if (created?.id) {
        qc.setQueryData<DocumentRow[]>(["documents"], (prev) => {
          const list = Array.isArray(prev) ? prev : []
          return [created, ...list]
        })
        setSelectedId(created.id)
      } else {
        await qc.invalidateQueries({ queryKey: ["documents"] })
      }
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Upload failed", {
        id: toastId,
      })
    } finally {
      setIsUploading(false)
    }
  }, [
    qc,
    uploadFile,
    uploadIssuedAt,
    uploadKind,
    uploadLandParcelId,
    uploadTitle,
  ])

  const startVerification = React.useCallback(
    async (documentId: string) => {
      const toastId = toast.loading("Starting verification…")
      setSchedulingId(documentId)

      qc.setQueryData<DocumentRow[]>(["documents"], (prev) => {
        const list = Array.isArray(prev) ? prev : []
        return list.map((d) =>
          d.id === documentId
            ? {
                ...d,
                job: {
                  state: "queued",
                  updatedAt: Date.now(),
                },
              }
            : d
        )
      })

      try {
        const job = await scheduleDocumentProcessing(documentId)
        qc.setQueryData<DocumentRow[]>(["documents"], (prev) => {
          const list = Array.isArray(prev) ? prev : []
          return list.map((d) => (d.id === documentId ? { ...d, job } : d))
        })
        toast.success("Queued for verification", { id: toastId })
      } catch (e) {
        console.error(e)
        toast.error(e instanceof Error ? e.message : "Could not queue job", {
          id: toastId,
        })
        await qc.invalidateQueries({ queryKey: ["documents"] })
      } finally {
        setSchedulingId(null)
      }
    },
    [qc]
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl border bg-gradient-to-br from-amber-100 to-transparent text-amber-950 dark:from-amber-950/50 dark:text-amber-100">
              <Files className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                Document vault
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Keep every paper searchable and linked to land.
              </p>
            </div>
          </div>
        </div>

        <Drawer open={uploadOpen} onOpenChange={setUploadOpen}>
          <DrawerTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto">
              <FileUp className="size-4" />
              Add document
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
              <DrawerHeader className="p-0">
                <DrawerTitle>Add to vault</DrawerTitle>
                <DrawerDescription>
                  Upload and label a document so you can find it later.
                </DrawerDescription>
              </DrawerHeader>

              <div className="mt-4 grid gap-4">
                <Dropzone
                  src={uploadFile ? [uploadFile] : undefined}
                  accept={{
                    "application/pdf": [".pdf"],
                    "image/*": [".png", ".jpg", ".jpeg", ".webp"],
                    "text/plain": [".txt"],
                  }}
                  maxFiles={1}
                  onDrop={(accepted) => handleDrop(accepted)}
                >
                  <DropzoneEmptyState>
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-sm font-medium">
                        Drop a PDF/photo here
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Or tap to choose from your phone.
                      </div>
                    </div>
                  </DropzoneEmptyState>
                  <DropzoneContent>
                    {uploadFile ? (
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-lg border bg-muted">
                          <FolderOpen className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {uploadFile.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(uploadFile.size)}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DropzoneContent>
                </Dropzone>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Title
                    </div>
                    <Input
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g., 7/12 Extract (2024)"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Type
                    </div>
                    <Select value={uploadKind} onValueChange={setUploadKind}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_KIND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Issued date (optional)
                    </div>
                    <Input
                      type="date"
                      value={uploadIssuedAt}
                      onChange={(e) => setUploadIssuedAt(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Link to land parcel (optional)
                    </div>
                    <Select
                      value={uploadLandParcelId}
                      onValueChange={setUploadLandParcelId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unlinked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlinked">Unlinked</SelectItem>
                        {(parcels ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {parcelLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={submitUpload}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>Save to vault</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <section className="rounded-xl border bg-background lg:col-span-4">
          <div className="border-b p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium">Your documents</div>
              <Badge variant="secondary" className="w-fit">
                {(docs ?? []).length}
              </Badge>
            </div>
            <div className="mt-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or type…"
              />
            </div>

            {/* Master categories: mobile chips, desktop ranked list */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs",
                    category === "all" ? "bg-muted" : "bg-background"
                  )}
                >
                  All
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                    {categoryCounts.all ?? 0}
                  </span>
                </button>
                {MASTER_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs",
                      category === c.id ? "bg-muted" : "bg-background"
                    )}
                    title={c.description}
                  >
                    {c.label}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                      {categoryCounts[c.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="hidden gap-1 sm:grid">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left",
                    category === "all" ? "bg-muted" : "bg-background"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">All</span>
                    <span className="text-muted-foreground">
                      {categoryCounts.all ?? 0}
                    </span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-muted">
                    <div className="h-1 w-full rounded-full bg-foreground/25" />
                  </div>
                </button>

                {MASTER_CATEGORIES.map((c) => {
                  const total = categoryCounts.all ?? 0
                  const count = categoryCounts[c.id] ?? 0
                  const pct =
                    total > 0
                      ? Math.max(2, Math.round((count / total) * 100))
                      : 0

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left",
                        category === c.id ? "bg-muted" : "bg-background"
                      )}
                      title={c.description}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-muted">
                        <div
                          className="h-1 rounded-full bg-foreground/25"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[52vh] sm:h-[60vh]">
            <div className="p-1">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : filtered.length ? (
                filtered.map((d) => {
                  const active = d.id === selectedId
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(d.id)
                        setDetailsOpen(true)
                      }}
                      className={cn(
                        "w-full rounded-lg p-3 text-left transition",
                        active
                          ? "bg-muted"
                          : "hover:bg-muted/60 focus-visible:bg-muted/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {d.title}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-md border px-1.5 py-0.5">
                              {d.kind}
                            </span>
                            <span>{formatBytes(d.sizeBytes)}</span>

                            {d.sha256 ? (
                              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                                Verified
                              </span>
                            ) : d.job?.state === "queued" ? (
                              <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                                Queued
                              </span>
                            ) : d.job?.state === "processing" ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200">
                                <Loader2 className="size-3 animate-spin" />
                                Verifying
                              </span>
                            ) : d.job?.state === "failed" ? (
                              <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                                Needs retry
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  No documents yet. Add your first paper.
                </div>
              )}
            </div>
          </ScrollArea>
        </section>

        <section className="rounded-xl border bg-background lg:col-span-8">
          <div className="border-b p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {selected ? selected.title : "Select a document"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {selected ? (
                    <>
                      <span className="rounded-md border px-1.5 py-0.5">
                        {selected.kind}
                      </span>
                      <span>{formatBytes(selected.sizeBytes)}</span>
                      {selected.issuedAt ? (
                        <span>
                          Issued:{" "}
                          {new Date(selected.issuedAt).toLocaleDateString()}
                        </span>
                      ) : null}

                      {selected.sha256 ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                          Verified
                        </span>
                      ) : selected.job?.state === "queued" ? (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                          Queued
                        </span>
                      ) : selected.job?.state === "processing" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200">
                          <Loader2 className="size-3 animate-spin" />
                          Verifying
                        </span>
                      ) : selected.job?.state === "failed" ? (
                        <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                          Needs retry
                        </span>
                      ) : null}
                    </>
                  ) : (
                    ""
                  )}
                </div>
              </div>

              {selected ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {selected.url ? (
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full gap-2 sm:w-auto"
                    >
                      <a href={selected.url} target="_blank" rel="noreferrer">
                        <Link2 className="size-4" />
                        Open
                      </a>
                    </Button>
                  ) : null}

                  <EditDocumentDialog
                    doc={selected}
                    parcels={parcels ?? []}
                    onSaved={(next) => {
                      qc.setQueryData<DocumentRow[]>(["documents"], (prev) => {
                        const list = Array.isArray(prev) ? prev : []
                        return list.map((x) => (x.id === next.id ? next : x))
                      })
                    }}
                  />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full gap-2 sm:w-auto"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete this document?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the vault index entry. (If you want to
                          also delete the uploaded file from storage, we can add
                          that next.)
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await deleteDocument(selected.id)
                              toast.success("Deleted")
                              qc.setQueryData<DocumentRow[]>(
                                ["documents"],
                                (p) =>
                                  (Array.isArray(p) ? p : []).filter(
                                    (x) => x.id !== selected.id
                                  )
                              )
                              setSelectedId(null)
                            } catch (e) {
                              console.error(e)
                              toast.error(
                                e instanceof Error ? e.message : "Delete failed"
                              )
                            }
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {selected ? (
              <div className="space-y-3">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Linked parcel</span>
                    <span className="truncate">
                      {selected.landParcelId
                        ? parcelLabel(
                            (parcels ?? []).find(
                              (p) => p.id === selected.landParcelId
                            ) ?? ({ id: selected.landParcelId } as any)
                          )
                        : "Unlinked"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Verification</span>
                    <span className="flex items-center gap-2">
                      {selected.sha256 ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                          Verified
                        </span>
                      ) : selected.job?.state === "queued" ? (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                          Queued
                        </span>
                      ) : selected.job?.state === "processing" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200">
                          <Loader2 className="size-3 animate-spin" />
                          Verifying
                        </span>
                      ) : selected.job?.state === "failed" ? (
                        <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                          Needs retry
                        </span>
                      ) : (
                        <span className="rounded-md border px-1.5 py-0.5 text-xs">
                          Not started
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>
                      {selected.createdAt
                        ? new Date(selected.createdAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>

                {selected.sha256 ? (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      Fingerprint (sha256)
                    </div>
                    <div className="mt-1 font-mono text-xs break-all">
                      {selected.sha256}
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={
                      schedulingId === selected.id ||
                      selected.job?.state === "processing"
                    }
                    onClick={() => startVerification(selected.id)}
                  >
                    {selected.job?.state === "failed"
                      ? "Retry verification"
                      : "Verify now"}
                  </Button>
                )}

                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Trust tip</div>
                  <div className="mt-1 text-sm">
                    If someone asks you to sign, open this document and use the
                    analyzer to highlight risky clauses before you agree.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Pick a document from the left.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile: on tap we open a small drawer to open the file quickly. */}
      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
            <DrawerHeader className="p-0">
              <DrawerTitle>{selected?.title ?? "Document"}</DrawerTitle>
              <DrawerDescription>
                {selected
                  ? `${selected.kind} · ${formatBytes(selected.sizeBytes)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
            <div className="mt-4">
              {selected?.url ? (
                <Button asChild className="w-full gap-2">
                  <a href={selected.url} target="_blank" rel="noreferrer">
                    <Link2 className="size-4" />
                    Open document
                  </a>
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No URL found.
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function EditDocumentDialog({
  doc,
  parcels,
  onSaved,
}: {
  doc: DocumentRow
  parcels: LandParcelRow[]
  onSaved: (next: DocumentRow) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState(doc.title)
  const [kind, setKind] = React.useState(doc.kind)
  const [issuedAt, setIssuedAt] = React.useState(
    doc.issuedAt ? doc.issuedAt.slice(0, 10) : ""
  )
  const [landParcelId, setLandParcelId] = React.useState<string>(
    doc.landParcelId ?? "unlinked"
  )
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setTitle(doc.title)
    setKind(doc.kind)
    setIssuedAt(doc.issuedAt ? doc.issuedAt.slice(0, 10) : "")
    setLandParcelId(doc.landParcelId ?? "unlinked")
  }, [open, doc])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[94vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Rename and link this paper so it’s easy to find.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Title
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Type
            </div>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DOC_KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Issued date (optional)
            </div>
            <Input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Link to land parcel
            </div>
            <Select value={landParcelId} onValueChange={setLandParcelId}>
              <SelectTrigger>
                <SelectValue placeholder="Unlinked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlinked">Unlinked</SelectItem>
                {parcels.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {parcelLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const nextTitle = title.trim()
              if (!nextTitle) return toast.error("Title is required")

              setSaving(true)
              try {
                const next = await patchDocument(doc.id, {
                  title: nextTitle,
                  kind: kind.trim(),
                  landParcelId:
                    landParcelId === "unlinked" ? null : landParcelId,
                  issuedAt: issuedAt ? new Date(issuedAt).getTime() : null,
                })
                toast.success("Saved")
                onSaved(next)
                setOpen(false)
              } catch (e) {
                console.error(e)
                toast.error(e instanceof Error ? e.message : "Save failed")
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
