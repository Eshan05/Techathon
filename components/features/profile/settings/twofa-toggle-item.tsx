"use client"

import React, { useState, useRef, useEffect } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PasswordInput } from "@/components/derived/password-input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import QRCodeStyling from "qr-code-styling"
import { authClient as client } from "@/lib/auth-client"
import { toast } from "sonner"
import { ShieldCheck, ShieldOff } from "lucide-react"

export default function TwoFaToggleItem({ enabled }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [twoFactorVerifyURI, setTwoFactorVerifyURI] = useState("")
  const [twoFaPassword, setTwoFaPassword] = useState("")
  const [isPendingTwoFa, setIsPendingTwoFa] = useState(false)
  const qrRef = useRef<HTMLDivElement | null>(null)
  const qr = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (twoFactorVerifyURI && qrRef.current) {
      if (!qr.current)
        qr.current = new QRCodeStyling({
          width: 200,
          height: 200,
          data: twoFactorVerifyURI,
          dotsOptions: { color: "#000", type: "rounded" },
          backgroundOptions: { color: "#fff" },
        })
      else qr.current.update({ data: twoFactorVerifyURI })
      try {
        qr.current.append(qrRef.current)
      } catch (e) {}
    }
  }, [twoFactorVerifyURI])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          {enabled ? <ShieldOff /> : <ShieldCheck />}
          {enabled ? "Disable 2FA" : "Enable 2FA"}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="w-11/12 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{enabled ? "Disable 2FA" : "Enable 2FA"}</DialogTitle>
          <DialogDescription>
            {enabled
              ? "Disable the second factor authentication from your account"
              : "Enable 2FA to secure your account"}
          </DialogDescription>
        </DialogHeader>
        {twoFactorVerifyURI ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center">
              <div ref={qrRef} />
            </div>
            <Label htmlFor="password">
              Scan the QR code with your TOTP app
            </Label>
            <Input
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              placeholder="Enter OTP"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Password"
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={isPendingTwoFa}
            onClick={async () => {
              if (twoFaPassword.length < 8 && !twoFactorVerifyURI) {
                toast.error("Password must be at least 8 characters")
                return
              }
              setIsPendingTwoFa(true)
              if (enabled) {
                await client.twoFactor.disable({
                  password: twoFaPassword,
                  fetchOptions: {
                    onError(ctx) {
                      toast.error(ctx.error.message)
                    },
                    onSuccess() {
                      toast("2FA disabled successfully")
                      setOpen(false)
                    },
                  },
                })
                setIsPendingTwoFa(false)
                return
              }
              if (twoFactorVerifyURI) {
                await client.twoFactor.verifyTotp({
                  code: twoFaPassword,
                  fetchOptions: {
                    onError(ctx) {
                      setIsPendingTwoFa(false)
                      setTwoFaPassword("")
                      toast.error(ctx.error.message)
                    },
                    onSuccess() {
                      toast("2FA enabled successfully")
                      setTwoFactorVerifyURI("")
                      setIsPendingTwoFa(false)
                      setTwoFaPassword("")
                      setOpen(false)
                    },
                  },
                })
                return
              }
              await client.twoFactor.enable({
                password: twoFaPassword,
                fetchOptions: {
                  onError(ctx) {
                    toast.error(ctx.error.message)
                  },
                  onSuccess(ctx) {
                    setTwoFactorVerifyURI(ctx.data.totpURI)
                  },
                },
              })
              setIsPendingTwoFa(false)
              setTwoFaPassword("")
            }}
          >
            {isPendingTwoFa ? (
              <Loader2 className="animate-spin" />
            ) : enabled ? (
              "Disable 2FA"
            ) : (
              "Enable 2FA"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
