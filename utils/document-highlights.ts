import { getIndianSubdivision } from "@/utils/india-states"

export type FindingKind = "section" | "law" | "clause" | "record"

export type Finding = {
  id: string
  kind: FindingKind
  label: string
  count: number
  examples?: string[]
}

export type DocClass = {
  id:
    | "land-ownership"
    | "identity-family"
    | "farming-crop-proof"
    | "financial-loans"
    | "legal-disputes"
    | "gov-schemes"
    | "utilities-infra"
  label: string
  score: number
}

export type HighlightSummary = {
  classes: DocClass[]
  findings: Finding[]
  state: { code: string; name: string } | null
  stateContext: {
    landRecordTerms: string[]
    lawFamilies: string[]
  } | null
}

type ClauseDef = {
  id: string
  label: string
  terms: string[]
}

type LawDef = {
  id: string
  label: string
  terms: string[]
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function countTerm(text: string, term: string) {
  const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi")
  const matches = text.match(re)
  return matches?.length ?? 0
}

const SECTION_REF_RE =
  /\b(?:section|sec\.?|s\.|u\/s)\s*\d+[a-zA-Z]?(?:\(\d+\))*\b/gi

const CENTRAL_LAWS: LawDef[] = [
  {
    id: "bns-2023",
    label: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
    terms: ["Bharatiya Nyaya Sanhita", "BNS"],
  },
  {
    id: "bnss-2023",
    label: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
    terms: ["Bharatiya Nagarik Suraksha Sanhita", "BNSS"],
  },
  {
    id: "bsa-2023",
    label: "Bharatiya Sakshya Adhiniyam, 2023 (BSA)",
    terms: ["Bharatiya Sakshya Adhiniyam", "BSA"],
  },
  {
    id: "ipc",
    label: "Indian Penal Code (IPC) (legacy reference)",
    terms: ["Indian Penal Code", "IPC"],
  },
  {
    id: "crpc",
    label: "Code of Criminal Procedure (CrPC) (legacy reference)",
    terms: ["Code of Criminal Procedure", "CrPC"],
  },
  {
    id: "cpc",
    label: "Code of Civil Procedure (CPC)",
    terms: ["Code of Civil Procedure", "CPC"],
  },
  {
    id: "contract-1872",
    label: "Indian Contract Act, 1872",
    terms: ["Indian Contract Act", "Contract Act"],
  },
  {
    id: "tpa-1882",
    label: "Transfer of Property Act, 1882",
    terms: ["Transfer of Property Act"],
  },
  {
    id: "registration-1908",
    label: "Registration Act, 1908",
    terms: ["Registration Act"],
  },
  {
    id: "stamp",
    label: "Indian Stamp Act / State Stamp Acts",
    terms: ["Stamp Act", "stamp duty"],
  },
  {
    id: "arbitration-1996",
    label: "Arbitration and Conciliation Act, 1996",
    terms: ["Arbitration and Conciliation Act", "arbitration"],
  },
  {
    id: "land-acquisition-2013",
    label:
      "Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013",
    terms: ["Land Acquisition", "Rehabilitation and Resettlement"],
  },
  {
    id: "electricity-2003",
    label: "Electricity Act, 2003",
    terms: ["Electricity Act"],
  },
]

const CLAUSES: ClauseDef[] = [
  {
    id: "consideration-payment",
    label: "Payment / Consideration",
    terms: ["payment", "consideration", "advance", "installment"],
  },
  {
    id: "interest-penalty",
    label: "Interest / Penalty",
    terms: ["interest", "penalty", "late fee", "damages"],
  },
  {
    id: "term-termination",
    label: "Term / Termination",
    terms: ["term", "tenure", "termination", "terminate"],
  },
  {
    id: "jurisdiction",
    label: "Jurisdiction",
    terms: ["jurisdiction", "court at", "courts at"],
  },
  {
    id: "arbitration",
    label: "Arbitration",
    terms: ["arbitration", "arbitrator", "arbitral"],
  },
  {
    id: "indemnity",
    label: "Indemnity",
    terms: ["indemnity", "indemnify"],
  },
  {
    id: "default",
    label: "Default / Breach",
    terms: ["default", "breach"],
  },
  {
    id: "registration-stamp",
    label: "Registration / Stamp",
    terms: ["registration", "registrar", "stamp duty"],
  },
  {
    id: "possession",
    label: "Possession",
    terms: ["possession", "hand over"],
  },
  {
    id: "warranty-rep",
    label: "Warranties / Representations",
    terms: ["warranty", "represent"],
  },
]

const DOC_CLASSES: Array<{
  id: DocClass["id"]
  label: string
  terms: string[]
}> = [
  {
    id: "land-ownership",
    label: "Land & ownership",
    terms: [
      "khasra",
      "khata",
      "khatauni",
      "mutation",
      "jamabandi",
      "ror",
      "record of rights",
      "patta",
      "chitta",
      "encumbrance",
      "sale deed",
      "gift deed",
      "partition deed",
      "7/12",
      "satbara",
      "rtc",
      "adangal",
      "pahani",
    ],
  },
  {
    id: "identity-family",
    label: "Identity & family",
    terms: [
      "aadhaar",
      "aadhar",
      "pan",
      "ration",
      "legal heir",
      "succession",
      "death certificate",
      "family",
    ],
  },
  {
    id: "farming-crop-proof",
    label: "Farming & crop proof",
    terms: [
      "pmfby",
      "crop insurance",
      "sowing",
      "inspection",
      "soil health",
      "fertilizer",
      "seed",
      "girdawari",
    ],
  },
  {
    id: "financial-loans",
    label: "Financial & loans",
    terms: [
      "kcc",
      "kisan credit card",
      "loan",
      "nbfc",
      "bank",
      "sanction",
      "mortgage",
      "hypothecation",
      "repayment",
    ],
  },
  {
    id: "legal-disputes",
    label: "Legal & disputes",
    terms: [
      "legal notice",
      "notice",
      "fir",
      "court",
      "case",
      "judgment",
      "affidavit",
      "power of attorney",
      "poa",
      "dispute",
      "possession",
    ],
  },
  {
    id: "gov-schemes",
    label: "Government schemes",
    terms: [
      "pm-kisan",
      "pm kisan",
      "subsidy",
      "scheme",
      "yojana",
      "dbt",
      "compensation",
      "relief",
    ],
  },
  {
    id: "utilities-infra",
    label: "Utilities & infrastructure",
    terms: [
      "electricity",
      "pump",
      "connection",
      "irrigation",
      "borewell",
      "conversion certificate",
    ],
  },
]

const STATE_LAND_RECORD_TERMS: Partial<Record<string, string[]>> = {
  // From docs/references/ChatGPT-1.md (state-wise equivalents)
  MH: ["7/12", "7/12 extract", "satbara", "8A"],
  KA: ["rtc", "record of rights", "tenancy", "crops"],
  AP: ["adangal", "pahani", "ror-1b", "ror 1b"],
  TS: ["adangal", "pahani", "ror-1b", "ror 1b"],
  TN: ["patta", "chitta"],
  PB: ["jamabandi"],
  HR: ["jamabandi"],
  UP: ["khasra", "khatauni"],
  BR: ["khasra", "khatauni"],
  MP: ["khasra", "khatauni"],
  GJ: ["7/12", "vf6", "vf 6"],
  RJ: ["jamabandi", "khasra"],
  KL: ["thandaper"],
}

const STATE_LAW_FAMILIES = [
  "Land Revenue Act/Code (state)",
  "Tenancy / Land reforms acts (state)",
  "Stamp duty rules/notifications (state)",
  "Registration rules + local circulars (state)",
] as const

export function summarizeDocument(
  text: string,
  opts?: { stateCode?: string | null }
): HighlightSummary {
  const normalized = text.toLowerCase()
  const state = getIndianSubdivision(opts?.stateCode ?? null)

  const classes = DOC_CLASSES.map((c) => {
    const score = c.terms.reduce(
      (acc, term) => acc + countTerm(normalized, term),
      0
    )
    return { id: c.id, label: c.label, score }
  })
    .filter((c) => c.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 4)

  const findings: Finding[] = []

  const sectionMatches = normalized.match(SECTION_REF_RE) ?? []
  if (sectionMatches.length > 0) {
    const examples = Array.from(
      new Set(sectionMatches.map((m) => m.replace(/\s+/g, " ").trim()))
    )
      .slice(0, 8)
      .map((x) => x)
    findings.push({
      id: "section-refs",
      kind: "section",
      label: "Section references",
      count: sectionMatches.length,
      examples,
    })
  }

  for (const law of CENTRAL_LAWS) {
    const count = law.terms.reduce(
      (acc, term) => acc + countTerm(normalized, term),
      0
    )
    if (count > 0) {
      findings.push({ id: law.id, kind: "law", label: law.label, count })
    }
  }

  for (const clause of CLAUSES) {
    const count = clause.terms.reduce(
      (acc, term) => acc + countTerm(normalized, term),
      0
    )
    if (count > 0) {
      findings.push({
        id: clause.id,
        kind: "clause",
        label: clause.label,
        count,
      })
    }
  }

  const stateCode = state?.code ?? null
  const landRecordTerms = stateCode
    ? (STATE_LAND_RECORD_TERMS[stateCode] ?? [])
    : []

  const stateContext =
    state && state.kind === "state"
      ? {
          landRecordTerms,
          lawFamilies: [...STATE_LAW_FAMILIES],
        }
      : null

  return {
    classes,
    findings: findings.toSorted((a, b) => b.count - a.count),
    state: state ? { code: state.code, name: state.name } : null,
    stateContext,
  }
}

export type HighlightRange = {
  start: number
  end: number
  kind: FindingKind
  label: string
}

function pushRanges(
  text: string,
  ranges: HighlightRange[],
  kind: FindingKind,
  label: string,
  re: RegExp
) {
  for (const match of text.matchAll(re)) {
    const idx = match.index
    if (idx == null) continue
    const value = match[0] ?? ""
    if (!value) continue
    ranges.push({ start: idx, end: idx + value.length, kind, label })
  }
}

function mergeRanges(ranges: HighlightRange[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: HighlightRange[] = []

  for (const r of sorted) {
    const last = merged[merged.length - 1]
    if (!last) {
      merged.push(r)
      continue
    }
    if (r.start <= last.end) {
      // keep the earlier/larger range; don’t nest highlights
      continue
    }
    merged.push(r)
  }

  return merged
}

export function getHighlightRangesForText(
  text: string,
  summary: HighlightSummary
): HighlightRange[] {
  const ranges: HighlightRange[] = []

  pushRanges(text, ranges, "section", "Section", new RegExp(SECTION_REF_RE))

  for (const law of CENTRAL_LAWS) {
    for (const term of law.terms) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi")
      pushRanges(text, ranges, "law", law.label, re)
    }
  }

  for (const clause of CLAUSES) {
    for (const term of clause.terms) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi")
      pushRanges(text, ranges, "clause", clause.label, re)
    }
  }

  if (summary.stateContext?.landRecordTerms?.length) {
    for (const term of summary.stateContext.landRecordTerms) {
      const re = new RegExp(escapeRegExp(term), "gi")
      pushRanges(text, ranges, "record", "Land record term", re)
    }
  }

  return mergeRanges(ranges)
}
