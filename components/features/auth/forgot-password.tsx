"use client"

import { type FormEvent, useState } from "react"
import { useTranslations } from "next-intl"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useLocale } from "next-intl"

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
import { authClient } from "@/lib/auth/auth-client"
import { Link } from "@/i18n/navigation"

export default function ForgotPassword() {
  const t = useTranslations("AuthForgotPassword")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `/${locale}/reset-password`,
      })
      setIsSubmitted(true)
    } catch {
      setError(t("sendFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <CheckCircle2 className="size-5" />
          </div>
          <CardTitle className="text-xl md:text-2xl">
            {t("submittedTitle")}
          </CardTitle>
          <CardDescription className="text-sm">
            {t("submittedDescription", { email })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheckIcon className="size-4" />
            <AlertTitle>{t("requestedTitle")}</AlertTitle>
            <AlertDescription>{t("requestedDescription")}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsSubmitted(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">
              <ArrowLeft className="h-4 w-4" />
              {t("returnToSignIn")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-up">
              <MailIcon className="h-4 w-4" />
              {t("createAccount")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background px-3 text-sm font-semibold tracking-tight text-foreground">
          TS
        </div>
        <CardTitle className="text-xl md:text-2xl">{t("title")}</CardTitle>
        <CardDescription className="text-sm">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative w-full">
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="peer w-full ps-9"
            />
            <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
              <MailIcon size={16} aria-hidden="true" />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Alert>
            <ShieldCheckIcon className="size-4" />
            <AlertTitle>{t("securityTitle")}</AlertTitle>
            <AlertDescription className="text-xs">
              {t("securityDescription")}
            </AlertDescription>
          </Alert>

          <Button
            className="w-full gap-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MailIcon size={16} />
            )}
            <span>{t("submit")}</span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">
            <ArrowLeft className="h-4 w-4" />
            {t("backToSignIn")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-up">
            <MailIcon className="h-4 w-4" />
            {t("needAccount")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
