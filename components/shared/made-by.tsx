import { HeartIcon } from "lucide-react"
import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const MadeBy = () => {
  const author = siteConfig.author
  return (
    <div className="flex items-center justify-center gap-2 p-2 text-xs text-muted-foreground">
      <HeartIcon className="h-4 w-4 animate-pulse text-red-400/50" />
      <span className="text-muted-foreground">
        Made by{" "}
        {author.url ? (
          <Link href={author.url} className="hover:underline">
            {author.name}
          </Link>
        ) : (
          author.name
        )}
      </span>
    </div>
  )
}
