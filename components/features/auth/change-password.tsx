"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { authClient as client } from "@/lib/auth-client"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/derived/password-input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Credenza,
  CredenzaTrigger,
  CredenzaContent,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaDescription,
  CredenzaTitle,
} from "@/components/ui/credenza"
import { MdPassword } from "react-icons/md"
import { Loader2, KeyIcon, EyeIcon, EyeOffIcon, LockIcon } from "lucide-react"
import { calculatePasswordStrength } from "@/utils/password-strength"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

type FormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  signOutDevices?: boolean
}

export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      signOutDevices: false,
    },
  })

  const newPassword = watch("newPassword") || ""

  const onSubmit = async (data: FormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (data.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setLoading(true)
    const res = await client.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
      revokeOtherSessions: data.signOutDevices,
    })
    setLoading(false)
    if (res.error) {
      toast.error(res.error.message || "Couldn't change your password")
    } else {
      setOpen(false)
      toast.success("Password changed successfully")
      reset()
    }
  }

  return (
    <Credenza open={open} onOpenChange={setOpen}>
      <CredenzaTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <MdPassword />
          Change Password
        </DropdownMenuItem>
      </CredenzaTrigger>

      <CredenzaContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
          <CredenzaHeader>
            <CredenzaTitle>Change Password</CredenzaTitle>
            <CredenzaDescription className="">
              Please enter your current password and the new password you would
              like to use.
            </CredenzaDescription>
          </CredenzaHeader>

          <div className="grid gap-2">
            <Label htmlFor="current-password">Current Password</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Enter your current password correctly to proceed.
            </p>
            <PasswordInput
              id="current-password"
              {...register("currentPassword", { required: true, minLength: 8 })}
              placeholder="Password"
              leftIcon={
                <LockIcon className="size-4 shrink-0 text-muted-foreground" />
              }
            />

            <Label htmlFor="new-password" className="mt-4">
              New Password
            </Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Enter a new password as per requirements and re-enter to confirm
              it.
            </p>

            <div className="relative">
              <Input
                id="new-password"
                type={isVisible ? "text" : "password"}
                {...register("newPassword", { required: true, minLength: 8 })}
                placeholder="New Password"
                className="peer w-full ps-9 pe-9"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => setIsVisible((s) => !s)}
                aria-label={isVisible ? "Hide password" : "Show password"}
                aria-pressed={isVisible}
              >
                {isVisible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>

            <div className="relative">
              <Input
                id="confirm-password"
                type={isConfirmVisible ? "text" : "password"}
                {...register("confirmPassword", {
                  required: true,
                  minLength: 8,
                })}
                placeholder="Confirm Password"
                className="peer w-full ps-9 pe-9"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => setIsConfirmVisible((s) => !s)}
                aria-label={
                  isConfirmVisible ? "Hide password" : "Show password"
                }
                aria-pressed={isConfirmVisible}
              >
                {isConfirmVisible ? (
                  <EyeOffIcon size={16} />
                ) : (
                  <EyeIcon size={16} />
                )}
              </button>
            </div>

            {/* Strength meter (5 bars) */}
            <div className="">
              {(() => {
                const score = calculatePasswordStrength(newPassword) // 0-5
                const bars = Array.from({ length: 5 }).map((_, i) => i + 1)
                const getBarClass = (index: number) => {
                  if (score === 0) return "bg-neutral-200"
                  if (index <= score) {
                    if (score <= 1) return "bg-red-500"
                    if (score === 2) return "bg-amber-500"
                    if (score === 3) return "bg-yellow-400"
                    if (score === 4) return "bg-green-400"
                    return "bg-green-600"
                  }
                  return "bg-muted/20"
                }

                return (
                  <div className="mb-2 flex items-center gap-2">
                    {bars.map((b) => (
                      <div
                        key={b}
                        className={`h-2 flex-1 rounded-sm ${getBarClass(b)}`}
                        style={{ minWidth: 0 }}
                      />
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox {...register("signOutDevices")} />
              <p className="text-sm">Sign out from other devices</p>
            </div>
          </div>

          <CredenzaFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                "Change Password"
              )}
            </Button>
          </CredenzaFooter>
        </form>
      </CredenzaContent>
    </Credenza>
  )
}
