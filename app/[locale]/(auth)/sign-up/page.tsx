import { Suspense } from "react"

import { AuthShell } from "@/components/features/auth/auth-shell"
import SignUp from "@/components/features/auth/sign-up"

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<div aria-hidden className="h-8" />}>
        <SignUp />
      </Suspense>
    </AuthShell>
  )
}
