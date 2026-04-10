"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { authClient } from "@/lib/auth/auth-client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      setIsSubmitted(true);
    } catch {
      setError("Unable to send a reset link right now. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 dark:from-neutral-900/50 dark:to-neutral-900/30 backdrop-blur-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <CheckCircle2 className="size-5" />
          </div>
          <CardTitle className="text-xl md:text-2xl">Check your email</CardTitle>
          <CardDescription className="text-sm">
            If the address exists, a reset link has been sent to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheckIcon className="size-4" />
            <AlertTitle>Password reset requested</AlertTitle>
            <AlertDescription>
              Check your inbox and spam folder. The link expires for security and should only be used on a trusted device.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsSubmitted(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">
              <ArrowLeft className="h-4 w-4" />
              Return to sign in
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-up">
              <MailIcon className="h-4 w-4" />
              Create a new account
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 dark:from-neutral-900/50 dark:to-neutral-900/30 backdrop-blur-lg">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background px-3 text-sm font-semibold tracking-tight text-foreground">
          TS
        </div>
        <CardTitle className="text-xl md:text-2xl">Forgot password</CardTitle>
        <CardDescription className="text-sm">
          Enter the email address you used when you joined and we&apos;ll send you instructions to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative w-full">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full peer ps-9"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
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
            <AlertTitle>Security note</AlertTitle>
            <AlertDescription className="text-xs">
              We do not email passwords. This flow only sends a temporary reset link if the account exists.
            </AlertDescription>
          </Alert>

          <Button className="w-full gap-2" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MailIcon size={16} />
            )}
            <span>Send reset link</span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-up">
            <MailIcon className="h-4 w-4" />
            Need an account?
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
