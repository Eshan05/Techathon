import { NextResponse } from "next/server";
import { z } from "zod";

import {
  convertToModelMessages,
  generateText,
  streamText,
  type UIMessage,
} from "ai";

import { getChatModel, resolveChatProfile } from "@/lib/ai";
import { getUpstashRedis } from "@/lib/cache/upstash";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  messages: z.array(z.any()),
  profileId: z.string().optional(),
  system: z.string().optional(),
  modelId: z.string().optional(),
  stream: z.boolean().optional().default(true),
  cache: z.boolean().optional().default(false),
});

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (val as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return val;
  });
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const bytes = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY. Add it to .env.local." },
      { status: 500 }
    );
  }

  const { messages, profileId, system, modelId, stream, cache } = parsed.data;
  const profile = resolveChatProfile({ profileId, system, modelId });
  const model = getChatModel(profile);

  const modelMessages = await convertToModelMessages(messages as UIMessage[]);

  if (!stream) {
    const redis = cache ? getUpstashRedis() : null;
    const ttlSeconds = 60 * 15;

    if (redis) {
      const keyPayload = {
        provider: profile.provider,
        modelId: profile.modelId,
        system: profile.system,
        messages,
      };
      const cacheKey = `chat:v1:${await sha256Hex(stableJson(keyPayload))}`;
      const cached = await redis.get<string>(cacheKey);
      if (typeof cached === "string" && cached.length > 0) {
        return NextResponse.json({ text: cached, cached: true });
      }

      const result = await generateText({
        model,
        system: profile.system,
        messages: modelMessages,
        temperature: profile.temperature,
        maxOutputTokens: profile.maxOutputTokens,
        providerOptions: profile.providerOptions,
      });

      await redis.set(cacheKey, result.text, { ex: ttlSeconds });
      return NextResponse.json({ text: result.text, cached: false });
    }

    const result = await generateText({
      model,
      system: profile.system,
      messages: modelMessages,
      temperature: profile.temperature,
      maxOutputTokens: profile.maxOutputTokens,
      providerOptions: profile.providerOptions,
    });

    return NextResponse.json({ text: result.text });
  }

  const result = streamText({
    model,
    system: profile.system,
    messages: modelMessages,
    temperature: profile.temperature,
    maxOutputTokens: profile.maxOutputTokens,
    providerOptions: profile.providerOptions,
    onError({ error }) {
      console.error("/api/chats streamText error", error);
    },
  });

  return result.toUIMessageStreamResponse();
}
