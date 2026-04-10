"use client"

import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  ImagePlusIcon,
  KeyIcon,
  Loader2,
  MailIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { uploadFiles } from "@/utils/uploadthing"
import { getCallbackURL } from "@/utils/shared"

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join("") || "TS"
  )
}

export default function SignUp() {
  const t = useTranslations("AuthSignUp")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>()
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const params = useSearchParams()

  const toggleVisibility = () => setIsVisible((previousState) => !previousState)
  const toggleConfirmVisibility = () =>
    setIsConfirmVisible((previousState) => !previousState)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(undefined)
      return
    }

    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [avatarFile])

  const clearAvatar = () => {
    setAvatarFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error(t("chooseImageError"))
      event.target.value = ""
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("avatarTooLarge"))
      event.target.value = ""
      return
    }

    setAvatarFile(file)
  }

  const onSubmit = () => {
    if (!name.trim()) {
      toast.error(t("enterName"))
      return
    }

    if (password.length < 8) {
      toast.error(t("passwordTooShort"))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }

    startTransition(async () => {
      const callbackURL = getCallbackURL(params)
      const { error } = await authClient.signUp.email(
        {
          callbackURL,
          email,
          name: name.trim(),
          password,
        },
        {
          onError(context) {
            toast.error(context.error.message || t("createFailed"))
          },
        }
      )

      if (error) return

      try {
        if (avatarFile) {
          const uploadedFiles = await uploadFiles("avatarImage", {
            files: [avatarFile],
          })
          const uploadedAvatar = uploadedFiles[0]?.url

          if (uploadedAvatar) {
            await authClient.updateUser({ image: uploadedAvatar })
          }
        }

        toast.success(t("created"))
        router.push(callbackURL)
      } catch (uploadError) {
        if (uploadError instanceof Error) {
          toast.error(uploadError.message)
        } else {
          toast.error(t("imageUploadFailed"))
        }

        toast.success(t("created"))
        router.push(callbackURL)
      }
    })
  }

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 backdrop-blur-lg dark:from-neutral-900/50 dark:to-neutral-900/30">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-lg md:text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <section className="grid gap-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="size-12">
                <AvatarImage
                  src={avatarPreviewUrl}
                  alt={name || t("profileImage")}
                />
                <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t("profileImage")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("profileImageHint")}
                </p>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="mr-1 size-3" />
                <span>{avatarFile ? t("change") : t("choose")}</span>
              </Button>
              {avatarFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAvatar}
                >
                  <Trash2Icon className="mr-1 size-3" />
                  <span>{t("remove")}</span>
                </Button>
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {t("upTo2Mb")}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onAvatarChange}
            />
          </section>

          <section className="grid gap-2">
            <div className="relative">
              <Label htmlFor="name" className="sr-only">
                {t("nameLabel")}
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="peer ps-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <UserIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="signup-email" className="sr-only">
                {t("emailLabel")}
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="peer ps-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <MailIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="signup-password" className="sr-only">
                {t("passwordLabel")}
              </Label>
              <Input
                id="signup-password"
                type={isVisible ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="peer ps-9 pe-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                type="button"
                className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={toggleVisibility}
                aria-label={isVisible ? t("hidePassword") : t("showPassword")}
              >
                {isVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="relative">
              <Label htmlFor="signup-password-confirm" className="sr-only">
                {t("confirmPasswordLabel")}
              </Label>
              <Input
                id="signup-password-confirm"
                type={isConfirmVisible ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="peer ps-9 pe-9"
              />
              <div className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                type="button"
                className="absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={toggleConfirmVisibility}
                aria-label={
                  isConfirmVisible ? t("hidePassword") : t("showPassword")
                }
              >
                {isConfirmVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </section>

          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={onSubmit}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlusIcon className="size-4" />
            )}
            <span>{isPending ? t("creating") : t("create")}</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-col justify-center text-center text-sm text-muted-foreground">
          <div className="flex-center-1 justify-center">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/sign-in"
              className="cursor-pointer text-primary underline"
            >
              {t("signIn")}
            </Link>
            <ExternalLinkIcon className="ml-1 inline size-3" />
          </div>
          <div className="flex-center-1 justify-center">
            {t("needHelp")}{" "}
            <Link
              href="/contact"
              className="cursor-pointer text-primary underline"
            >
              {t("contactUs")}
            </Link>{" "}
            <ExternalLinkIcon className="ml-1 inline size-3" />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
