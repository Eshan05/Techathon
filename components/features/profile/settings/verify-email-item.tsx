"use client"

import React from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { BadgeCheck } from "lucide-react"
import { authClient as client } from "@/lib/auth-client"
import { toast } from "sonner"

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
                toast.error(ctx.error.message)
              },
            }
          )
        } catch (e) {
          console.error(e)
          toast.error("Failed to send verification email")
        }
      }}
    >
      <BadgeCheck />
      Verify email
    </DropdownMenuItem>
  )
}
