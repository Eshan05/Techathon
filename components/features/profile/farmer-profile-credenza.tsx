"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { toUserMessage } from "@/lib/errors"
import {
  Leaf,
  FileText,
  Gavel,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SupportNeed =
  | "land-records"
  | "schemes"
  | "notices"
  | "complaints"
  | "cases"

type FarmerProfile = {
  userId: string
  fullName: string | null
  phone: string | null
  preferredLanguage: string
  supportNeed: SupportNeed
  trustedHelperName: string | null
  trustedHelperPhone: string | null
  state: string | null
  district: string | null
  tehsil: string | null
  village: string | null
}

type LandParcel = {
  id: string
  nickname: string | null
  state: string | null
  district: string | null
  tehsil: string | null
  village: string | null
  khataNo: string | null
  khasraNo: string | null
  mutationNo: string | null
  ownerName: string | null
  ownershipShare: string | null
}

type DocumentRecord = {
  id: string
  title: string
  kind: string
  createdAt: string
}

const SUPPORT_NEEDS = [
  "land-records",
  "schemes",
  "notices",
  "complaints",
  "cases",
] as const

function emptyProfile(): FarmerProfile {
  return {
    userId: "",
    fullName: null,
    phone: null,
    preferredLanguage: "hi",
    supportNeed: "land-records",
    trustedHelperName: null,
    trustedHelperPhone: null,
    state: null,
    district: null,
    tehsil: null,
    village: null,
  }
}

function emptyText(value: string | null | undefined) {
  return value?.trim() ? value : null
}

function makeInitials(name: string | null) {
  if (!name) return "KV"
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatKind(kind: string) {
  return kind
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

export function FarmerProfileCredenza({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("Profile")
  const tLocale = useTranslations("Locale")

  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [profile, setProfile] = React.useState<FarmerProfile>(() =>
    emptyProfile()
  )
  const [landParcels, setLandParcels] = React.useState<LandParcel[]>([])
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([])

  const supportNeedLabel = React.useMemo<Record<SupportNeed, string>>(
    () => ({
      "land-records": t("supportNeedLandRecords"),
      schemes: t("supportNeedSchemes"),
      notices: t("supportNeedNotices"),
      complaints: t("supportNeedComplaints"),
      cases: t("supportNeedCases"),
    }),
    [t]
  )

  const languageLabel = React.useMemo<Record<string, string>>(
    () => ({
      hi: tLocale("hindi"),
      en: tLocale("english"),
      mr: tLocale("marathi"),
    }),
    [tLocale]
  )

  const profileName = profile.fullName ?? t("notSet")
  const initials = makeInitials(profile.fullName)
  const latestParcel = landParcels[0]
  const latestDocument = documents[0]

  const loadData = React.useCallback(async () => {
    async function loadJson<T>(url: string) {
      const response = await fetch(url, { cache: "no-store" })
      const json = (await response.json().catch(() => null)) as {
        error?: string
        data?: T
      } | null

      if (!response.ok) {
        throw new Error(json?.error || t("loadFailed"))
      }

      return json as { data: T }
    }

    const [profileResult, parcelsResult, documentsResult] =
      await Promise.allSettled([
        loadJson<FarmerProfile>("/api/farmer-profiles"),
        loadJson<LandParcel[]>("/api/land-parcels"),
        loadJson<DocumentRecord[]>("/api/documents"),
      ])

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value.data ?? emptyProfile())
    } else {
      toast.error(
        profileResult.reason instanceof Error
          ? profileResult.reason.message
          : t("loadFailed")
      )
    }

    if (parcelsResult.status === "fulfilled") {
      setLandParcels(parcelsResult.value.data ?? [])
    } else {
      toast.error(
        parcelsResult.reason instanceof Error
          ? parcelsResult.reason.message
          : t("loadFailed")
      )
    }

    if (documentsResult.status === "fulfilled") {
      setDocuments(documentsResult.value.data ?? [])
    } else {
      toast.error(
        documentsResult.reason instanceof Error
          ? documentsResult.reason.message
          : t("loadFailed")
      )
    }
  }, [t])

  React.useEffect(() => {
    if (!open) return

    setLoading(true)
    void loadData().finally(() => setLoading(false))
  }, [open, loadData])

  async function save() {
    setSaving(true)
    try {
      const response = await fetch("/api/farmer-profiles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          preferredLanguage: profile.preferredLanguage,
          supportNeed: profile.supportNeed,
          trustedHelperName: profile.trustedHelperName,
          trustedHelperPhone: profile.trustedHelperPhone,
          state: profile.state,
          district: profile.district,
          tehsil: profile.tehsil,
          village: profile.village,
        }),
      })

      const json = (await response.json().catch(() => null)) as {
        error?: string
      } | null

      if (!response.ok) {
        throw new Error(json?.error || t("saveFailed"))
      }

      toast.success(t("saved"))
      setOpen(false)
    } catch (error) {
      const msg = toUserMessage(error, {
        fallbackTitle: t("saveFailed"),
        context: "profile.save",
      })
      toast.error(msg.title, { description: msg.description })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Credenza open={open} onOpenChange={setOpen}>
      <CredenzaTrigger asChild>{children}</CredenzaTrigger>

      <CredenzaContent className="max-w-5xl overflow-hidden p-0">
        <div className="max-h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="border-b bg-gradient-to-br from-primary/10 via-background to-amber-500/10">
            <CredenzaHeader className="gap-4 p-4 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar size="lg" className="ring-1 ring-border">
                    <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1">
                    <CredenzaTitle className="text-xl md:text-2xl">
                      {profileName}
                    </CredenzaTitle>
                    <CredenzaDescription className="max-w-2xl">
                      {t("description")}
                    </CredenzaDescription>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline">
                        {languageLabel[profile.preferredLanguage] ??
                          profile.preferredLanguage}
                      </Badge>
                      <Badge variant="outline">
                        {supportNeedLabel[profile.supportNeed] ?? t("notSet")}
                      </Badge>
                      <Badge variant="outline">
                        {profile.district ?? profile.state ?? t("notSet")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Card size="sm" className="min-w-[140px] bg-background/75">
                    <CardContent className="space-y-1 pt-3">
                      <div className="text-xs text-muted-foreground">
                        {t("documentsCount")}
                      </div>
                      <div className="text-2xl font-semibold">
                        {documents.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("recordsReady")}
                      </div>
                    </CardContent>
                  </Card>
                  <Card size="sm" className="min-w-[140px] bg-background/75">
                    <CardContent className="space-y-1 pt-3">
                      <div className="text-xs text-muted-foreground">
                        {t("landParcelsCount")}
                      </div>
                      <div className="text-2xl font-semibold">
                        {landParcels.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("farmDefaults")}
                      </div>
                    </CardContent>
                  </Card>
                  <Card size="sm" className="min-w-[140px] bg-background/75">
                    <CardContent className="space-y-1 pt-3">
                      <div className="text-xs text-muted-foreground">
                        {t("supportNeed")}
                      </div>
                      <div className="truncate text-base font-semibold">
                        {supportNeedLabel[profile.supportNeed]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("supportNeedHint")}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CredenzaHeader>
          </div>

          <CredenzaBody className="px-4 py-4 md:px-6">
            <Tabs
              defaultValue="basics"
              orientation="vertical"
              className="items-start gap-4 md:grid md:grid-cols-[220px_minmax(0,1fr)]"
            >
              <TabsList
                variant="line"
                className="flex h-auto w-full flex-row flex-wrap gap-2 rounded-2xl border bg-muted/40 p-2 md:flex-col md:items-stretch md:justify-start md:p-3"
              >
                <TabsTrigger
                  value="basics"
                  className="justify-start gap-2 px-3"
                >
                  <Users className="size-4" />
                  <span>{t("tabBasics")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="location"
                  className="justify-start gap-2 px-3"
                >
                  <MapPinned className="size-4" />
                  <span>{t("tabLocation")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="preferences"
                  className="justify-start gap-2 px-3"
                >
                  <ShieldCheck className="size-4" />
                  <span>{t("tabPreferences")}</span>
                </TabsTrigger>
              </TabsList>

              <div className="min-w-0 space-y-4">
                <TabsContent value="basics" className="m-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("basicDetailsTitle")}</CardTitle>
                      <CardDescription>{t("basicDetailsBody")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">{t("fullName")}</Label>
                        <Input
                          id="fullName"
                          placeholder="e.g. Ramesh Kumar"
                          value={profile.fullName ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              fullName: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">{t("phone")}</Label>
                        <Input
                          id="phone"
                          inputMode="tel"
                          placeholder="e.g. 98765 43210"
                          value={profile.phone ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              phone: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Separator />
                        <p className="pt-3 text-xs text-muted-foreground">
                          {t("phoneTip")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("overviewTitle")}</CardTitle>
                        <CardDescription>{t("overviewBody")}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="size-4 text-primary" />
                            {t("documentsCount")}
                          </div>
                          <div className="mt-2 text-2xl font-semibold">
                            {documents.length}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("documentsBody")}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Leaf className="size-4 text-primary" />
                            {t("landParcelsCount")}
                          </div>
                          <div className="mt-2 text-2xl font-semibold">
                            {landParcels.length}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("landParcelsBody")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t("latestParcelTitle")}</CardTitle>
                          <CardDescription>
                            {t("latestParcelBody")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {latestParcel ? (
                            <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    {latestParcel.nickname ??
                                      latestParcel.village ??
                                      t("notSet")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {[latestParcel.district, latestParcel.state]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {latestParcel.khataNo
                                    ? `${t("khataNo")} ${latestParcel.khataNo}`
                                    : t("notSet")}
                                </Badge>
                              </div>

                              <div className="grid gap-2 text-sm sm:grid-cols-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("khasraNo")}
                                  </div>
                                  <div className="font-medium">
                                    {latestParcel.khasraNo ?? t("notSet")}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("mutationNo")}
                                  </div>
                                  <div className="font-medium">
                                    {latestParcel.mutationNo ?? t("notSet")}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("ownerName")}
                                  </div>
                                  <div className="font-medium">
                                    {latestParcel.ownerName ?? t("notSet")}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    {t("ownershipShare")}
                                  </div>
                                  <div className="font-medium">
                                    {latestParcel.ownershipShare ?? t("notSet")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              {t("latestParcelEmpty")}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t("latestDocumentTitle")}</CardTitle>
                          <CardDescription>
                            {t("latestDocumentBody")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {latestDocument ? (
                            <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    {latestDocument.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatKind(latestDocument.kind)}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {t("documentsCount")}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                              {t("latestDocumentEmpty")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="m-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("locationTitle")}</CardTitle>
                      <CardDescription>{t("locationBody")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="state">{t("state")}</Label>
                        <Input
                          id="state"
                          placeholder="e.g. Maharashtra"
                          value={profile.state ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              state: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="district">{t("district")}</Label>
                        <Input
                          id="district"
                          placeholder="e.g. Pune"
                          value={profile.district ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              district: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tehsil">{t("tehsil")}</Label>
                        <Input
                          id="tehsil"
                          placeholder="e.g. Haveli"
                          value={profile.tehsil ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              tehsil: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="village">{t("village")}</Label>
                        <Input
                          id="village"
                          placeholder="e.g. Wadgaon"
                          value={profile.village ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              village: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("locationDefaultsTitle")}</CardTitle>
                      <CardDescription>
                        {t("locationDefaultsBody")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">
                          {t("state")}
                        </div>
                        <div className="mt-1 font-medium">
                          {profile.state ?? t("notSet")}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">
                          {t("district")}
                        </div>
                        <div className="mt-1 font-medium">
                          {profile.district ?? t("notSet")}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">
                          {t("tehsil")}
                        </div>
                        <div className="mt-1 font-medium">
                          {profile.tehsil ?? t("notSet")}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground">
                          {t("village")}
                        </div>
                        <div className="mt-1 font-medium">
                          {profile.village ?? t("notSet")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences" className="m-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("preferencesTitle")}</CardTitle>
                      <CardDescription>{t("preferencesBody")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>{t("preferredLanguage")}</Label>
                        <Select
                          value={profile.preferredLanguage}
                          onValueChange={(value) =>
                            setProfile((current) => ({
                              ...current,
                              preferredLanguage: value,
                            }))
                          }
                          disabled={loading || saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={tLocale("label")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hi">
                              {tLocale("hindi")}
                            </SelectItem>
                            <SelectItem value="en">
                              {tLocale("english")}
                            </SelectItem>
                            <SelectItem value="mr">
                              {tLocale("marathi")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>{t("supportNeed")}</Label>
                        <Select
                          value={profile.supportNeed}
                          onValueChange={(value) =>
                            setProfile((current) => ({
                              ...current,
                              supportNeed: value as SupportNeed,
                            }))
                          }
                          disabled={loading || saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("supportNeedHint")} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORT_NEEDS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {supportNeedLabel[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="trustedHelperName">
                          {t("trustedHelperName")}
                        </Label>
                        <Input
                          id="trustedHelperName"
                          placeholder={t("trustedHelperNamePlaceholder")}
                          value={profile.trustedHelperName ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              trustedHelperName: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="trustedHelperPhone">
                          {t("trustedHelperPhone")}
                        </Label>
                        <Input
                          id="trustedHelperPhone"
                          inputMode="tel"
                          placeholder={t("trustedHelperPhonePlaceholder")}
                          value={profile.trustedHelperPhone ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              trustedHelperPhone: emptyText(e.target.value),
                            }))
                          }
                          disabled={loading || saving}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Separator />
                        <div className="mt-3 rounded-xl border bg-muted/30 p-3">
                          <div className="flex items-start gap-2">
                            <Gavel className="mt-0.5 size-4 text-primary" />
                            <p className="text-sm text-muted-foreground">
                              {t("voiceTip")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </CredenzaBody>
        </div>

        <CredenzaFooter className="gap-2 border-t p-4 md:flex-row md:items-center md:px-6">
          <div className="mr-auto text-xs text-muted-foreground">
            {loading ? t("loading") : t("profileReady")}
          </div>
          <CredenzaClose asChild>
            <Button variant="outline" disabled={saving}>
              {t("cancel")}
            </Button>
          </CredenzaClose>
          <Button onClick={save} disabled={loading || saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
