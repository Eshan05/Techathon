export type IndianSubdivision = {
  code: string
  name: string
  kind: "state" | "ut"
}

// Source (checked 2026-04-10): Wikipedia lists 28 states + 8 union territories.
// https://en.wikipedia.org/wiki/States_and_union_territories_of_India

export const INDIA_STATES = [
  { code: "AP", name: "Andhra Pradesh", kind: "state" },
  { code: "AR", name: "Arunachal Pradesh", kind: "state" },
  { code: "AS", name: "Assam", kind: "state" },
  { code: "BR", name: "Bihar", kind: "state" },
  { code: "CG", name: "Chhattisgarh", kind: "state" },
  { code: "GA", name: "Goa", kind: "state" },
  { code: "GJ", name: "Gujarat", kind: "state" },
  { code: "HR", name: "Haryana", kind: "state" },
  { code: "HP", name: "Himachal Pradesh", kind: "state" },
  { code: "JH", name: "Jharkhand", kind: "state" },
  { code: "KA", name: "Karnataka", kind: "state" },
  { code: "KL", name: "Kerala", kind: "state" },
  { code: "MP", name: "Madhya Pradesh", kind: "state" },
  { code: "MH", name: "Maharashtra", kind: "state" },
  { code: "MN", name: "Manipur", kind: "state" },
  { code: "ML", name: "Meghalaya", kind: "state" },
  { code: "MZ", name: "Mizoram", kind: "state" },
  { code: "NL", name: "Nagaland", kind: "state" },
  { code: "OD", name: "Odisha", kind: "state" },
  { code: "PB", name: "Punjab", kind: "state" },
  { code: "RJ", name: "Rajasthan", kind: "state" },
  { code: "SK", name: "Sikkim", kind: "state" },
  { code: "TN", name: "Tamil Nadu", kind: "state" },
  { code: "TS", name: "Telangana", kind: "state" },
  { code: "TR", name: "Tripura", kind: "state" },
  { code: "UP", name: "Uttar Pradesh", kind: "state" },
  { code: "UK", name: "Uttarakhand", kind: "state" },
  { code: "WB", name: "West Bengal", kind: "state" },
] as const satisfies readonly IndianSubdivision[]

export const INDIA_UNION_TERRITORIES = [
  { code: "AN", name: "Andaman and Nicobar Islands", kind: "ut" },
  { code: "CH", name: "Chandigarh", kind: "ut" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "ut" },
  { code: "DL", name: "Delhi (NCT)", kind: "ut" },
  { code: "JK", name: "Jammu and Kashmir", kind: "ut" },
  { code: "LA", name: "Ladakh", kind: "ut" },
  { code: "LD", name: "Lakshadweep", kind: "ut" },
  { code: "PY", name: "Puducherry", kind: "ut" },
] as const satisfies readonly IndianSubdivision[]

export const INDIA_SUBDIVISIONS = [
  ...INDIA_STATES,
  ...INDIA_UNION_TERRITORIES,
].toSorted((a, b) => a.name.localeCompare(b.name))

export function getIndianSubdivision(code: string | null | undefined) {
  if (!code) return null
  return INDIA_SUBDIVISIONS.find((s) => s.code === code) ?? null
}
