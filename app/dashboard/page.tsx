import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import Link from "next/link";
import { Languages, ChevronRight } from "lucide-react";

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

      {/* Action Cards */}
      <Link href="/dashboard/translator" className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl">
        <Card className="hover:border-blue-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer">
          <CardContent className="flex items-center p-6 gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Languages className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Document Translator</h2>
              <p className="text-sm text-slate-500 font-medium pb-1">Listen to paperwork in your language</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </CardContent>
        </Card>
      </Link>

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
