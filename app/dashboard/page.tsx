import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { SignOutButton } from "@/components/features/auth/sign-out-button";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session) {
    redirect("/sign-in?callbackURL=/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
          </p>
        </div>
        <SignOutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid gap-2">
            <div>
              <span className="text-muted-foreground">Name:</span> {session.user.name}
            </div>
            <div>
              <span className="text-muted-foreground">User ID:</span> {session.user.id}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
