"use client"

import { useMemo, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, EyeIcon, EyeOffIcon, KeyIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { toUserMessage } from "@/lib/errors"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/auth-client"
import { Link, useRouter } from "@/i18n/navigation"

export default function ResetPassword() {
  const t = useTranslations("AuthResetPassword")
  const router = useRouter()
  const params = useSearchParams()

  const token = useMemo(() => params?.get("token") || "", [params])
  const error = useMemo(() => params?.get("error") || "", [params])

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasToken = Boolean(token)

  const onSubmit = () => {
    if (!hasToken) {
      toast.error(t("missingToken"))
      return
    }

    if (newPassword.length < 8) {
      toast.error(t("passwordTooShort"))
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }

    startTransition(async () => {
      const res = await authClient.resetPassword({
        newPassword,
        token,
      })

      if (res?.error) {
        const msg = toUserMessage(res.error, {
          fallbackTitle: t("resetFailed"),
          context: "auth.resetPassword",
        })
        toast.error(msg.title, { description: msg.description })
        return
      }

      toast.success(t("updated"))
      router.push("/sign-in")
      router.refresh()
    })
  }

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl">{t("title")}</CardTitle>
        <CardDescription className="text-sm">
          {t("description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("invalidLinkTitle")}</AlertTitle>
            <AlertDescription>{t("invalidLinkDescription")}</AlertDescription>
          </Alert>
        ) : null}

        {!hasToken ? (
          <Alert>
            <AlertTitle>{t("missingTokenTitle")}</AlertTitle>
            <AlertDescription>{t("missingTokenDescription")}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <div className="relative">
            <Label htmlFor="new-password" className="sr-only">
              {t("newPasswordLabel")}
            </Label>
            <Input
              id="new-password"
              type={visible ? "text" : "password"}
              placeholder={t("newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="peer ps-9 pe-9"
              disabled={!hasToken || isPending}
            />
            <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
              <KeyIcon size={16} aria-hidden="true" />
            </div>
            <button
              className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              type="button"
              onClick={() => setVisible((s) => !s)}
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              disabled={!hasToken || isPending}
            >
              {visible ? (
                <EyeOffIcon size={16} aria-hidden="true" />
              ) : (
                <EyeIcon size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="relative">
            <Label htmlFor="confirm-password" className="sr-only">
              {t("confirmPasswordLabel")}
            </Label>
            <Input
              id="confirm-password"
              type={confirmVisible ? "text" : "password"}
              placeholder={t("confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="peer ps-9 pe-9"
              disabled={!hasToken || isPending}
            />
            <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
              <KeyIcon size={16} aria-hidden="true" />
            </div>
            <button
              className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              type="button"
              onClick={() => setConfirmVisible((s) => !s)}
              aria-label={
                confirmVisible ? t("hidePassword") : t("showPassword")
              }
              disabled={!hasToken || isPending}
            >
              {confirmVisible ? (
                <EyeOffIcon size={16} aria-hidden="true" />
              ) : (
                <EyeIcon size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            onClick={onSubmit}
            disabled={!hasToken || isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{t("submit")}</span>
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">
            <ArrowLeft className="h-4 w-4" />
            {t("requestNewLink")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">
            <ArrowLeft className="h-4 w-4" />
            {t("backToSignIn")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
