"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useTransition, useEffect } from "react";
import {
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  Loader2,
  MailIcon,
} from "lucide-react";
import { authClient as client, signIn } from "@/lib/auth/auth-client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getCallbackURL } from "@/utils/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [loading, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<null | "email" | "passkey" | "social">(null);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Guard against older browsers and server-side rendering
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential || !PublicKeyCredential.isConditionalMediationAvailable)
      return;

    try {
      const available =
        PublicKeyCredential.isConditionalMediationAvailable &&
        PublicKeyCredential.isConditionalMediationAvailable();
      if (!available) return;

      signIn.passkey({ autoFill: true });
    } catch (e) {
      console.debug("passkey conditional UI not available", e);
    }
  }, [email]);

  const LastUsedIndicator = () => (
    <span className="ml-auto absolute -top-4 w-max h-max px-2 py-1 inline-block text-tiny bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md font-medium">
      Last Used
    </span>
  );

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 dark:from-neutral-900/50 dark:to-neutral-900/30 backdrop-blur-lg">
      <CardHeader className=" text-center">
        <CardTitle className="text-xl md:text-2xl">Welcome Back!</CardTitle>
        <CardDescription className="text-sm">
          <div className="leading-tight sm:text-balance">
            Please sign in either via email, your google account or using a registered passkey.
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="none" className="inline px-1">Need help?</Button>
              </PopoverTrigger>
              <PopoverContent className="w-xs text-sm text-muted-foreground">
                If you've forgotten your password, you can reset it by clicking on the "Forgot password?" link on the sign-in page.
                <Separator />
                Passkey will work only if you have previously registered a passkey with us on this device.
              </PopoverContent>
            </Popover>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 relative">
          <section className="flex items-center justify-between w-full flex-col gap-2">
            <div className="relative w-full">
              <Input
                id="email"
                type="email"
                placeholder="Your email address"
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
                autoComplete="username webauthn"
                className="w-full peer ps-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <MailIcon size={16} aria-hidden="true" />
              </div>
            </div>

            <div className="relative w-full">
              <Input
                id="password"
                type={isVisible ? "text" : "password"}
                placeholder="Your password"
                autoComplete="current-password webauthn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full peer ps-9 pe-9"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <KeyIcon size={16} aria-hidden="true" />
              </div>
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
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
                  setRememberMe(!rememberMe);
                }}
              />
              <Label htmlFor="remember">Remember me</Label>
            </div>
            <div className="flex items-center">
              <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                Forgot password?
              </Link>
            </div>
          </section>
          <section className="flex flex-col gap-2 mt-2">
            <div
              className={cn(
                "w-full gap-2 flex items-center",
                "justify-between flex-col relative",
              )}
            >
              <Button
                type="submit"
                className="w-full flex items-center justify-center"
                disabled={loadingAction !== null && loadingAction !== "email"}
                onClick={async () => {
                  setLoadingAction("email");
                  startTransition(async () => {
                    try {
                      await signIn.email(
                        { email, password, rememberMe },
                        {
                          onSuccess(context) {
                            setLoadingAction(null);
                            toast.success("Successfully signed in. Redirecting...");
                            router.push(getCallbackURL(params));
                          },
                          onError(ctx) {
                            setLoadingAction(null);
                            toast.error(ctx?.error?.message || "Sign in failed");
                          },
                        },
                      );
                    } catch (err) {
                      setLoadingAction(null);
                      if (err instanceof Error) toast.error(err.message);
                    }
                  });
                }}
              >
                {loadingAction === "email" ? (
                  <Loader2 size={16} className="animate-spin w-full" />
                ) : (
                  <MailIcon />
                )}
                <span>Login with Email</span>

                {mounted && client.isLastUsedLoginMethod("email") && <LastUsedIndicator />}
              </Button>
            </div>
            {/* Passkey sign-in button */}
            <div
              className={cn(
                "w-full gap-2 flex items-center",
                "justify-between flex-col relative",
              )}
            >
              <Button
                variant="outline"
                className="w-full gap-2 flex items-center"
                disabled={loadingAction !== null && loadingAction !== "passkey"}
                onClick={async () => {
                  setLoadingAction("passkey");
                  try {
                    await signIn.passkey({
                      autoFill: false,
                      fetchOptions: {
                        onSuccess() {
                          setLoadingAction(null);
                          toast.success("Signed in with passkey");
                          router.push(getCallbackURL(params));
                        },
                        onError(ctx) {
                          setLoadingAction(null);
                          toast.error(ctx?.error?.message || "Passkey sign-in failed");
                        },
                      },
                    });
                  } catch (err) {
                    setLoadingAction(null);
                    if (err instanceof Error) toast.error(err.message);
                  }
                }}
              >
                {loadingAction === "passkey" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyIcon />
                )}
                <span>Login with Passkey</span>
              </Button>
            </div>

            <div
              className={cn(
                "w-full gap-2 flex items-center",
                "justify-between flex-col relative",
              )}
            >
              <Button
                variant="outline"
                className={cn("w-full gap-2 flex items-center relative")}
                disabled={loadingAction !== null && loadingAction !== "social"}
                onClick={async () => {
                  setLoadingAction("social");
                  try {
                    await signIn.social({
                      provider: "google",
                      callbackURL: "/dashboard",
                    });
                    setLoadingAction(null);
                  } catch (err) {
                    setLoadingAction(null);
                    if (err instanceof Error) toast.error(err.message);
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
                    ></path>
                    <path
                      fill="#34A853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                    ></path>
                    <path
                      fill="#EB4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    ></path>
                  </svg>
                )}
                <span>Login with Google</span>
                {mounted && client.isLastUsedLoginMethod("google") && <LastUsedIndicator />}
              </Button>
            </div>
          </section>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-center w-full flex-col text-center text-sm text-muted-foreground">
          <div className="flex-center-1 justify-center">
            Facing Issues?{" "}
            <Link href={"/contact"} className="text-primary underline cursor-pointer">Contact us</Link>{" "}
            <ExternalLinkIcon className="size-3 inline" />
          </div>
          <div className="flex-center-1 justify-center">
            Don't have an account?{" "}
            <Link href={"/sign-up"} className="text-primary underline cursor-pointer">Sign up</Link>{" "}
            <ExternalLinkIcon className="size-3 inline" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
