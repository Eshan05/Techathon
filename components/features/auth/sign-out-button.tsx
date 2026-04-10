"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth/auth-client"

export function SignOutButton() {
  const t = useTranslations("Auth")
  const locale = useLocale()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={async () => {
        const { error } = await signOut()
        if (error) {
          toast.error(error.message || "Sign out failed")
          return
        }
        toast.success("Signed out")
        router.refresh()
        router.push(`/${locale}`)
      }}
    >
      <LogOutIcon className="size-4" />
      <span>{t("signOut")}</span>
    </Button>
  )
}
