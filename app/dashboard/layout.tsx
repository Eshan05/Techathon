import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/features/dashboard/dashboard-shell";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session) {
    redirect("/sign-in?callbackURL=/dashboard");
  }

  return (
    <DashboardShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      {children}
    </DashboardShell>
  );
}
