export type MasterCategoryId =
  | "land-ownership"
  | "identity-family"
  | "farming-crop-proof"
  | "financial-loans"
  | "legal-disputes"
  | "gov-schemes"
  | "utilities-infra"

export type MasterCategory = {
  id: MasterCategoryId
  label: string
  description: string
}

export const MASTER_CATEGORIES: readonly MasterCategory[] = [
  {
    id: "land-ownership",
    label: "Land & Ownership",
    description: "Land records, mutation, EC, deeds, maps.",
  },
  {
    id: "identity-family",
    label: "Identity & Family",
    description: "Aadhaar/PAN, family linkage, inheritance basics.",
  },
  {
    id: "farming-crop-proof",
    label: "Farming & Crop Proof",
    description: "Insurance, sowing, inspection, soil, inputs.",
  },
  {
    id: "financial-loans",
    label: "Financial & Loans",
    description: "KCC/loans, bank papers, repayment, mortgages.",
  },
  {
    id: "legal-disputes",
    label: "Legal & Disputes",
    description: "Notices, FIR/court, agreements, PoA, evidence.",
  },
  {
    id: "gov-schemes",
    label: "Government Schemes",
    description: "PM-Kisan, PMFBY, eligibility proofs, claim docs.",
  },
  {
    id: "utilities-infra",
    label: "Utilities & Infrastructure",
    description: "Electricity, irrigation, borewell, conversion papers.",
  },
] as const

export function docKindToMasterCategory(kind: string): MasterCategoryId | null {
  switch (kind) {
    case "sale-deed":
    case "land-record":
    case "mutation":
    case "encumbrance":
      return "land-ownership"

    case "id-proof":
      return "identity-family"

    case "receipt":
      return "financial-loans"

    case "court-notice":
    case "legal-notice":
    case "agreement":
      return "legal-disputes"

    default:
      return null
  }
}

export function getMasterCategoryLabel(id: MasterCategoryId) {
  return MASTER_CATEGORIES.find((c) => c.id === id)?.label ?? id
}
