import "server-only";

import { groq, type GroqLanguageModelOptions } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export type ChatProviderId = "groq";

export type ChatProfile = {
  id: string;
  label: string;
  provider: ChatProviderId;
  modelId: string;
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  providerOptions?: {
    groq?: GroqLanguageModelOptions;
  };
};

export const CHAT_PROFILES = {
  default: {
    id: "default",
    label: "Default",
    provider: "groq",
    modelId: "llama-3.1-8b-instant",
    temperature: 0.4,
    system:
      "You are a helpful assistant. Be concise, ask clarifying questions when needed, and avoid guessing.",
  },
  "kisan-vakil": {
    id: "kisan-vakil",
    label: "Kisan Vakil",
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    temperature: 0.2,
    system: [
      "You are Kisan Vakil — a trustworthy, plain-language legal + paperwork assistant for farmers in India.",
      "Your job: explain documents simply, highlight red-flags, suggest next steps, and draft short templates (applications/complaints/notices).",
      "Rules:",
      "- Prefer the user's language; if unknown, reply in simple Hinglish.",
      "- Keep answers actionable: bullets, short steps, what-to-ask at the office/court.",
      "- Never invent land record numbers, dates, or legal outcomes.",
      "- If info is missing, ask 1-3 targeted questions before advising.",
      "- Add a short safety note when the user is at risk of fraud or signing unknown paperwork.",
    ].join("\n"),
  },
} as const satisfies Record<string, ChatProfile>;

export type ChatProfileId = keyof typeof CHAT_PROFILES;

export function getDefaultChatProfileId(): ChatProfileId {
  const fromEnv = process.env.AI_CHAT_DEFAULT_PROFILE?.trim();
  if (fromEnv && fromEnv in CHAT_PROFILES) return fromEnv as ChatProfileId;
  return "default";
}

export function resolveChatProfile(input: {
  profileId?: string | null;
  system?: string | null;
  modelId?: string | null;
}): ChatProfile {
  const base =
    (input.profileId && input.profileId in CHAT_PROFILES
      ? CHAT_PROFILES[input.profileId as ChatProfileId]
      : null) ?? CHAT_PROFILES[getDefaultChatProfileId()];

  const system = input.system?.trim() ? input.system.trim() : base.system;
  const modelId = input.modelId?.trim() ? input.modelId.trim() : base.modelId;

  return {
    ...base,
    system,
    modelId,
  };
}

export function getChatModel(profile: Pick<ChatProfile, "provider" | "modelId">): LanguageModel {
  switch (profile.provider) {
    case "groq":
      return groq(profile.modelId);
    default: {
      const _exhaustive: never = profile.provider;
      throw new Error(`Unsupported provider: ${_exhaustive}`);
    }
  }
}
