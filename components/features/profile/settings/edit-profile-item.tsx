"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Handshake, MapPin, PencilIcon, UserRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { toUserMessage } from "@/lib/errors"

type SupportNeed =
  | "land-records"
  | "schemes"
  | "notices"
  | "complaints"
  | "cases"

type FarmerProfile = {
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

function ProfileDialogSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}

async function fetchFarmerProfile(): Promise<FarmerProfile> {
  const r = await fetch("/api/farmer-profiles", { credentials: "same-origin" })
  const json = await r.json().catch(() => null)
  if (!r.ok) {
    throw new Error(json?.error ?? "Failed to load profile")
  }
  return json.data as FarmerProfile
}

async function saveFarmerProfile(
  values: FarmerProfile
): Promise<FarmerProfile> {
  const r = await fetch("/api/farmer-profiles", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  const json = await r.json().catch(() => null)
  if (!r.ok) {
    throw new Error(json?.error ?? "Failed to save profile")
  }
  return json.data as FarmerProfile
}

export default function EditProfileItem({ session }: { session: any }) {
  const [open, setOpen] = useState(false)
  const defaults = useMemo<FarmerProfile>(
    () => ({
      fullName: session?.user?.name ?? null,
      phone: null,
      preferredLanguage: "hi",
      supportNeed: "land-records",
      trustedHelperName: null,
      trustedHelperPhone: null,
      state: null,
      district: null,
      tehsil: null,
      village: null,
    }),
    [session?.user?.name]
  )

  const form = useForm<FarmerProfile>({
    defaultValues: defaults,
  })

  const {
    data: loadedProfile,
    error,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn: fetchFarmerProfile,
    enabled: open,
  })

  const isProfileLoading = open && (isLoading || isFetching)

  useEffect(() => {
    if (loadedProfile) {
      form.reset(loadedProfile)
    }
  }, [loadedProfile, form])

  useEffect(() => {
    if (error) {
      console.error(error)
      const msg = toUserMessage(error, {
        fallbackTitle: "Couldn’t load your profile",
        fallbackDescription: "Please try again.",
        context: "profile.load",
      })
      toast.error(msg.title, { description: msg.description })
    }
  }, [error])

  async function onSave(values: FarmerProfile) {
    try {
      await saveFarmerProfile(values)
      toast.success("Profile updated")
      setOpen(false)
    } catch (e) {
      console.error(e)
      const msg = toUserMessage(e, {
        fallbackTitle: "Couldn’t save your profile",
        fallbackDescription: "Please try again.",
        context: "profile.save",
      })
      toast.error(msg.title, { description: msg.description })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onClick={() => setOpen(true)}
        >
          <PencilIcon />
          Edit Profile
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="no-scrollbar max-h-[80vh] w-[94vw] max-w-3xl overflow-x-clip overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update the details we use for land records, schemes, notices, and
            help.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {isProfileLoading && (
            <div className="absolute inset-0 z-10 overflow-y-auto rounded-md bg-background/80 p-4 backdrop-blur-sm">
              <ProfileDialogSkeleton />
            </div>
          )}

          <Form {...form} aria-busy={isProfileLoading}>
            <form onSubmit={form.handleSubmit(onSave)} className="grid gap-4">
              <Tabs defaultValue="basics" className="flex w-full flex-col">
                <TabsList className="flex w-full justify-start gap-1 bg-transparent">
                  <TabsTrigger value="basics" className="gap-2">
                    <UserRound className="size-4" />
                    Basics
                  </TabsTrigger>
                  <TabsTrigger
                    value="trust"
                    className="flex-none gap-2 px-2 text-xs sm:text-sm"
                  >
                    <Handshake className="size-4" />
                    Trusted helper
                  </TabsTrigger>
                  <TabsTrigger
                    value="location"
                    className="flex-none gap-2 px-2 text-xs sm:text-sm"
                  >
                    <MapPin className="size-4" />
                    Location
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basics" className="mt-4 grid gap-4">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your name (as on documents)"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Used on drafts and templates. Always verify before
                            printing or signing.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="tel"
                              placeholder="Your phone number"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            We use this for reminders and alerts.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="preferredLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred language</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={(v) => field.onChange(v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose language" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hi">Hindi</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="mr">Marathi</SelectItem>
                                  <SelectItem value="pa">Punjabi</SelectItem>
                                  <SelectItem value="gu">Gujarati</SelectItem>
                                  <SelectItem value="bn">Bengali</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supportNeed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What do you need help with?</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={(v) =>
                                  field.onChange(v as SupportNeed)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="land-records">
                                    Land records
                                  </SelectItem>
                                  <SelectItem value="schemes">
                                    Government schemes
                                  </SelectItem>
                                  <SelectItem value="notices">
                                    Legal notices
                                  </SelectItem>
                                  <SelectItem value="complaints">
                                    Complaints / grievances
                                  </SelectItem>
                                  <SelectItem value="cases">
                                    Court cases
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <div className="font-medium">Safety note</div>
                      <p className="mt-1 text-muted-foreground">
                        Farmers are often pushed to sign paperwork they don’t
                        understand. Always read (or listen to) a summary, verify
                        names/land details, and keep a copy.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="trust" className="mt-4 grid gap-4">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="trustedHelperName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trusted helper name (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Family member / agent you trust"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Someone who can help you track notices, claims, or
                            cases.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedHelperPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trusted helper phone (optional)</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="tel"
                              placeholder="Helper phone number"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="location" className="mt-4 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="District"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tehsil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tehsil / Taluka</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Tehsil"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="village"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Village</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Village"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isProfileLoading}>
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
