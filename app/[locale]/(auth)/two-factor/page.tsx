import { AuthShell } from "@/components/features/auth/auth-shell"
import TwoFactor from "@/components/features/auth/two-factor"

export default function Page() {
  return (
    <AuthShell>
      <TwoFactor />
    </AuthShell>
  )
}
