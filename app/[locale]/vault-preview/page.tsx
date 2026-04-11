import { DocumentVault } from "@/components/features/vault/document-vault"
import { Providers } from "@/components/providers"

export default function Page() {
  return (
    <Providers>
      <DocumentVault />
    </Providers>
  )
}
