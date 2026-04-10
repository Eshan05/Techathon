"use client";

import { MessageSquareTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ChatPanel } from "@/components/features/chat/chat-panel";

export function ChatAssistant({ profileId }: { profileId?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          className="fixed right-4 bottom-4 z-50 h-11 gap-2 rounded-full shadow-lg"
        >
          <MessageSquareTextIcon className="size-4" />
          Ask Kisan Vakil
        </Button>
      </SheetTrigger>

      <SheetContent className="p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Kisan Vakil</SheetTitle>
          <SheetDescription>
            Plain-language help for land, schemes, notices, and paperwork.
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100svh-5.25rem)]">
          <ChatPanel profileId={profileId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
