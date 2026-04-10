type AnyRecord = Record<string, unknown>

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function deepMerge<TBase extends AnyRecord, TOverride extends AnyRecord>(
  base: TBase,
  override: TOverride
): TBase & TOverride {
  const out: AnyRecord = { ...base }

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = out[key]

    if (isRecord(baseValue) && isRecord(overrideValue)) {
      out[key] = deepMerge(baseValue, overrideValue)
      continue
    }

    out[key] = overrideValue
  }

  return out as TBase & TOverride
}
