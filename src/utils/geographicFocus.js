/** Delimiters in Airtable text fields that list multiple municipalities. */
export const SPLIT_REGEX = /[,;|&]/

/**
 * Normalize a Geographic Focus / munis-style field to a list of town names.
 *
 * @returns {null|string[]}
 *   - `null` — field is missing (`null`/`undefined`) or not a string / string[]
 *   - `[]` — empty after trim (e.g. blank string or only separators)
 *   - `string[]` — trimmed, non-empty town names (strings only; no objects)
 */
export function normalizeGeographicFocusToCities(value) {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    return value
      .split(SPLIT_REGEX)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (Array.isArray(value)) {
    const out = []
    for (const item of value) {
      if (typeof item !== 'string') return null
      const parts = item
        .split(SPLIT_REGEX)
        .map((s) => s.trim())
        .filter(Boolean)
      out.push(...parts)
    }
    return out
  }

  return null
}

/**
 * `munis` on collaboration “subregion” rows: string, comma/semicolon-separated text,
 * or an array of strings (Airtable multiple select / lookup text). Values are coerced with
 * {@link String} so non-string array elements still parse.
 *
 * @returns {string[]} deduped town names (empty if missing or invalid).
 */
export function normalizeCollaborationMunisField(raw) {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) {
    const out = []
    for (const item of raw) {
      const s = String(item ?? '').trim()
      if (!s) continue
      for (const part of s.split(SPLIT_REGEX)) {
        const t = part.trim()
        if (t) out.push(t)
      }
    }
    return [...new Set(out)]
  }
  if (typeof raw === 'string') {
    return [...new Set(normalizeGeographicFocusToCities(raw) ?? [])]
  }
  return []
}

/** True for Airtable placeholders meaning “no municipalities listed”. */
export function isParticipatingMunicipalitySentinel(value) {
  const u = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
  return u === 'N/A' || u === 'NA' || u === 'NONE' || u === 'N A'
}

/**
 * Town names from “All Participating Municipalities”: same parsing as other Airtable
 * multi-value fields, minus N/A-style sentinels.
 *
 * @returns {string[]} always an array (empty if missing, invalid shape, or only N/A).
 */
export function participatingMunicipalityTowns(raw) {
  const list = normalizeGeographicFocusToCities(raw) ?? []
  return list
    .map((s) => String(s).trim())
    .filter((s) => s && !isParticipatingMunicipalitySentinel(s))
}
