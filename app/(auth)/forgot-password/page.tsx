import { AuthShell } from "@/components/features/auth/auth-shell";
import ForgotPassword from "@/components/features/auth/forgot-password";

export default function Page() {
  return (
    <AuthShell>
      <ForgotPassword />
    </AuthShell>
  );
}
