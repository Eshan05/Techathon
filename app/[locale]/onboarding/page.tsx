"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Camera,
  Check,
  ChevronRight,
  ExternalLink,
  FileCheck,
  Fingerprint,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/file-dropzone"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toUserMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3 | 4
type SupportNeed =
  | "land-records"
  | "schemes"
  | "notices"
  | "complaints"
  | "cases"

type ProfileBasics = {
  fullName: string
  phone: string
  preferredLanguage: string
  supportNeed: SupportNeed
  pincode: string
  state: string
  district: string
  tehsil: string
  village: string
  trustedHelperName: string
  trustedHelperPhone: string
}

type IdentityUploads = {
  primaryId: File[]
  proofOfAddress: File[]
}

type LandUploads = {
  recordExtract: File[]
  ownershipProof: File[]
  mutationCopy: File[]
  taxReceipt: File[]
}

type PincodeOffice = {
  name: string
  district: string
  state: string
  block: string
  pincode: string
}

type PincodeLookupState = {
  status: "idle" | "loading" | "success" | "error"
  offices: PincodeOffice[]
  error: string | null
}

const IDENTITY_OPTIONS = [
  { id: "aadhaar", label: "Aadhaar", description: "12-digit UID" },
  { id: "pan", label: "PAN", description: "Tax identity card" },
  {
    id: "driving_license",
    label: "Driving License",
    description: "Government transport ID",
  },
  { id: "voter_id", label: "Voter ID", description: "Election ID card" },
] as const

const LANGUAGE_OPTIONS = [
  { value: "hi", label: "Hindi" },
  { value: "en", label: "English" },
  { value: "mr", label: "Marathi" },
  { value: "pa", label: "Punjabi" },
  { value: "gu", label: "Gujarati" },
  { value: "bn", label: "Bengali" },
] as const

const SUPPORT_NEED_OPTIONS: { value: SupportNeed; label: string }[] = [
  { value: "land-records", label: "Land records" },
  { value: "schemes", label: "Government schemes" },
  { value: "notices", label: "Legal notices" },
  { value: "complaints", label: "Complaints / grievances" },
  { value: "cases", label: "Court cases" },
]

function readableSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function OnboardingPage() {
  const [step, setStep] = React.useState<Step>(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)
  const [profile, setProfile] = React.useState<ProfileBasics>({
    fullName: "",
    phone: "",
    preferredLanguage: "hi",
    supportNeed: "land-records",
    pincode: "",
    state: "",
    district: "",
    tehsil: "",
    village: "",
    trustedHelperName: "",
    trustedHelperPhone: "",
  })
  const [identityFiles, setIdentityFiles] = React.useState<IdentityUploads>({
    primaryId: [],
    proofOfAddress: [],
  })
  const [landFiles, setLandFiles] = React.useState<LandUploads>({
    recordExtract: [],
    ownershipProof: [],
    mutationCopy: [],
    taxReceipt: [],
  })
  const [isLandVerified, setIsLandVerified] = React.useState(false)
  const [isFaceScanned, setIsFaceScanned] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [selectedOfficeIndex, setSelectedOfficeIndex] = React.useState("")
  const [pincodeLookup, setPincodeLookup] = React.useState<PincodeLookupState>({
    status: "idle",
    offices: [],
    error: null,
  })

  const applyOfficeToProfile = React.useCallback((office: PincodeOffice) => {
    setProfile((prev) => ({
      ...prev,
      state: office.state || "",
      district: office.district || "",
      tehsil: office.block || "",
      village: office.name || "",
    }))
  }, [])

  const handleOfficeSelection = React.useCallback(
    (value: string) => {
      setSelectedOfficeIndex(value)

      const office = pincodeLookup.offices[Number(value)]
      if (!office) {
        return
      }

      applyOfficeToProfile(office)
    },
    [applyOfficeToProfile, pincodeLookup.offices]
  )

  const steps = [
    { id: 1, title: "Identity", icon: User },
    { id: 2, title: "Land", icon: MapPin },
    { id: 3, title: "Face", icon: Fingerprint },
    { id: 4, title: "Summary", icon: FileCheck },
  ] as const

  const nextStep = () => {
    if (step < 4) {
      setStep((prev) => (prev + 1) as Step)
    }
  }

  const persistProfileAndContinue = React.useCallback(async () => {
    if (isSavingProfile) return

    const nullIfEmpty = (value: string) => {
      const trimmed = value.trim()
      return trimmed ? trimmed : null
    }

    try {
      setIsSavingProfile(true)

      const response = await fetch("/api/farmer-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          phone: profile.phone.trim(),
          preferredLanguage: profile.preferredLanguage,
          supportNeed: profile.supportNeed,
          trustedHelperName: nullIfEmpty(profile.trustedHelperName),
          trustedHelperPhone: nullIfEmpty(profile.trustedHelperPhone),
          state: nullIfEmpty(profile.state),
          district: nullIfEmpty(profile.district),
          tehsil: nullIfEmpty(profile.tehsil),
          village: nullIfEmpty(profile.village),
        }),
      })

      const json = (await response.json().catch(() => null)) as {
        error?: string
      } | null

      if (!response.ok) {
        throw new Error(json?.error || "Could not save profile")
      }

      setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev))
    } catch (error) {
      console.error(error)
      const msg = toUserMessage(error, {
        fallbackTitle: "Couldn’t save your profile",
        fallbackDescription: "Please try again.",
        context: "onboarding.profile.save",
      })
      toast.error(msg.title, { description: msg.description })
    } finally {
      setIsSavingProfile(false)
    }
  }, [isSavingProfile, profile])

  const updateProfileField = React.useCallback(
    (key: keyof ProfileBasics, value: string) => {
      if (key === "pincode") {
        const normalized = value.replace(/\D/g, "").slice(0, 6)

        setProfile((prev) => ({
          ...prev,
          pincode: normalized,
          ...(normalized.length < 6
            ? {
                state: "",
                district: "",
                tehsil: "",
                village: "",
              }
            : {}),
        }))

        if (normalized.length < 6) {
          setSelectedOfficeIndex("")
          setPincodeLookup({
            status: "idle",
            offices: [],
            error: null,
          })
        }

        return
      }

      setProfile((prev) => ({
        ...prev,
        [key]: key === "supportNeed" ? (value as SupportNeed) : value,
      }))
    },
    []
  )

  React.useEffect(() => {
    if (profile.pincode.length !== 6) {
      return
    }

    const controller = new AbortController()

    const lookupPincode = async () => {
      setSelectedOfficeIndex("")
      setPincodeLookup({
        status: "loading",
        offices: [],
        error: null,
      })

      try {
        const response = await fetch(`/api/pincodes/${profile.pincode}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        const payload = (await response.json().catch(() => null)) as {
          data?: { offices?: PincodeOffice[] }
          error?: string
        } | null

        if (!response.ok) {
          throw new Error(payload?.error || "Could not fetch area for pincode")
        }

        const offices = payload?.data?.offices ?? []
        if (!offices.length) {
          throw new Error("No area found for this pincode")
        }

        const primary = offices[0]
        setProfile((prev) => {
          if (prev.pincode !== profile.pincode) {
            return prev
          }

          return {
            ...prev,
            state: primary.state || "",
            district: primary.district || "",
            tehsil: primary.block || "",
            village: primary.name || "",
          }
        })

        setSelectedOfficeIndex("0")

        setPincodeLookup({
          status: "success",
          offices,
          error: null,
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setPincodeLookup({
          status: "error",
          offices: [],
          error:
            error instanceof Error
              ? error.message
              : "Could not fetch area for pincode",
        })
      }
    }

    void lookupPincode()

    return () => {
      controller.abort()
    }
  }, [profile.pincode])

  const isProfileReady =
    !!profile.fullName.trim() &&
    !!profile.phone.trim() &&
    profile.pincode.length === 6 &&
    pincodeLookup.status === "success" &&
    selectedOfficeIndex !== ""

  const identityRequiredDone =
    !!selectedId && identityFiles.primaryId.length > 0
  const landRequiredDone = landFiles.recordExtract.length > 0
  const landUploadCount = Object.values(landFiles).filter(
    (files) => files.length > 0
  ).length

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="h-6 px-2 text-[11px] tracking-wide">
          TRUST-FIRST ONBOARDING
        </Badge>
        <Badge variant="outline" className="h-6 px-2 text-[11px] tracking-wide">
          NO BLIND SIGNING
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {steps.map((item) => {
          const Icon = item.icon
          const isActive = item.id === step
          const isDone = item.id < step

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                isActive && "border-primary bg-primary/5",
                isDone &&
                  "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border",
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600"
                    : isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Step {item.id}
                </div>
                <div className="truncate text-sm font-medium">{item.title}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-muted-foreground">
          Step {step} of 4 - {steps[step - 1].title}
        </div>
        <Progress
          value={(step / 4) * 100}
          className="h-1.5 w-full bg-muted shadow-inner"
          indicatorClassName="bg-secondary"
        />
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {step === 1 && (
              <IdentityStep
                profile={profile}
                onProfileChange={updateProfileField}
                isProfileReady={isProfileReady}
                pincodeLookup={pincodeLookup}
                selectedOfficeIndex={selectedOfficeIndex}
                onSelectOfficeIndex={handleOfficeSelection}
                selectedId={selectedId}
                onSelect={setSelectedId}
                files={identityFiles}
                onPrimaryIdChange={(files) =>
                  setIdentityFiles((prev) => ({ ...prev, primaryId: files }))
                }
                onAddressProofChange={(files) =>
                  setIdentityFiles((prev) => ({
                    ...prev,
                    proofOfAddress: files,
                  }))
                }
                canContinue={isProfileReady && identityRequiredDone}
                isContinuing={isSavingProfile}
                onContinue={persistProfileAndContinue}
              />
            )}

            {step === 2 && (
              <LandStep
                isVerified={isLandVerified}
                onVerify={() => setIsLandVerified(true)}
                files={landFiles}
                landUploadCount={landUploadCount}
                onRecordExtractChange={(files) =>
                  setLandFiles((prev) => ({ ...prev, recordExtract: files }))
                }
                onOwnershipProofChange={(files) =>
                  setLandFiles((prev) => ({ ...prev, ownershipProof: files }))
                }
                onMutationCopyChange={(files) =>
                  setLandFiles((prev) => ({ ...prev, mutationCopy: files }))
                }
                onTaxReceiptChange={(files) =>
                  setLandFiles((prev) => ({ ...prev, taxReceipt: files }))
                }
                canContinue={isLandVerified && landRequiredDone}
                onContinue={nextStep}
              />
            )}

            {step === 3 && (
              <FaceScanStep
                isScanned={isFaceScanned}
                isScanning={isScanning}
                onStart={() => setIsScanning(true)}
                onComplete={() => {
                  setIsScanning(false)
                  setIsFaceScanned(true)
                }}
                onContinue={nextStep}
              />
            )}

            {step === 4 && (
              <SummaryStep
                isProfileReady={isProfileReady}
                selectedId={selectedId}
                identityUploads={identityFiles}
                landUploads={landFiles}
                isLandVerified={isLandVerified}
                isFaceScanned={isFaceScanned}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function IdentityStep({
  profile,
  onProfileChange,
  isProfileReady,
  pincodeLookup,
  selectedOfficeIndex,
  onSelectOfficeIndex,
  selectedId,
  onSelect,
  files,
  onPrimaryIdChange,
  onAddressProofChange,
  canContinue,
  isContinuing,
  onContinue,
}: {
  profile: ProfileBasics
  onProfileChange: (key: keyof ProfileBasics, value: string) => void
  isProfileReady: boolean
  pincodeLookup: PincodeLookupState
  selectedOfficeIndex: string
  onSelectOfficeIndex: (value: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
  files: IdentityUploads
  onPrimaryIdChange: (files: File[]) => void
  onAddressProofChange: (files: File[]) => void
  canContinue: boolean
  isContinuing: boolean
  onContinue: () => void
}) {
  const readiness = [
    { label: "Profile basics", done: isProfileReady },
    {
      label: "Pincode verified",
      done: pincodeLookup.status === "success" && selectedOfficeIndex !== "",
    },
    { label: "Selected ID", done: !!selectedId },
    { label: "ID upload", done: files.primaryId.length > 0 },
  ]

  const pincodeResolved = pincodeLookup.status === "success"

  return (
    <div className="grid gap-6">
      <Card className="border bg-background">
        <CardHeader>
          <CardTitle>Identity and profile setup</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            {readiness.map((item) => (
              <Badge
                key={item.label}
                variant={item.done ? "secondary" : "outline"}
                className={cn(
                  item.done && "bg-emerald-500/15 text-emerald-700"
                )}
              >
                {item.done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {item.label}
              </Badge>
            ))}
          </div>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-sm font-semibold">Profile basics</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Full name (as on documents)"
                value={profile.fullName}
                onChange={(e) => onProfileChange("fullName", e.target.value)}
              />
              <Input
                inputMode="tel"
                placeholder="Phone number"
                value={profile.phone}
                onChange={(e) => onProfileChange("phone", e.target.value)}
              />

              <Select
                value={profile.preferredLanguage}
                onValueChange={(value) =>
                  onProfileChange("preferredLanguage", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Preferred language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={profile.supportNeed}
                onValueChange={(value) => onProfileChange("supportNeed", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Primary support need" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_NEED_OPTIONS.map((need) => (
                    <SelectItem key={need.value} value={need.value}>
                      {need.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-sm font-semibold">
              Location by pincode
            </div>
            <div className="grid gap-3">
              <Input
                placeholder="Enter 6-digit pincode"
                inputMode="numeric"
                maxLength={6}
                value={profile.pincode}
                onChange={(e) => onProfileChange("pincode", e.target.value)}
              />

              {pincodeLookup.status === "loading" ? (
                <div className="text-xs text-muted-foreground">
                  Checking pincode and fetching area...
                </div>
              ) : null}

              {pincodeLookup.status === "error" ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {pincodeLookup.error}
                </div>
              ) : null}

              {pincodeResolved ? (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    Matched areas for {profile.pincode}
                  </div>
                  <div className="mt-2">
                    <Select
                      value={selectedOfficeIndex}
                      onValueChange={onSelectOfficeIndex}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your area / post office" />
                      </SelectTrigger>
                      <SelectContent>
                        {pincodeLookup.offices.map((office, index) => (
                          <SelectItem
                            key={`${office.name}-${office.district}-${office.state}-${index}`}
                            value={String(index)}
                          >
                            {office.name} - {office.district}, {office.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {pincodeLookup.offices.slice(0, 4).map((office, index) => (
                      <div
                        key={`${office.name}-${office.pincode}-${index}`}
                        className={cn(
                          "rounded-md border bg-background px-2.5 py-2",
                          selectedOfficeIndex === String(index) &&
                            "border-primary bg-primary/5"
                        )}
                      >
                        <div className="text-sm font-medium">{office.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {office.district}, {office.state}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="State"
                  value={profile.state}
                  readOnly
                  disabled={!pincodeResolved}
                />
                <Input
                  placeholder="District"
                  value={profile.district}
                  readOnly
                  disabled={!pincodeResolved}
                />
                <Input
                  placeholder="Tehsil / Taluka"
                  value={profile.tehsil}
                  readOnly
                  disabled={!pincodeResolved}
                />
                <Input
                  placeholder="Village / Post office"
                  value={profile.village}
                  readOnly
                  disabled={!pincodeResolved}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-sm font-semibold">Trusted helper</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Trusted helper name (optional)"
                value={profile.trustedHelperName}
                onChange={(e) =>
                  onProfileChange("trustedHelperName", e.target.value)
                }
              />
              <Input
                inputMode="tel"
                placeholder="Trusted helper phone (optional)"
                value={profile.trustedHelperPhone}
                onChange={(e) =>
                  onProfileChange("trustedHelperPhone", e.target.value)
                }
              />
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-sm font-semibold">
              Choose identity document type
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {IDENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all hover:bg-muted/50",
                    selectedId === opt.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {opt.description}
                      </div>
                    </div>
                    {selectedId === opt.id ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <UploadRequirementCard
              title={
                selectedId
                  ? `Upload ${IDENTITY_OPTIONS.find((item) => item.id === selectedId)?.label}`
                  : "Upload selected ID"
              }
              description="Required: clear photo or PDF of your selected ID"
              required
              files={files.primaryId}
              onFilesChange={onPrimaryIdChange}
              maxSizeMb={10}
            />
            <UploadRequirementCard
              title="Address proof"
              description="Optional: ration card, utility bill, or bank passbook"
              files={files.proofOfAddress}
              onFilesChange={onAddressProofChange}
              maxSizeMb={10}
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="font-medium">Safety note</div>
            <p className="mt-1 text-muted-foreground">
              Never sign papers without understanding names, land details, and
              payment terms. Verify with your trusted helper when unsure.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              disabled={!canContinue || isContinuing}
              onClick={onContinue}
              className="h-11 gap-2 px-8"
            >
              {isContinuing ? "Saving…" : "Continue"}{" "}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LandStep({
  isVerified,
  onVerify,
  files,
  landUploadCount,
  onRecordExtractChange,
  onOwnershipProofChange,
  onMutationCopyChange,
  onTaxReceiptChange,
  canContinue,
  onContinue,
}: {
  isVerified: boolean
  onVerify: () => void
  files: LandUploads
  landUploadCount: number
  onRecordExtractChange: (files: File[]) => void
  onOwnershipProofChange: (files: File[]) => void
  onMutationCopyChange: (files: File[]) => void
  onTaxReceiptChange: (files: File[]) => void
  canContinue: boolean
  onContinue: () => void
}) {
  const requiredReady = files.recordExtract.length > 0
  const uploadProgress = (landUploadCount / 4) * 100

  return (
    <div className="grid gap-6">
      <Card className="border bg-background">
        <CardHeader>
          <CardTitle>Land verification and records</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground">
            Verify your land ownership in the official portal, then attach your
            key records. This helps generate safer notices, claims, and
            grievance drafts.
          </div>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Portal verification</div>
              <Badge variant={isVerified ? "secondary" : "outline"}>
                {isVerified ? "Verified" : "Pending"}
              </Badge>
            </div>

            {!isVerified ? (
              <Button
                size="lg"
                variant="outline"
                className="h-20 w-full justify-between border-dashed bg-muted/20"
                onClick={onVerify}
              >
                <span className="flex items-center gap-2 text-left">
                  <ExternalLink className="h-5 w-5" />
                  <span>
                    <span className="block font-semibold">
                      Open Mahabhumi Abhilekh
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Verify khata, khasra, mutation and ownership chain
                    </span>
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">External</span>
              </Button>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/40 p-3 text-emerald-700 dark:bg-emerald-950/20">
                <Check className="h-4 w-4" />
                Portal verification marked complete.
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Document uploads</div>
                <div className="text-xs text-muted-foreground">
                  {landUploadCount}/4 documents added
                </div>
              </div>
              <Badge variant={requiredReady ? "secondary" : "outline"}>
                {requiredReady ? "Required complete" : "Required missing"}
              </Badge>
            </div>

            <Progress value={uploadProgress} className="mb-4 h-1.5" />

            <div className="grid gap-3 md:grid-cols-2">
              <UploadRequirementCard
                title="7/12 or 8A extract"
                description="Required: primary land record"
                required
                files={files.recordExtract}
                onFilesChange={onRecordExtractChange}
                maxSizeMb={10}
              />
              <UploadRequirementCard
                title="Sale deed / ownership proof"
                description="Optional but useful in disputes"
                files={files.ownershipProof}
                onFilesChange={onOwnershipProofChange}
                maxSizeMb={10}
              />
              <UploadRequirementCard
                title="Mutation order"
                description="Optional: latest mutation copy"
                files={files.mutationCopy}
                onFilesChange={onMutationCopyChange}
                maxSizeMb={10}
              />
              <UploadRequirementCard
                title="Tax receipt"
                description="Optional: recent payment receipt"
                files={files.taxReceipt}
                onFilesChange={onTaxReceiptChange}
                maxSizeMb={10}
              />
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              disabled={!canContinue}
              onClick={onContinue}
              className="h-11 gap-2 px-8"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UploadRequirementCard({
  title,
  description,
  files,
  onFilesChange,
  required = false,
  maxSizeMb,
}: {
  title: string
  description: string
  files: File[]
  onFilesChange: (files: File[]) => void
  required?: boolean
  maxSizeMb: number
}) {
  const uploaded = files.length > 0

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <Badge variant={uploaded ? "secondary" : "outline"}>
          {uploaded ? "Uploaded" : required ? "Required" : "Optional"}
        </Badge>
      </div>

      <Dropzone
        accept={{
          "application/pdf": [".pdf"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/png": [".png"],
        }}
        maxFiles={1}
        maxSize={maxSizeMb * 1024 * 1024}
        src={files.length > 0 ? files : undefined}
        onDrop={(accepted) => onFilesChange(accepted.slice(0, 1))}
        className={cn(
          "h-auto rounded-lg border-dashed bg-muted/20 p-4 text-left",
          uploaded &&
            "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20"
        )}
      >
        <DropzoneEmptyState>
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Drop or click to upload</div>
              <div className="text-xs text-muted-foreground">
                PDF, JPG, PNG up to {maxSizeMb}MB
              </div>
            </div>
          </div>
        </DropzoneEmptyState>
        <DropzoneContent className="w-full items-start" />
      </Dropzone>

      {uploaded ? (
        <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-50/50 px-2.5 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/20">
          <span className="truncate">{files[0]?.name}</span>
          <span>{files[0] ? readableSize(files[0].size) : ""}</span>
        </div>
      ) : null}
    </div>
  )
}

function FaceScanStep({
  isScanned,
  isScanning,
  onStart,
  onComplete,
  onContinue,
}: {
  isScanned: boolean
  isScanning: boolean
  onStart: () => void
  onComplete: () => void
  onContinue: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const [direction, setDirection] = React.useState<
    "left" | "right" | "middle" | null
  >(null)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const startWebcam = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      onStart()
      await runSequence(mediaStream)
    } catch (err) {
      console.error("Webcam access error:", err)
      setError("Please allow camera access to continue.")
    }
  }

  const runSequence = async (currentStream: MediaStream) => {
    setDirection("left")
    setProgress(10)
    await new Promise((resolve) => setTimeout(resolve, 1800))

    setDirection("right")
    setProgress(40)
    await new Promise((resolve) => setTimeout(resolve, 1800))

    setDirection("middle")
    setProgress(75)
    await new Promise((resolve) => setTimeout(resolve, 1800))

    setDirection(null)
    setProgress(100)
    onComplete()

    setTimeout(() => {
      currentStream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }, 1000)
  }

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="grid gap-6">
      <Card className="border bg-background">
        <CardHeader>
          <CardTitle>Face verification</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="tracking-wide">
              LIVENESS CHECK
            </Badge>
            <Badge variant={isScanned ? "secondary" : "outline"}>
              {isScanned ? "Verified" : isScanning ? "Scanning" : "Waiting"}
            </Badge>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md">
              <div
                className={cn(
                  "relative flex h-80 w-full items-center justify-center overflow-hidden rounded-3xl border bg-gradient-to-b from-muted/20 to-background transition-all duration-500",
                  isScanning
                    ? "border-primary shadow-lg shadow-primary/20"
                    : isScanned
                      ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
                      : "border-border"
                )}
              >
                {!isScanning && !isScanned ? (
                  <Camera className="h-16 w-16 text-muted-foreground/40" />
                ) : null}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 h-full w-full scale-x-[-1] object-cover",
                    isScanning || isScanned
                      ? "visible opacity-100"
                      : "invisible opacity-0"
                  )}
                />

                {(isScanning || isScanned) && (
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                  >
                    <rect
                      x="12"
                      y="12"
                      width="76"
                      height="76"
                      rx="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeDasharray="5 4"
                      className={cn(
                        "transition-colors duration-500",
                        isScanned ? "text-emerald-500" : "text-primary/70"
                      )}
                    />

                    <ellipse
                      cx="50"
                      cy="49"
                      rx="23"
                      ry="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeDasharray="3.5 3"
                      className={cn(
                        "transition-colors duration-500",
                        isScanned ? "text-emerald-500" : "text-primary/70"
                      )}
                    />

                    {isScanning && !isScanned ? (
                      <motion.line
                        x1="14"
                        y1="20"
                        x2="86"
                        y2="20"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="text-primary/70"
                        initial={{ y: 0 }}
                        animate={{ y: [0, 58, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity }}
                      />
                    ) : null}
                  </svg>
                )}

                <div className="pointer-events-none absolute inset-4 rounded-[1.45rem] border border-border/70" />

                {isScanning && !isScanned ? (
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <div className="rounded-full border border-white/20 bg-black/55 px-4 py-1.5 text-center text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm">
                      {direction === "left" && "Turn head left"}
                      {direction === "right" && "Turn head right"}
                      {direction === "middle" && "Look at center"}
                      {!direction && "Processing"}
                    </div>
                  </div>
                ) : null}

                {isScanned ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/10 text-emerald-700 backdrop-blur-[2px] dark:text-emerald-400">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="rounded-full bg-white p-3 shadow-lg"
                    >
                      <Check className="h-10 w-10" strokeWidth={3} />
                    </motion.div>
                    <span className="rounded-full bg-white/80 px-4 py-1 text-lg font-bold shadow-sm">
                      VERIFIED
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Scan progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            <div className="flex max-w-sm flex-col gap-4 text-center">
              <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {error ? (
                  <span className="font-bold text-destructive">{error}</span>
                ) : (
                  "Sequence"
                )}
              </div>

              <div className="flex justify-center gap-3">
                <StepIndicator
                  active={direction === "left"}
                  done={progress > 15}
                  label="Left"
                />
                <StepIndicator
                  active={direction === "right"}
                  done={progress > 50}
                  label="Right"
                />
                <StepIndicator
                  active={direction === "middle"}
                  done={progress > 85}
                  label="Middle"
                />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
                Ensure your face stays in the dashed frame with clear lighting.
                Remove cap, mask, or glare before scanning.
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            {!isScanned ? (
              <Button
                size="lg"
                onClick={startWebcam}
                disabled={isScanning}
                className="h-12 min-w-[220px] gap-3 rounded-full"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Enable camera and start"
                )}
              </Button>
            ) : (
              <Button
                onClick={onContinue}
                size="lg"
                className="h-11 gap-2 px-8"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepIndicator({
  active,
  done,
  label,
}: {
  active: boolean
  done: boolean
  label: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all",
        done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : active
            ? "scale-105 animate-pulse border-primary/20 bg-primary/10 text-primary"
            : "border-transparent bg-muted/50 text-muted-foreground opacity-50"
      )}
    >
      {done ? (
        <Check className="h-3 w-3" />
      ) : (
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-primary" : "bg-muted-foreground"
          )}
        />
      )}
      {label}
    </div>
  )
}

function SummaryStep({
  isProfileReady,
  selectedId,
  identityUploads,
  landUploads,
  isLandVerified,
  isFaceScanned,
}: {
  isProfileReady: boolean
  selectedId: string | null
  identityUploads: IdentityUploads
  landUploads: LandUploads
  isLandVerified: boolean
  isFaceScanned: boolean
}) {
  const landUploadCount = Object.values(landUploads).filter(
    (files) => files.length > 0
  ).length
  const totalUploads =
    identityUploads.primaryId.length +
    identityUploads.proofOfAddress.length +
    landUploadCount

  const stats = [
    {
      label: "Profile",
      status: isProfileReady ? "Complete" : "Needs review",
      ok: isProfileReady,
    },
    {
      label: "Identity",
      status:
        selectedId && identityUploads.primaryId.length > 0
          ? "Verified"
          : "Incomplete",
      ok: !!selectedId && identityUploads.primaryId.length > 0,
    },
    {
      label: "Land",
      status:
        isLandVerified && landUploads.recordExtract.length > 0
          ? "Verified"
          : "Incomplete",
      ok: isLandVerified && landUploads.recordExtract.length > 0,
    },
    {
      label: "Face",
      status: isFaceScanned ? "Verified" : "Incomplete",
      ok: isFaceScanned,
    },
  ]

  const now = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className="grid gap-6">
      <Card className="border bg-background">
        <CardHeader className="pt-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck
              className="h-12 w-12 text-emerald-600"
              strokeWidth={1.5}
            />
          </div>

          <CardTitle className="text-3xl font-bold tracking-tight">
            Verification complete
          </CardTitle>

          <div className="mx-auto mt-4 max-w-xs px-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "circOut" }}
                className="h-full bg-secondary"
              />
            </div>
            <div className="mt-2 animate-pulse text-[10px] font-bold tracking-widest text-secondary uppercase">
              Finalizing profile
            </div>
          </div>

          <p className="mt-4 text-muted-foreground">
            Your profile now has verification inputs ready for legal, scheme,
            and document workflows.
          </p>
        </CardHeader>

        <CardContent className="grid gap-8 p-8">
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="border-none bg-accent/5 shadow-none transition-colors hover:bg-accent/10"
              >
                <CardContent className="flex flex-col items-center gap-4 p-6">
                  <div className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    {stat.label}
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: stat.ok ? "100%" : "45%" }}
                        transition={{
                          duration: 1.5,
                          ease: "easeInOut",
                          delay: 0.2,
                        }}
                        className={cn(
                          "h-full",
                          stat.ok ? "bg-secondary" : "bg-amber-500/70"
                        )}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          stat.ok ? "text-emerald-600" : "text-amber-600"
                        )}
                      >
                        {stat.status}
                      </span>
                      {stat.ok ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total uploads linked</span>
              <span className="font-semibold">{totalUploads}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Identity document type</span>
              <span>
                {selectedId
                  ? IDENTITY_OPTIONS.find((item) => item.id === selectedId)
                      ?.label
                  : "Not selected"}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Land records attached</span>
              <span>{landUploadCount}/4</span>
            </div>
          </div>

          <div className="grid gap-6 rounded-2xl border border-border/50 bg-background/80 p-8 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-sm">
                <FileCheck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">
                  Representative info
                </div>
                <div className="mt-0.5 text-xs font-medium text-muted-foreground uppercase">
                  Automated KYC report
                </div>
              </div>
            </div>

            <div className="grid gap-6 text-sm md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">
                  Verified by
                </div>
                <div className="font-semibold text-foreground">
                  System verification
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">
                  Validation engine
                </div>
                <div className="font-semibold text-foreground">
                  Automated validation engine
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">
                  Verification timestamp
                </div>
                <div className="font-semibold text-foreground uppercase">
                  {now}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="font-medium text-muted-foreground">Status</div>
                <div className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  ACTIVE
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 w-full max-w-sm rounded-full text-lg font-bold"
              asChild
            >
              <Link href="/dashboard">Continue to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
