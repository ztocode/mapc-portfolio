/** Split Airtable "MAPC Sub Regions Represented (Auto)" — comma-separated tokens. */
export const MAPC_SUBREGION_SPLIT = /,/

/**
 * Raw codes in Airtable → label shown in the subregion dropdown.
 * Keys are uppercase canonical codes.
 */
const CODE_TO_DROPDOWN_LABEL = {
  MWRC: 'MetroWest',
  SSC: 'South Shore Coalition',
}

/**
 * Dropdown label (exact string) → canonical code stored in Airtable.
 */
export const SUBREGION_DROPDOWN_TO_CODE = {
  MetroWest: 'MWRC',
  'South Shore Coalition': 'SSC',
}

/**
 * @param {unknown} raw
 * @returns {string[]} trimmed non-empty tokens (original casing preserved per token)
 */
export function parseMapcSubRegionsField(raw) {
  if (raw === null || raw === undefined) return []
  const s = typeof raw === 'string' ? raw : String(raw)
  return s
    .split(MAPC_SUBREGION_SPLIT)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function normalizeMapcSubregionCode(token) {
  return String(token ?? '')
    .trim()
    .toUpperCase()
}

/**
 * @param {unknown} raw Field value from project.mapcSubRegions
 * @returns {Set<string>} uppercase codes for matching
 */
export function mapcSubRegionCodesUpperFromRaw(raw) {
  const set = new Set()
  for (const t of parseMapcSubRegionsField(raw)) {
    const u = normalizeMapcSubregionCode(t)
    if (u) set.add(u)
    const labelMatch = Object.keys(SUBREGION_DROPDOWN_TO_CODE).find(
      (k) => k.localeCompare(String(t).trim(), undefined, { sensitivity: 'accent' }) === 0
    )
    if (labelMatch) {
      set.add(normalizeMapcSubregionCode(SUBREGION_DROPDOWN_TO_CODE[labelMatch]))
    }
  }
  return set
}

/**
 * Stable display label for one token: special cases MWRC/SSC, else trimmed original.
 */
export function dropdownLabelForSubregionToken(token) {
  const u = normalizeMapcSubregionCode(token)
  if (!u) return ''
  if (CODE_TO_DROPDOWN_LABEL[u]) return CODE_TO_DROPDOWN_LABEL[u]
  return String(token).trim()
}

/**
 * Unique sorted dropdown labels from all projects' `mapcSubRegions`.
 */
export function collectSubregionDropdownLabelsFromProjects(projects) {
  const byCanonical = new Map()

  for (const project of projects || []) {
    for (const t of parseMapcSubRegionsField(project?.mapcSubRegions)) {
      const u = normalizeMapcSubregionCode(t)
      if (!u) continue
      const label = dropdownLabelForSubregionToken(t)
      if (!label) continue
      if (!byCanonical.has(u)) byCanonical.set(u, label)
    }
  }

  return Array.from(new Set(byCanonical.values())).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
}

/**
 * Uppercase code(s) the selected dropdown label should match on projects.
 */
/** MAPC Sub Region field on collaboration rows (may be comma-separated). */
export function mapcSubRegionFieldCodesUpper(raw) {
  const set = new Set()
  for (const t of parseMapcSubRegionsField(raw)) {
    const u = normalizeMapcSubregionCode(t)
    if (u) set.add(u)
  }
  return set
}

export function canonicalCodesForSubregionSelection(selectedDropdownLabel) {
  if (!selectedDropdownLabel || !String(selectedDropdownLabel).trim()) {
    return new Set()
  }
  const label = String(selectedDropdownLabel).trim()
  const mapped = SUBREGION_DROPDOWN_TO_CODE[label]
  if (mapped) return new Set([normalizeMapcSubregionCode(mapped)])
  return new Set([normalizeMapcSubregionCode(label)])
}

/**
 * @returns {boolean}
 */
export function projectMatchesSubregionSelection(project, selectedDropdownLabel) {
  const need = canonicalCodesForSubregionSelection(selectedDropdownLabel)
  if (need.size === 0) return true
  const have = project.normalizedMapcSubRegionCodes
  if (!(have instanceof Set) || have.size === 0) return false
  for (const c of need) {
    if (have.has(c)) return true
  }
  return false
}
