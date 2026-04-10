"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FarmerProfile = {
  userId: string
  fullName: string | null
  phone: string | null
  preferredLanguage: string
  state: string | null
  district: string | null
  tehsil: string | null
  village: string | null
}

function emptyProfile(): FarmerProfile {
  return {
    userId: "",
    fullName: null,
    phone: null,
    preferredLanguage: "hi",
    state: null,
    district: null,
    tehsil: null,
    village: null,
  }
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

  const loadProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/farmer-profiles", { cache: "no-store" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || t("loadFailed"))
      }
      const json = (await res.json()) as { data: FarmerProfile }
      setProfile(json.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    if (!open) return
    void loadProfile()
  }, [open, loadProfile])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/farmer-profiles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          preferredLanguage: profile.preferredLanguage,
          state: profile.state,
          district: profile.district,
          tehsil: profile.tehsil,
          village: profile.village,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || t("saveFailed"))
      }

      toast.success(t("saved"))
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Credenza open={open} onOpenChange={setOpen}>
      <CredenzaTrigger asChild>{children}</CredenzaTrigger>

      <CredenzaContent className="max-w-2xl">
        <CredenzaHeader>
          <CredenzaTitle>{t("title")}</CredenzaTitle>
          <CredenzaDescription>{t("description")}</CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className="pb-2">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">{t("tabBasics")}</TabsTrigger>
              <TabsTrigger value="location">{t("tabLocation")}</TabsTrigger>
              <TabsTrigger value="preferences">
                {t("tabPreferences")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Ramesh Kumar"
                  value={profile.fullName ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      fullName: e.target.value || null,
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
                    setProfile((p) => ({ ...p, phone: e.target.value || null }))
                  }
                  disabled={loading || saving}
                />
              </div>

              <Separator />
              <div className="text-xs text-muted-foreground">
                {t("phoneTip")}
              </div>
            </TabsContent>

            <TabsContent value="location" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="state">{t("state")}</Label>
                  <Input
                    id="state"
                    placeholder="e.g. Maharashtra"
                    value={profile.state ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        state: e.target.value || null,
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
                      setProfile((p) => ({
                        ...p,
                        district: e.target.value || null,
                      }))
                    }
                    disabled={loading || saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="tehsil">{t("tehsil")}</Label>
                  <Input
                    id="tehsil"
                    placeholder="e.g. Haveli"
                    value={profile.tehsil ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        tehsil: e.target.value || null,
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
                      setProfile((p) => ({
                        ...p,
                        village: e.target.value || null,
                      }))
                    }
                    disabled={loading || saving}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label>{t("preferredLanguage")}</Label>
                <Select
                  value={profile.preferredLanguage}
                  onValueChange={(value) =>
                    setProfile((p) => ({ ...p, preferredLanguage: value }))
                  }
                  disabled={loading || saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tLocale("label")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi">{tLocale("hindi")}</SelectItem>
                    <SelectItem value="mr">{tLocale("marathi")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <div className="text-xs text-muted-foreground">
                {t("voiceTip")}
              </div>
            </TabsContent>
          </Tabs>
        </CredenzaBody>

        <CredenzaFooter className="gap-2">
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
