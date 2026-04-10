import { CircularBarsSpinnerLoader } from "@/components/shared/staggered-loader"

export default function RootLoading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center">
      <CircularBarsSpinnerLoader />
    </main>
  )
}
