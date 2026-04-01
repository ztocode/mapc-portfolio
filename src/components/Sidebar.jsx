import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectAllProjects } from '../store/projectsSlice'
import { normalizeLeadDepartments } from '../utils/departmentUtils'
import ProjectsTable from './ProjectsTable'
import YearRangeSlider from './YearRangeSlider'
import {
  fetchMunicipalityCollaborations,
  selectAllMunicipalityCollaborations
} from '../store/municipalityCollaborationSlice'
import {
  normalizeCollaborationMunisField,
  participatingMunicipalityTowns
} from '../utils/geographicFocus'
import {
  canonicalCodesForSubregionSelection,
  collectSubregionDropdownLabelsFromProjects,
  mapcSubRegionCodesUpperFromRaw,
  mapcSubRegionFieldCodesUpper,
  projectMatchesSubregionSelection
} from '../utils/mapcSubRegions'

/** Compact map sidebar dropdown: short height, MAPC blue focus */
const compactLocationSelectClass =
  'h-8 w-full appearance-none rounded-lg border border-gray-200 bg-white py-0 pl-2.5 pr-7 text-xs font-medium leading-8 text-gray-800 shadow-sm transition-colors hover:border-gray-300 focus:border-[#2862a0] focus:outline-none focus:ring-2 focus:ring-[#2862a0]/20'

const toBoolean = (value) => {
  return value === true ? true : false
}

const Sidebar = ({ 
  isCollapsed = false, 
  onToggle, 
  currentPage = 'dashboard', 
  onMapFilterChange = null,
  viewMode = 'city',
  onProjectSelect = null,
  selectedProject = null,
  onFilteredProjectsForMapChange = null,
  onSubregionChoroplethSuppressedChange = null,
}) => {
  // Don't render sidebar for dashboard page or year view mode
  if (currentPage === 'dashboard') {
    return null
  }

  const dispatch = useDispatch()
  const allProjects = useSelector(selectAllProjects)
  const municipalityCollaborationData = useSelector(selectAllMunicipalityCollaborations)

  const [primaryType, setPrimaryType] = useState('municipality')
  const [selectedMunicipality, setSelectedMunicipality] = useState('')
  const [selectedSubregion, setSelectedSubregion] = useState('')
  const [yearRange, setYearRange] = useState({ start: null, end: null })
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilteredProjectsTable, setShowFilteredProjectsTable] = useState(false)

  const projectsWithParsedMeta = useMemo(() => {
    return allProjects.map((project) => {
      const cities = Array.from(
        new Set(participatingMunicipalityTowns(project.allParticipatingMunicipalities))
      )
      const citySetUpper = new Set(cities.map((c) => c.toUpperCase()))
      const departments = normalizeLeadDepartments(project.leadDepartment)

      let parsedYear = null
      if (project.projectYear) {
        const year = parseInt(String(project.projectYear).trim(), 10)
        if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear() + 10) {
          parsedYear = year
        }
      }

      return {
        ...project,
        normalizedCities: cities,
        normalizedCitySetUpper: citySetUpper,
        normalizedDepartments: departments,
        parsedYear,
        normalizedMapcSubRegionCodes: mapcSubRegionCodesUpperFromRaw(project.mapcSubRegions)
      }
    })
  }, [allProjects])

  /** Town names to outline on the map: Municipalities table row with IsSubregion + `munis`, else projects. */
  const getSubregionHighlightTownNames = useCallback(
    (label) => {
      if (!label || !String(label).trim()) return []
      // 
      const needCodes = canonicalCodesForSubregionSelection(label)
      const labelUpper = String(label).trim().toUpperCase()
      for (const row of municipalityCollaborationData) {
        if (!toBoolean(row?.isSubregion)) continue

        const muniLabel = typeof row?.muni === 'string' ? row.muni.trim() : ''
        const muniUpper = muniLabel.toUpperCase()
        const rowCodes = mapcSubRegionFieldCodesUpper(row?.mapcSubRegion)
        let codeMatch = false
        for (const c of needCodes) {
          if (rowCodes.has(c)) {
            codeMatch = true
            break
          }
        }
        const nameMatch = muniLabel && muniUpper === labelUpper
        const looseMuniMatch =
          muniLabel &&
          labelUpper.length >= 4 &&
          muniUpper.length >= 4 &&
          (muniUpper.includes(labelUpper) || labelUpper.includes(muniUpper))

        if (!nameMatch && !codeMatch && !looseMuniMatch) continue

        const unique = normalizeCollaborationMunisField(row?.munis)
        if (unique.length > 0) return unique
      }

      const fromProjects = new Set()
      projectsWithParsedMeta.forEach((p) => {
        if (!projectMatchesSubregionSelection(p, label)) return
        participatingMunicipalityTowns(p.allParticipatingMunicipalities).forEach(
          (t) => {
            const s = String(t).trim()
            if (s) fromProjects.add(s)
          }
        )
      })
      return Array.from(fromProjects)
    },
    [municipalityCollaborationData, projectsWithParsedMeta]
  )

  useEffect(() => {
    dispatch(fetchMunicipalityCollaborations())
  }, [dispatch])

  const municipalityOptionsFromCollaborationSlice = useMemo(() => {
    const municipalities = new Set()

    municipalityCollaborationData.forEach((row) => {
      if (!toBoolean(row?.isMuni)) return

      const muniName = row?.muni?.trim()
      if (muniName) municipalities.add(muniName)
    })

    return Array.from(municipalities).sort((a, b) => a.localeCompare(b))
  }, [municipalityCollaborationData])

  const municipalityOptions = useMemo(() => {
    const ensureSelectedValue = (options) => {
      if (!selectedMunicipality) return options
      if (options.includes(selectedMunicipality)) return options
      return [selectedMunicipality, ...options]
    }

    if (municipalityOptionsFromCollaborationSlice.length > 0) {
      return ensureSelectedValue(municipalityOptionsFromCollaborationSlice)
    }

    // Fallback to project-derived municipalities while collaboration data is loading.
    const municipalities = new Set()
    projectsWithParsedMeta.forEach((project) => {
      project.normalizedCities.forEach((city) => municipalities.add(city))
    })
    const fallbackOptions = Array.from(municipalities).sort((a, b) => a.localeCompare(b))
    return ensureSelectedValue(fallbackOptions)
  }, [municipalityOptionsFromCollaborationSlice, projectsWithParsedMeta, selectedMunicipality])

  const subregionOptionsFromProjects = useMemo(
    () => collectSubregionDropdownLabelsFromProjects(allProjects),
    [allProjects]
  )

  const subregionOptions = useMemo(() => {
    const ensureSelectedValue = (options) => {
      if (!selectedSubregion) return options
      if (options.includes(selectedSubregion)) return options
      return [selectedSubregion, ...options]
    }

    return ensureSelectedValue(subregionOptionsFromProjects)
  }, [subregionOptionsFromProjects, selectedSubregion])

  const yearOptions = useMemo(() => {
    const years = new Set()
    projectsWithParsedMeta.forEach((project) => {
      if (project.parsedYear) years.add(project.parsedYear)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [projectsWithParsedMeta])

  const yearBounds = useMemo(() => {
    if (yearOptions.length === 0) return { min: null, max: null }
    return {
      min: Math.min(...yearOptions),
      max: Math.max(...yearOptions)
    }
  }, [yearOptions])

  useEffect(() => {
    if (yearBounds.min == null || yearBounds.max == null) {
      setYearRange({ start: null, end: null })
      return
    }
    setYearRange((prev) => {
      const prevStart = prev.start == null ? yearBounds.min : prev.start
      const prevEnd = prev.end == null ? yearBounds.max : prev.end
      const nextStart = Math.max(yearBounds.min, Math.min(prevStart, yearBounds.max))
      const nextEnd = Math.max(yearBounds.min, Math.min(prevEnd, yearBounds.max))
      return {
        start: Math.min(nextStart, nextEnd),
        end: Math.max(nextStart, nextEnd)
      }
    })
  }, [yearBounds.min, yearBounds.max])

  const departmentOptions = useMemo(() => {
    // Source directly from projectsSlice mapping:
    // leadDepartment <- "Name (from Lead Department/Team)"
    const departments = new Set()
    allProjects.forEach((project) => {
      const deptList = normalizeLeadDepartments(project.leadDepartment)
      deptList.forEach((dept) => departments.add(dept))
    })
    return Array.from(departments).sort((a, b) => a.localeCompare(b))
  }, [allProjects])

  const selectedPrimaryValue = primaryType === 'municipality' ? selectedMunicipality : selectedSubregion

  // Keep municipality matching logic aligned with tooltip:
  // municipalityCollaboration.projectsIDlist -> project.recordId / project.id.
  const selectedMunicipalityLinkedProjectIds = useMemo(() => {
    if (!selectedMunicipality) return new Set()

    const municipalityRow = municipalityCollaborationData.find((row) => {
      const muniName = typeof row?.muni === 'string' ? row.muni.trim() : ''
      return muniName.toLowerCase() === selectedMunicipality.toLowerCase()
    })

    const linkedIds = Array.isArray(municipalityRow?.projectsIDlist)
      ? municipalityRow.projectsIDlist
      : []

    return new Set(
      linkedIds
        .map((id) => String(id).trim())
        .filter(Boolean)
    )
  }, [municipalityCollaborationData, selectedMunicipality])

  const filteredProjects = useMemo(() => {
    return projectsWithParsedMeta
      .filter((project) => {
        if (!selectedPrimaryValue) return true
        if (primaryType === 'municipality') {
          // Same as tooltip: include only projects linked from collaboration table.
          if (selectedMunicipalityLinkedProjectIds.size > 0) {
            const projectRecordId = project.recordId != null ? String(project.recordId).trim() : ''
            const projectAirtableId = project.id != null ? String(project.id).trim() : ''
            return (
              (projectRecordId && selectedMunicipalityLinkedProjectIds.has(projectRecordId)) ||
              (projectAirtableId && selectedMunicipalityLinkedProjectIds.has(projectAirtableId))
            )
          }
          return false
        }
        if (primaryType === 'subregion') {
          return projectMatchesSubregionSelection(project, selectedSubregion)
        }
        return true
      })
      .filter((project) => {
        if (yearRange.start == null || yearRange.end == null) return true
        return project.parsedYear && project.parsedYear >= yearRange.start && project.parsedYear <= yearRange.end
      })
      .filter((project) => {
        if (!selectedDepartment) return true
        return project.normalizedDepartments.includes(selectedDepartment)
      })
      .filter((project) => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase().trim()
        const projectName = (project.name || '').toLowerCase()
        return projectName.includes(q)
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [
    projectsWithParsedMeta,
    primaryType,
    selectedMunicipality,
    selectedMunicipalityLinkedProjectIds,
    selectedSubregion,
    yearRange,
    selectedDepartment,
    searchTerm,
    selectedPrimaryValue
  ])

  useEffect(() => {
    if (!onFilteredProjectsForMapChange) return
    onFilteredProjectsForMapChange(filteredProjects)
  }, [filteredProjects, onFilteredProjectsForMapChange])

  const handleProjectClick = (project) => {
    if (onProjectSelect) onProjectSelect(project)
  }

  const handlePrimaryTypeChange = (nextType) => {
    setPrimaryType(nextType)
    setSelectedMunicipality('')
    setSelectedSubregion('')
    setShowFilteredProjectsTable(false)
    if (onProjectSelect) onProjectSelect(null)
    if (onMapFilterChange) onMapFilterChange(null, { towns: [] })
  }

  const handleMunicipalityChange = (municipality) => {
    setSelectedMunicipality(municipality)
    if (onMapFilterChange) onMapFilterChange(municipality || null, { source: 'filter', towns: [] })
  }

  const handleSubregionChange = (subregion) => {
    setSelectedSubregion(subregion)
  }

  useEffect(() => {
    if (!onMapFilterChange) return
    if (primaryType !== 'subregion') return
    const towns = getSubregionHighlightTownNames(selectedSubregion)
    onMapFilterChange(selectedSubregion || null, { source: 'filter', towns })
  }, [
    primaryType,
    selectedSubregion,
    getSubregionHighlightTownNames,
    onMapFilterChange,
  ])

  useEffect(() => {
    if (!onSubregionChoroplethSuppressedChange) return
    onSubregionChoroplethSuppressedChange(
      primaryType === 'subregion' && Boolean(selectedSubregion)
    )
  }, [primaryType, selectedSubregion, onSubregionChoroplethSuppressedChange])

  const handleYearStartChange = (value) => {
    const nextStart = parseInt(value, 10)
    if (isNaN(nextStart)) return
    setYearRange((prev) => {
      const end = prev.end == null ? nextStart : prev.end
      return { start: Math.min(nextStart, end), end: Math.max(nextStart, end) }
    })
  }

  const handleYearEndChange = (value) => {
    const nextEnd = parseInt(value, 10)
    if (isNaN(nextEnd)) return
    setYearRange((prev) => {
      const start = prev.start == null ? nextEnd : prev.start
      return { start: Math.min(start, nextEnd), end: Math.max(start, nextEnd) }
    })
  }

  const currentYearStart = yearRange.start ?? yearBounds.min
  const currentYearEnd = yearRange.end ?? yearBounds.max

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    }
  }

  return (
    <aside className={`sidebar shadow-sm border-r border-gray-200 bg-white flex-shrink-0 h-full overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {isCollapsed ? (
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 p-2">
            <button
              type="button"
              onClick={handleToggle}
              className="flex h-8 w-full cursor-pointer items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Expand sidebar"
            >
              <span className="text-sm">→</span>
            </button>
          </div>
        </div>
      ) : (
        // Expanded view
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Project Filters</h2>
              <button
                onClick={handleToggle}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <span className="text-lg">←</span>
              </button>
            </div>
          </div>

          {/* Filters + Project List */}
          <div className="flex-1 p-3">
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Filter Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrimaryTypeChange('municipality')}
                    className={`px-2 py-1 text-xs rounded border ${primaryType === 'municipality' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700'}`}
                  >
                    Municipality
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrimaryTypeChange('subregion')}
                    className={`px-2 py-1 text-xs rounded border ${primaryType === 'subregion' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700'}`}
                  >
                    Subregion
                  </button>
                </div>
              </div>

              {primaryType === 'municipality' ? (
                <div>
                  <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                    Municipality
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      className={compactLocationSelectClass}
                      aria-label="Select municipality"
                    >
                      <option value="">Select…</option>
                      {municipalityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    >
                      <i className="fas fa-chevron-down text-[10px]" />
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                    Subregion
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubregion}
                      onChange={(e) => handleSubregionChange(e.target.value)}
                      className={compactLocationSelectClass}
                      aria-label="Select subregion"
                    >
                      <option value="">Select…</option>
                      {subregionOptions.map((subregion) => (
                        <option key={subregion} value={subregion}>
                          {subregion}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    >
                      <i className="fas fa-chevron-down text-[10px]" />
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Year Range</label>
                {yearBounds.min != null && yearBounds.max != null ? (
                  <YearRangeSlider
                    minYear={yearBounds.min}
                    maxYear={yearBounds.max}
                    startYear={currentYearStart}
                    endYear={currentYearEnd}
                    onStartChange={handleYearStartChange}
                    onEndChange={handleYearEndChange}
                  />
                ) : (
                  <p className="text-xs text-gray-400">No years available</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">MAPC Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search within filtered projects */}
            <div className="mb-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white text-gray-400">
                  <i className="fas fa-search text-sm"></i>
                </span>
                <input
                  type="search"
                  placeholder="Search project name ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-1">
                  {filteredProjects.length} projects found
                </p>
              )}
            </div>
            
            <button
              type="button"
              className="mb-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              onClick={() => setShowFilteredProjectsTable(true)}
            >
              View filtered projects in table view
            </button>
            <p className="mb-2 text-xs text-gray-600">
              {filteredProjects.length} filtered project{filteredProjects.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  title="Click to view project details"
                  aria-label={`Click to view project details: ${project.name || 'Unnamed Project'}`}
                  className={`group w-full text-left p-3.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedProject?.id === project.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0 px-1">
                      <p className="text-sm font-medium text-gray-900 break-words leading-tight transition-colors group-hover:text-blue-900">{project.name || 'Unnamed Project'}</p>
                      <p className="mt-1 text-xs text-gray-600 break-words leading-tight transition-colors group-hover:text-blue-800">
                        Year: {project.parsedYear || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 break-words leading-tight transition-colors group-hover:text-blue-800">
                        Lead Dept: {project.normalizedDepartments?.[0] || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 break-words leading-tight transition-colors group-hover:text-blue-700">
                        Click to view
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
      {showFilteredProjectsTable && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-800">Filtered Projects Table</h3>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                onClick={() => setShowFilteredProjectsTable(false)}
              >
                Close
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              <ProjectsTable
                variant="embedded"
                projects={filteredProjects}
                selectedProject={selectedProject}
                disableProjectSelection={false}
                showStartEndDates={false}
                onProjectSelect={(project) => {
                  if (onProjectSelect) onProjectSelect(project)
                }}
                detailsPopupMode="aboveTable"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar 