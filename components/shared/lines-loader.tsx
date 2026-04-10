import Image from "next/image"

export default function LinesLoader() {
  return (
    <div className="mt-4 flex h-svh w-full items-center justify-center gap-2">
      <Image
        src="/images/bars-scale.svg"
        width={20}
        height={20}
        className="dark:invert"
        alt="..."
      />
    </div>
  )
}
