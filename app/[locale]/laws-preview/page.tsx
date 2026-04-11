import { LawsExplorer } from "@/components/features/laws/laws-explorer"
import { Providers } from "@/components/providers"

export default function LawsPreviewPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Providers>
        <LawsExplorer />
      </Providers>
    </main>
  )
}
