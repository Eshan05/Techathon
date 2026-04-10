import { MessageSquareTextIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { ChatPanel } from "@/components/features/chat/chat-panel"

export async function ChatAssistant({ profileId }: { profileId?: string }) {
  const t = await getTranslations("Chat")

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          className="fixed right-4 bottom-4 z-50 h-11 gap-2 rounded-full shadow-lg"
        >
          <MessageSquareTextIcon className="size-4" />
          {t("button")}
        </Button>
      </SheetTrigger>

      <SheetContent className="p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100svh-5.25rem)]">
          <ChatPanel profileId={profileId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
