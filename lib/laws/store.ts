import "server-only"

import dataset from "@/data/laws/maharashtra.json"

import { lawsDatasetSchema } from "@/lib/laws/schema"
import type { Law } from "@/lib/laws/types"

let cached: Law[] | null = null

export function getAllLaws(): Law[] {
  if (cached) return cached

  const parsed = lawsDatasetSchema.safeParse(dataset)
  if (!parsed.success) {
    // Make this fail loudly in dev so invalid JSON doesn't ship silently.
    console.error(parsed.error.flatten())
    throw new Error("Invalid laws dataset. Fix data/laws/*.json")
  }

  cached = parsed.data
  return cached
}

export function getLawById(id: string): Law | null {
  const laws = getAllLaws()
  return laws.find((l) => l.id === id) ?? null
}
