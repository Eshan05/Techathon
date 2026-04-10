"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, EyeIcon, EyeOffIcon, KeyIcon, Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

export default function ResetPassword() {
  const router = useRouter();
  const params = useSearchParams();

  const token = useMemo(() => params?.get("token") || "", [params]);
  const error = useMemo(() => params?.get("error") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasToken = Boolean(token);

  const onSubmit = () => {
    if (!hasToken) {
      toast.error("Missing reset token.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (res?.error) {
        toast.error(res.error.message || "Could not reset password.");
        return;
      }

      toast.success("Password updated. Please sign in.");
      router.push("/sign-in");
      router.refresh();
    });
  };

  return (
    <Card className="max-w-md bg-gradient-to-b from-neutral-100/50 to-white/30 dark:from-neutral-900/50 dark:to-neutral-900/30 backdrop-blur-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl">Reset password</CardTitle>
        <CardDescription className="text-sm">
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Reset link invalid</AlertTitle>
            <AlertDescription>
              This reset link is invalid or expired. Please request a new one.
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasToken ? (
          <Alert>
            <AlertTitle>Missing token</AlertTitle>
            <AlertDescription>
              Open the reset link from your email to continue.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <div className="relative">
            <Label htmlFor="new-password" className="sr-only">
              New password
            </Label>
            <Input
              id="new-password"
              type={visible ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="peer ps-9 pe-9"
              disabled={!hasToken || isPending}
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
              <KeyIcon size={16} aria-hidden="true" />
            </div>
            <button
              className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
              type="button"
              onClick={() => setVisible((s) => !s)}
              aria-label={visible ? "Hide password" : "Show password"}
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
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type={confirmVisible ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="peer ps-9 pe-9"
              disabled={!hasToken || isPending}
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 inset-s-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
              <KeyIcon size={16} aria-hidden="true" />
            </div>
            <button
              className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 inset-e-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
              type="button"
              onClick={() => setConfirmVisible((s) => !s)}
              aria-label={confirmVisible ? "Hide password" : "Show password"}
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
            <span>Update password</span>
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">
            <ArrowLeft className="h-4 w-4" />
            Request a new link
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
