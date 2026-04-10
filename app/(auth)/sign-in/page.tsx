import { Suspense } from "react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import SignIn from "@/components/features/auth/sign-in";

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<div aria-hidden className="h-8" />}>
        <SignIn />
      </Suspense>
    </AuthShell>
  );
}
