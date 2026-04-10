"use client"

import React, { useState, useRef, useEffect } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PasswordInput } from "@/components/derived/password-input"
import { Button } from "@/components/ui/button"
import CopyButton from "@/components/derived/copy-button"
import QRCodeStyling from "qr-code-styling"
import { authClient as client } from "@/lib/auth-client"
import { toast } from "sonner"

export default function TwoFaScanItem() {
  const [twoFactorVerifyURI, setTwoFactorVerifyURI] = useState<string>("")
  const [twoFaPassword, setTwoFaPassword] = useState("")
  const qrRef = useRef<HTMLDivElement | null>(null)
  const qr = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (twoFactorVerifyURI && qrRef.current) {
      if (!qr.current) {
        qr.current = new QRCodeStyling({
          width: 200,
          height: 200,
          data: twoFactorVerifyURI,
          dotsOptions: { color: "#000", type: "rounded" },
          backgroundOptions: { color: "#fff" },
        })
      } else {
        qr.current.update({ data: twoFactorVerifyURI })
      }
      try {
        qr.current.append(qrRef.current)
      } catch (e) {}
    }
  }, [twoFactorVerifyURI])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Scan QR Code
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="w-11/12 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Scan the QR code with your TOTP app
          </DialogDescription>
        </DialogHeader>
        {twoFactorVerifyURI ? (
          <>
            <div className="flex items-center justify-center">
              <div ref={qrRef} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">
                Copy URI to clipboard
              </p>
              <CopyButton textToCopy={twoFactorVerifyURI} />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <PasswordInput
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              placeholder="Enter Password"
            />
            <Button
              onClick={async () => {
                if (twoFaPassword.length < 8) {
                  toast.error("Password must be at least 8 characters")
                  return
                }
                await client.twoFactor.getTotpUri(
                  { password: twoFaPassword },
                  {
                    onSuccess(ctx) {
                      setTwoFactorVerifyURI(ctx.data.totpURI)
                    },
                  }
                )
                setTwoFaPassword("")
              }}
            >
              Show QR Code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
