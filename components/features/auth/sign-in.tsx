"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  Loader2,
  MailIcon,
} from "lucide-react"
import { toast } from "sonner"

import { toUserMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { authClient as client, signIn } from "@/lib/auth/auth-client"
import { Link, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { getCallbackURL } from "@/utils/shared"

export default function SignIn() {
  const t = useTranslations("AuthSignIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [, startTransition] = useTransition()
  const [loadingAction, setLoadingAction] = useState<
    null | "email" | "passkey" | "social"
  >(null)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Guard against older browsers and server-side rendering.
    if (typeof window === "undefined") return
    if (
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isConditionalMediationAvailable
    ) {
      return
    }

    try {
      const available =
        PublicKeyCredential.isConditionalMediationAvailable &&
        PublicKeyCredential.isConditionalMediationAvailable()
      if (!available) return

      signIn.passkey({ autoFill: true })
    } catch (error) {
      console.debug("passkey conditional UI not available", error)
    }
  }, [email])

  const LastUsedIndicator = () => (
    <span className="absolute -top-4 ml-auto inline-block h-max w-max rounded-md bg-blue-100 px-2 py-1 text-tiny font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
      {t("lastUsed")}
    </span>
  )

  const toggleVisibility = () => setIsVisible((prevState) => !prevState)

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl">{t("title")}</CardTitle>
        <CardDescription className="text-sm">
          <div className="leading-tight sm:text-balance">
            {t("description")}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="none" className="inline px-1">
                  {t("needHelp")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-xs text-sm text-muted-foreground">
                {t("helpReset")}
                <Separator />
                {t("helpPasskey")}
              </PopoverContent>
            </Popover>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative grid gap-4">
          <section className="flex w-full flex-col items-center justify-between gap-2">
            <div className="relative w-full">
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                required
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                autoComplete="username webauthn"
                className="peer w-full ps-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <MailIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative w-full">
              <Input
                id="password"
                type={isVisible ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password webauthn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full ps-9 pe-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? t("hidePassword") : t("showPassword")}
                aria-pressed={isVisible}
                aria-controls="password"
              >
                {isVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </section>

          <section className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                onClick={() => {
                  setRememberMe(!rememberMe)
                }}
              />
              <Label htmlFor="remember">{t("rememberMe")}</Label>
            </div>
            <div className="flex items-center">
              <Link
                href="/forgot-password"
                className="ml-auto inline-block text-sm underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          </section>

          <section className="mt-2 flex flex-col gap-2">
            <div
              className={cn(
                "flex w-full items-center gap-2",
                "relative flex-col justify-between"
              )}
            >
              <Button
                type="submit"
                className="flex w-full items-center justify-center"
                disabled={loadingAction !== null && loadingAction !== "email"}
                onClick={async () => {
                  setLoadingAction("email")
                  startTransition(async () => {
                    try {
                      await signIn.email(
                        { email, password, rememberMe },
                        {
                          onSuccess() {
                            setLoadingAction(null)
                            toast.success(t("signInSuccess"))
                            router.push(getCallbackURL(params))
                          },
                          onError(ctx) {
                            setLoadingAction(null)
                            const msg = toUserMessage(ctx?.error ?? ctx, {
                              fallbackTitle: t("signInFailed"),
                              context: "auth.signIn.email",
                            })
                            toast.error(msg.title, {
                              description: msg.description,
                            })
                          },
                        }
                      )
                    } catch (error) {
                      setLoadingAction(null)
                      const msg = toUserMessage(error, {
                        fallbackTitle: t("signInFailed"),
                        context: "auth.signIn.email",
                      })
                      toast.error(msg.title, { description: msg.description })
                    }
                  })
                }}
              >
                {loadingAction === "email" ? (
                  <Loader2 size={16} className="w-full animate-spin" />
                ) : (
                  <MailIcon />
                )}
                <span>{t("emailButton")}</span>

                {mounted && client.isLastUsedLoginMethod("email") && (
                  <LastUsedIndicator />
                )}
              </Button>
            </div>

            <div
              className={cn(
                "flex w-full items-center gap-2",
                "relative flex-col justify-between"
              )}
            >
              <Button
                variant="outline"
                className="flex w-full items-center gap-2"
                disabled={loadingAction !== null && loadingAction !== "passkey"}
                onClick={async () => {
                  setLoadingAction("passkey")
                  try {
                    await signIn.passkey({
                      autoFill: false,
                      fetchOptions: {
                        onSuccess() {
                          setLoadingAction(null)
                          toast.success(t("passkeySuccess"))
                          router.push(getCallbackURL(params))
                        },
                        onError(ctx) {
                          setLoadingAction(null)
                          const msg = toUserMessage(ctx?.error ?? ctx, {
                            fallbackTitle: t("passkeyFailed"),
                            context: "auth.signIn.passkey",
                          })
                          toast.error(msg.title, {
                            description: msg.description,
                          })
                        },
                      },
                    })
                  } catch (error) {
                    setLoadingAction(null)
                    const msg = toUserMessage(error, {
                      fallbackTitle: t("passkeyFailed"),
                      context: "auth.signIn.passkey",
                    })
                    toast.error(msg.title, { description: msg.description })
                  }
                }}
              >
                {loadingAction === "passkey" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyIcon />
                )}
                <span>{t("passkeyButton")}</span>
              </Button>
            </div>

            <div
              className={cn(
                "flex w-full items-center gap-2",
                "relative flex-col justify-between"
              )}
            >
              <Button
                variant="outline"
                className={cn("relative flex w-full items-center gap-2")}
                disabled={loadingAction !== null && loadingAction !== "social"}
                onClick={async () => {
                  setLoadingAction("social")
                  try {
                    await signIn.social({
                      provider: "google",
                      callbackURL: "/dashboard",
                    })
                    setLoadingAction(null)
                  } catch (error) {
                    setLoadingAction(null)
                    const msg = toUserMessage(error, {
                      fallbackTitle: "Login failed",
                      context: "auth.signIn.social",
                    })
                    toast.error(msg.title, { description: msg.description })
                  }
                }}
              >
                {loadingAction === "social" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="0.98em"
                    height="1em"
                    viewBox="0 0 256 262"
                  >
                    <path
                      fill="#4285F4"
                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    />
                    <path
                      fill="#34A853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    />
                    <path
                      fill="#FBBC05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                    />
                    <path
                      fill="#EB4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    />
                  </svg>
                )}
                <span>{t("googleButton")}</span>
                {mounted && client.isLastUsedLoginMethod("google") && (
                  <LastUsedIndicator />
                )}
              </Button>
            </div>
          </section>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-col justify-center text-center text-sm text-muted-foreground">
          <div className="flex-center-1 justify-center">
            {t("facingIssues")}{" "}
            <Link
              href={"/contact"}
              className="cursor-pointer text-primary underline"
            >
              {t("contactUs")}
            </Link>{" "}
            <ExternalLinkIcon className="inline size-3" />
          </div>
          <div className="flex-center-1 justify-center">
            {t("dontHaveAccount")}{" "}
            <Link
              href={"/sign-up"}
              className="cursor-pointer text-primary underline"
            >
              {t("signUp")}
            </Link>{" "}
            <ExternalLinkIcon className="inline size-3" />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
