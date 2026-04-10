"use client";

import { useMemo, useState } from "react";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ChatPanel({
  profileId = "kisan-vakil",
}: {
  profileId?: string;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chats",
        body: { profileId },
      }),
    [profileId]
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const canSend = status === "ready" && input.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="py-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
              Ask about land records, schemes, a notice you received, or paste a clause you&apos;re unsure about.
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[92%] rounded-2xl border px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-background"
                )}
              >
                {m.parts
                  .map((p) => (p.type === "text" ? p.text : null))
                  .filter(Boolean)
                  .join("")}
              </div>
            ))}
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              Something went wrong. Please try again.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSend) return;
            sendMessage({ text: input.trim() });
            setInput("");
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            disabled={status !== "ready"}
            className="min-h-16"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(status === "submitted" || status === "streaming") && (
                <Button type="button" variant="outline" onClick={() => stop()}>
                  Stop
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMessages([])}
                disabled={messages.length === 0 || status !== "ready"}
              >
                Clear
              </Button>
            </div>

            <Button type="submit" disabled={!canSend}>
              Send
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Don&apos;t sign anything you don&apos;t understand. If you share personal docs, redact Aadhaar/phone where possible.
          </p>
        </form>
      </div>
    </div>
  );
}
