import { z } from "zod"

const localeSchema = z.enum(["en", "hi", "mr"])

const localizedStringSchema = z.object({
  en: z.string().min(1),
  hi: z.string().min(1),
  mr: z.string().min(1),
})

const localizedStringArraySchema = z.object({
  en: z.array(z.string()).default([]),
  hi: z.array(z.string()).default([]),
  mr: z.array(z.string()).default([]),
})

const plainLanguageSchema = z.object({
  summary: z.string().min(1),
  whenApplies: z.array(z.string()).default([]),
  keyPoints: z.array(z.string()).default([]),
  whatToDo: z.array(z.string()).default([]),
  requiredDocs: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
  edgeCases: z.array(z.string()).default([]),
  sideEffects: z.array(z.string()).default([]),
})

const localizedPlainLanguageSchema = z.object({
  en: plainLanguageSchema,
  hi: plainLanguageSchema,
  mr: plainLanguageSchema,
})

export const lawSchema = z
  .object({
    id: z.string().min(1),
    priority: z.number().int().min(0).default(0),
    jurisdiction: z.object({
      country: z.literal("IN"),
      stateCode: z.string().optional(),
      stateName: z.string().optional(),
      region: z.string().optional(),
    }),
    kind: z.enum(["act", "rule", "bill", "policy", "other"]).default("other"),
    status: z
      .enum(["in-force", "amended", "draft", "repealed", "unknown"])
      .default("unknown"),
    year: z.number().int().optional(),
    title: localizedStringSchema,
    shortTitle: localizedStringSchema.optional(),
    topics: z.array(z.string()).default([]),
    keywords: localizedStringArraySchema,
    plainLanguage: localizedPlainLanguageSchema,
    legal: z
      .object({
        overview: z.string().optional(),
        keySections: z.array(z.string()).optional(),
      })
      .optional(),
    sources: z
      .array(
        z.object({
          label: z.string().min(1),
          url: z.string().url(),
          kind: z.enum(["indiacode", "prs", "govt", "other"]).default("other"),
        })
      )
      .default([]),
    relatedIds: z.array(z.string()).default([]),
  })
  .strict()

export const lawsDatasetSchema = z.array(lawSchema)

export function assertLawLocale(
  input: string
): asserts input is z.infer<typeof localeSchema> {
  if (!localeSchema.safeParse(input).success) {
    throw new Error(`Unsupported locale: ${input}`)
  }
}
