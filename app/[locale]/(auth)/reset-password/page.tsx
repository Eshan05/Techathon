import { AuthShell } from "@/components/features/auth/auth-shell"
import ResetPassword from "@/components/features/auth/reset-password"

export default function Page() {
  return (
    <AuthShell>
      <ResetPassword />
    </AuthShell>
  )
}
