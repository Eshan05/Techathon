import type { Law, LawLocale, LawSearchHit } from "@/lib/laws/types"

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/\u200c|\u200d/g, "")
    .replace(/[^\p{L}\p{N}\s/.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const STOPWORDS_EN = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "is",
  "are",
  "was",
  "were",
  "what",
  "how",
  "can",
  "i",
  "my",
  "me",
  "we",
  "our",
  "you",
  "your",
  "law",
  "act",
  "rule",
])

const STOPWORDS_HI_MR = new Set([
  "और",
  "या",
  "के",
  "की",
  "का",
  "में",
  "पर",
  "से",
  "को",
  "है",
  "हैं",
  "क्या",
  "कैसे",
  "मेरा",
  "मेरी",
  "हम",
  "आप",
  "कानून",
  "अधिनियम",
  "नियम",
  "आणि",
  "किंवा",
  "चे",
  "ची",
  "चा",
  "मध्ये",
  "वर",
  "पासून",
  "ला",
  "आहे",
  "आहेत",
  "काय",
  "कसे",
  "माझा",
  "माझी",
  "आम्ही",
  "तुम्ही",
  "कायदा",
])

function tokenize(query: string, locale: LawLocale): string[] {
  const text = normalizeText(query)
  if (!text) return []

  const raw = text.split(" ").filter(Boolean)
  const stop = locale === "en" ? STOPWORDS_EN : STOPWORDS_HI_MR

  const out: string[] = []
  for (const token of raw) {
    if (token.length <= 1) continue
    if (stop.has(token)) continue
    out.push(token)
  }
  return Array.from(new Set(out))
}

function scoreLaw(
  law: Law,
  tokens: string[],
  locale: LawLocale
): { score: number; snippet: string } {
  if (tokens.length === 0) {
    return { score: law.priority, snippet: law.plainLanguage[locale].summary }
  }

  const title = normalizeText(law.title[locale])
  const shortTitle = law.shortTitle ? normalizeText(law.shortTitle[locale]) : ""
  const summary = normalizeText(law.plainLanguage[locale].summary)
  const keywordBlob = normalizeText(law.keywords[locale].join(" "))
  const topicBlob = normalizeText(law.topics.join(" "))

  let score = 0
  let bestSnippet = law.plainLanguage[locale].summary

  for (const token of tokens) {
    if (title.includes(token)) score += 18
    if (shortTitle.includes(token)) score += 14
    if (keywordBlob.includes(token)) score += 10
    if (topicBlob.includes(token)) score += 6
    if (summary.includes(token)) score += 4
  }

  score += Math.min(law.priority, 10)

  // Snippet: prefer first matching keyPoint/whenApplies.
  const candidates: string[] = []
  candidates.push(...law.plainLanguage[locale].whenApplies)
  candidates.push(...law.plainLanguage[locale].keyPoints)
  candidates.push(law.plainLanguage[locale].summary)

  const normalizedCandidates = candidates
    .map((c) => ({ raw: c, norm: normalizeText(c) }))
    .filter((c) => c.raw && c.norm)

  const found = normalizedCandidates.find((c) =>
    tokens.some((t) => c.norm.includes(t))
  )
  if (found) bestSnippet = found.raw

  return { score, snippet: bestSnippet }
}

export function searchLaws(opts: {
  laws: Law[]
  query: string
  locale: LawLocale
  limit: number
}): LawSearchHit[] {
  const tokens = tokenize(opts.query, opts.locale)

  const scored = opts.laws
    .map((law) => {
      const { score, snippet } = scoreLaw(law, tokens, opts.locale)
      return {
        law,
        score,
        snippet,
      }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : b.law.priority - a.law.priority
    )
    .slice(0, Math.max(1, Math.min(opts.limit, 50)))

  return scored.map(({ law, score, snippet }) => ({
    id: law.id,
    score,
    priority: law.priority,
    jurisdiction: law.jurisdiction,
    title: law.title[opts.locale],
    shortTitle: law.shortTitle?.[opts.locale],
    year: law.year,
    status: law.status,
    kind: law.kind,
    topics: law.topics,
    snippet,
  }))
}

export function getLawSearchTokensForDebug(query: string, locale: LawLocale) {
  return tokenize(query, locale)
}
