import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { desc, eq } from "drizzle-orm"
import { getTranslations } from "next-intl/server"
import { ChevronRight, FileText, MapPinned, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/navigation"
import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import {
  documents,
  farmerProfiles,
  landParcels,
  onboarding,
} from "@/lib/db/kisan.schema"

function formatList(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ")
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return ""

  const date = typeof value === "string" ? new Date(value) : value

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const tDashboard = await getTranslations("Dashboard")
  const tProfile = await getTranslations("Profile")
  const tSidebar = await getTranslations("Sidebar")
  const tLaws = await getTranslations("Laws")
  const tLocale = await getTranslations("Locale")

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/sign-in")
  }

  const userId = session.user.id
  const localeForDates =
    locale === "hi" ? "hi-IN" : locale === "mr" ? "mr-IN" : "en-IN"

  const [profile, parcels, recentDocs, onboardingStatus] = await Promise.all([
    db.query.farmerProfiles.findFirst({
      where: eq(farmerProfiles.userId, userId),
    }),
    db.query.landParcels.findMany({
      where: eq(landParcels.userId, userId),
      orderBy: [desc(landParcels.updatedAt)],
    }),
    db.query.documents.findMany({
      where: eq(documents.userId, userId),
      orderBy: [desc(documents.createdAt)],
      limit: 5,
    }),
    db.query.onboarding.findFirst({
      where: eq(onboarding.userId, userId),
    }),
  ])

  const supportNeedLabel = profile?.supportNeed
    ? {
        "land-records": tProfile("supportNeedLandRecords"),
        schemes: tProfile("supportNeedSchemes"),
        notices: tProfile("supportNeedNotices"),
        complaints: tProfile("supportNeedComplaints"),
        cases: tProfile("supportNeedCases"),
      }[profile.supportNeed]
    : null

  const languageLabel = profile?.preferredLanguage
    ? ({
        hi: tLocale("hindi"),
        mr: tLocale("marathi"),
        en: tLocale("english"),
      }[profile.preferredLanguage] ?? profile.preferredLanguage.toUpperCase())
    : tProfile("notSet")

  const locationLabel = formatList([
    profile?.village,
    profile?.tehsil,
    profile?.district,
    profile?.state,
  ])

  const helperLabel = formatList([
    profile?.trustedHelperName,
    profile?.trustedHelperPhone,
  ])

  const onboardingSteps = [
    {
      label: "Identity",
      value: onboardingStatus?.identityStatus ?? "pending",
    },
    {
      label: "Land record",
      value: onboardingStatus?.landStatus ?? "pending",
    },
    {
      label: "Face scan",
      value: onboardingStatus?.faceStatus ?? "pending",
    },
  ]

  const verifiedCount = onboardingSteps.filter(
    (step) => step.value === "verified"
  ).length
  const completion = Math.round((verifiedCount / onboardingSteps.length) * 100)

  const quickActions = [
    { href: "/dashboard/laws", label: tLaws("title") },
    { href: "/dashboard/vault", label: tDashboard("vaultTitle") },
    { href: "/dashboard/translator", label: tSidebar("documentAnalyzer") },
    {
      href: "/dashboard/document-guidelines",
      label: tSidebar("documentGuidelines"),
    },
  ]

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                {tDashboard("welcomeTitle")}
              </CardTitle>
              <CardDescription>{tDashboard("subtitle")}</CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-medium">
              {session.user.email}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{languageLabel}</Badge>
            <Badge variant="secondary">
              {supportNeedLabel ?? tProfile("notSet")}
            </Badge>
            <Badge variant="secondary">
              {locationLabel || tProfile("notSet")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div>
              <span className="text-foreground">
                {tDashboard("signedInAs")}:
              </span>{" "}
              <span>{session.user.name || session.user.email}</span>
            </div>
            <div>{tDashboard("openProfileHint")}</div>
            {helperLabel ? (
              <div>
                <span className="text-foreground">
                  {tProfile("trustedHelperName")}:
                </span>{" "}
                <span>{helperLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="default" className="justify-between">
              <Link href="/dashboard/laws">
                {tLaws("title")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/vault">
                {tDashboard("vaultTitle")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tProfile("landParcelsCount")}</CardDescription>
            <CardTitle className="text-2xl">{parcels.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4" />
              <span>{tProfile("farmDefaults")}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tProfile("documentsCount")}</CardDescription>
            <CardTitle className="text-2xl">{recentDocs.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{tProfile("documentsBody")}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tProfile("overviewTitle")}</CardDescription>
            <CardTitle className="text-2xl">{completion}%</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={completion} />
            <p className="text-sm text-muted-foreground">
              {tProfile("overviewBody")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tProfile("latestParcelTitle")}</CardTitle>
            <CardDescription>{tProfile("latestParcelBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {parcels[0] ? (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("khataNo")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].khataNo || tProfile("notSet")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("khasraNo")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].khasraNo || tProfile("notSet")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("mutationNo")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].mutationNo || tProfile("notSet")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("ownerName")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].ownerName || tProfile("notSet")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("ownershipShare")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].ownershipShare || tProfile("notSet")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {tProfile("village")}
                    </div>
                    <div className="font-medium">
                      {parcels[0].village || tProfile("notSet")}
                    </div>
                  </div>
                </div>

                <Separator />

                {parcels.length > 1 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {tProfile("latestParcelTitle")}
                    </p>
                    <div className="grid gap-2">
                      {parcels.slice(1, 4).map((parcel) => (
                        <div
                          key={parcel.id}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {parcel.nickname ||
                                parcel.village ||
                                parcel.khataNo ||
                                parcel.id}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {[
                                parcel.khataNo,
                                parcel.khasraNo,
                                parcel.mutationNo,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {parcel.ownershipShare || tProfile("notSet")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {tProfile("latestParcelEmpty")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tProfile("latestDocumentTitle")}</CardTitle>
            <CardDescription>{tProfile("latestDocumentBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocs.length > 0 ? (
              recentDocs.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium">
                      {document.title}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{document.kind}</span>
                      <span>
                        {formatDate(document.createdAt, localeForDates)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {document.landParcelId
                      ? tProfile("landParcelsCount")
                      : tDashboard("vaultTitle")}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {tProfile("latestDocumentEmpty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tProfile("overviewTitle")}</CardTitle>
            <CardDescription>{tProfile("preferencesBody")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {tProfile("preferredLanguage")}
                </div>
                <div className="font-medium">{languageLabel}</div>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {tProfile("supportNeed")}
                </div>
                <div className="font-medium">
                  {supportNeedLabel ?? tProfile("notSet")}
                </div>
              </div>
              <div className="rounded-lg border px-3 py-2 sm:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {tProfile("locationTitle")}
                </div>
                <div className="font-medium">
                  {locationLabel || tProfile("latestParcelEmpty")}
                </div>
              </div>
            </div>
            <div className="text-muted-foreground">
              {tDashboard("openProfileHint")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tLaws("listenTitle")}</CardTitle>
            <CardDescription>{tLaws("listenHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{tDashboard("subtitle")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  asChild
                  variant="outline"
                  className="justify-between"
                >
                  <Link href={action.href}>
                    <span className="truncate">{action.label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              {tLaws("listenNote")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
