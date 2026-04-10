export type LawLocale = "en" | "hi" | "mr"

export type LawKind = "act" | "rule" | "bill" | "policy" | "other"

export type LawStatus =
  | "in-force"
  | "amended"
  | "draft"
  | "repealed"
  | "unknown"

export type LawSourceKind = "indiacode" | "prs" | "govt" | "other"

export type LawSource = {
  label: string
  url: string
  kind: LawSourceKind
}

export type LawJurisdiction = {
  country: "IN"
  stateCode?: string
  stateName?: string
  region?: string
}

export type LawPlainLanguage = {
  summary: string
  whenApplies: string[]
  keyPoints: string[]
  whatToDo: string[]
  requiredDocs: string[]
  redFlags: string[]
  edgeCases: string[]
  sideEffects: string[]
}

export type Law = {
  id: string
  priority: number
  jurisdiction: LawJurisdiction
  kind: LawKind
  status: LawStatus
  year?: number
  title: Record<LawLocale, string>
  shortTitle?: Record<LawLocale, string>
  topics: string[]
  keywords: Record<LawLocale, string[]>
  plainLanguage: Record<LawLocale, LawPlainLanguage>
  legal?: {
    overview?: string
    keySections?: string[]
  }
  sources: LawSource[]
  relatedIds: string[]
}

export type LawSearchHit = {
  id: string
  score: number
  priority: number
  jurisdiction: LawJurisdiction
  title: string
  shortTitle?: string
  year?: number
  status: LawStatus
  kind: LawKind
  topics: string[]
  snippet: string
}
