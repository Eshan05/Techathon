"use client"

import { useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/auth-client"
import { useRouter } from "@/i18n/navigation"
import { getCallbackURL } from "@/utils/shared"

export default function TwoFactor() {
  const t = useTranslations("AuthTwoFactor")
  const [code, setCode] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const params = useSearchParams()

  function onVerify() {
    if (!code.trim()) {
      toast.error(t("enterCode"))
      return
    }

    startTransition(async () => {
      await authClient.twoFactor.verifyTotp({
        code: code.trim(),
        fetchOptions: {
          onSuccess() {
            toast.success(t("verified"))
            router.push(getCallbackURL(params))
          },
          onError(ctx) {
            toast.error(ctx.error.message || t("verifyFailed"))
          },
        },
      })
    })
  }

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("placeholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <Button
          className="w-full gap-2"
          type="button"
          disabled={isPending}
          onClick={onVerify}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheckIcon className="size-4" />
          )}
          <span>{isPending ? t("verifying") : t("verify")}</span>
        </Button>
      </CardContent>

      <CardFooter className="text-center text-xs text-muted-foreground">
        {t("footer")}
      </CardFooter>
    </Card>
  )
}
