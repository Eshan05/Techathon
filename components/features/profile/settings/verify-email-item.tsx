"use client"

import React from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { BadgeCheck } from "lucide-react"
import { authClient as client } from "@/lib/auth-client"
import { toast } from "sonner"
import { toUserMessage } from "@/lib/errors"

export default function VerifyEmailItem({ email }: { email?: string }) {
  return (
    <DropdownMenuItem
      onClick={async () => {
        if (!email) return
        try {
          await client.sendVerificationEmail(
            { email },
            {
              onSuccess() {
                toast.success("Verification email sent")
              },
              onError(ctx) {
                const msg = toUserMessage(ctx?.error ?? ctx, {
                  fallbackTitle: "Couldn’t send the verification email",
                  context: "profile.verifyEmail",
                })
                toast.error(msg.title, { description: msg.description })
              },
            }
          )
        } catch (e) {
          console.error(e)
          const msg = toUserMessage(e, {
            fallbackTitle: "Couldn’t send the verification email",
            context: "profile.verifyEmail",
          })
          toast.error(msg.title, { description: msg.description })
        }
      }}
    >
      <BadgeCheck />
      Verify email
    </DropdownMenuItem>
  )
}
