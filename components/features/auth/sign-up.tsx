"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { uploadFiles } from "@/utils/uploadthing";
import { getCallbackURL } from "@/utils/shared";

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join("") || "TS"
  );
}

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>();
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const toggleVisibility = () => setIsVisible((previousState) => !previousState);
  const toggleConfirmVisibility = () =>
    setIsConfirmVisible((previousState) => !previousState);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const clearAvatar = () => {
    setAvatarFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile image must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
  };

  const onSubmit = () => {
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const callbackURL = getCallbackURL(params);
      const { error } = await authClient.signUp.email(
        {
          callbackURL,
          email,
          name: name.trim(),
          password,
        },
        {
          onError(context) {
            toast.error(context.error.message || "Could not create your account.");
          },
        },
      );

      if (error) return;

      try {
        if (avatarFile) {
          const uploadedFiles = await uploadFiles("avatarImage", {
            files: [avatarFile],
          });
          const uploadedAvatar = uploadedFiles[0]?.url;

          if (uploadedAvatar) {
            await authClient.updateUser({ image: uploadedAvatar });
          }
        }

        toast.success("Account created. Redirecting...");
        router.push(callbackURL);
      } catch (uploadError) {
        if (uploadError instanceof Error) {
          toast.error(uploadError.message);
        } else {
          toast.error("Account created, but the profile image upload failed.");
        }

        toast.success("Account created. Redirecting...");
        router.push(callbackURL);
      }
    });
  };

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 dark:from-neutral-900/50 dark:to-neutral-900/30 backdrop-blur-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-lg md:text-xl">Create your account</CardTitle>
        <CardDescription>
          Start with email and password. You can add passkeys and two-factor authentication after you get inside.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <section className="grid gap-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="size-12">
                <AvatarImage
                  src={avatarPreviewUrl}
                  alt={name || "Profile image preview"}
                />
                <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Profile image</p>
                <p className="text-xs text-muted-foreground">
                  Preview how it will look on your profile.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="size-3 mr-1" />
                <span>{avatarFile ? "Change" : "Choose"}</span>
              </Button>
              {avatarFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAvatar}
                >
                  <Trash2Icon className="size-3 mr-1" />
                  <span>Remove</span>
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground ml-auto">
                Up to 2MB.
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
                Your name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="peer ps-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <UserIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="signup-email" className="sr-only">
                Email address
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="peer ps-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <MailIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="signup-password" className="sr-only">
                Create a password
              </Label>
              <Input
                id="signup-password"
                type={isVisible ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="peer ps-9 pe-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                type="button"
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px]"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
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
                Confirm your password
              </Label>
              <Input
                id="signup-password-confirm"
                type={isConfirmVisible ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="peer ps-9 pe-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                type="button"
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px]"
                onClick={toggleConfirmVisibility}
                aria-label={isConfirmVisible ? "Hide password confirmation" : "Show password confirmation"}
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
            <span>{isPending ? "Creating account" : "Create account"}</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="">
        <div className="flex justify-center w-full flex-col text-center text-sm text-muted-foreground">
          <div className="flex-center-1 justify-center">
            Have an account?{" "}
            <Link href="/sign-in" className="text-primary underline">
              Sign in
            </Link>
            <ExternalLinkIcon className="size-3 inline ml-1" />
          </div>
          <div className="flex-center-1 justify-center">
            Facing Issues?{" "}
            <Link
              href={"/contact"}
              className="text-primary underline cursor-pointer"
            >
              Contact us
            </Link>{" "}
            <ExternalLinkIcon className="size-3 inline ml-1" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
