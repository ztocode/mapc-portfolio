const extractDeptStrings = (value) => {
  if (!value) return []

  // Expected shape: array of strings (usually one item).
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  return []
}

export const normalizeLeadDepartments = (leadDepartment) => {
  const list = extractDeptStrings(leadDepartment)
  // De-duplicate while keeping order.
  return Array.from(new Set(list))
}

