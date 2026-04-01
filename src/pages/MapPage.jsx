import MapView from '../components/Map'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { selectAllProjects, fetchProjects, selectProjectsLoading, selectProjectsError } from '../store/projectsSlice'
import {
  fetchMunicipalityCollaborations,
  selectAllMunicipalityCollaborations
} from '../store/municipalityCollaborationSlice'
import ProjectsTable from '../components/ProjectsTable'
import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { participatingMunicipalityTowns } from '../utils/geographicFocus'



const projectDedupeKey = (project) => {
  if (!project) return ''
  const r = project.recordId != null ? String(project.recordId).trim() : ''
  if (r) return r
  return project.id != null ? String(project.id).trim() : ''
}

const MapPage = () => {

  const parseYearFromProject = (project) => {
    if (project?.parsedYear != null) return project.parsedYear
    if (!project?.projectYear) return null
    const y = parseInt(String(project.projectYear).trim(), 10)
    if (Number.isNaN(y) || y <= 1900 || y > new Date().getFullYear() + 10) return null
    return y
  }

  const {
    mapFilterLabel,
    mapFilterSource,
    mapOutlineTownNames,
    applyMapFilterSelection,
    viewMode,
    setViewMode,
    selectedProject,
    setSelectedProject,
    isSidebarCollapsed,
    mapFilteredProjects,
    suppressMapChoropleth,
  } = useOutletContext()
  const dispatch = useDispatch()
  const allProjects = useSelector(selectAllProjects)
  const municipalityCollaborations = useSelector(selectAllMunicipalityCollaborations)
  const loading = useSelector(selectProjectsLoading)
  const error = useSelector(selectProjectsError)
  const [popupVisible, setPopupVisible] = useState(false)
  const [projectPopupVisible, setProjectPopupVisible] = useState(false)
  const [cityNotFoundAlertVisible, setCityNotFoundAlertVisible] = useState(false)
  const [cityNotFoundName, setCityNotFoundName] = useState('')
  const [cityNotFoundTimeoutId, setCityNotFoundTimeoutId] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [projectPopupPosition, setProjectPopupPosition] = useState({ x: 0, y: 0 })
  const [isMinimized, setIsMinimized] = useState(false)
  const [isProjectMinimized, setIsProjectMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProjectDragging, setIsProjectDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Ref to track if alert was manually closed
  const alertManuallyClosed = useRef(false)
  

  // Fetch projects if not already loaded
  useEffect(() => {
    if (allProjects.length === 0) {
      dispatch(fetchProjects())
    }
  }, [dispatch, allProjects.length])

  useEffect(() => {
    if (municipalityCollaborations.length === 0) {
      dispatch(fetchMunicipalityCollaborations())
    }
  }, [dispatch, municipalityCollaborations.length])

  // Keep map in municipality mode since alternate view-mode controls are removed.
  useEffect(() => {
    if (viewMode !== 'city') {
      setViewMode('city')
    }
  }, [viewMode, setViewMode])


  // Show popup when city is selected (only in city view mode)
  useEffect(() => {
    // Keep municipality project list popup hidden for explicit source-driven selections
    // (dropdown/map). Tooltip + left panel are used instead.
    if (mapFilterLabel && viewMode === 'city' && !mapFilterSource) {
      setPopupVisible(true)
      setIsMinimized(true) // Start collapsed by default
      // Position popup at bottom of screen, moved right and up
      setPopupPosition({
        x: 300, // 300px from left (moved further right)
        y: window.innerHeight - (window.innerHeight * 0.6) - 150 // 60vh from bottom, moved up by 150px
      })
    } else {
      setPopupVisible(false)
    }
  }, [mapFilterLabel, viewMode, mapFilterSource])


  /** GeoJSON town names (or raw labels resolved in Map) for filter-driven outlines. */
  const filterOutlineTownNames = mapOutlineTownNames || []

  // Show project popup when project is selected (placed high enough to sit above map tooltips, z-[1100])
  useEffect(() => {
    if (selectedProject) {
      setProjectPopupVisible(true)
      setIsProjectMinimized(false)
      setProjectPopupPosition({
        x: 400,
        y: Math.max(72, Math.round(window.innerHeight * 0.12)),
      })
    } else {
      setProjectPopupVisible(false)
    }
  }, [selectedProject])

  // Fuzzy filter projects by city
  const cityProjects = useMemo(() => {
    if (!mapFilterLabel) return []
    const city = mapFilterLabel.toLowerCase()
    return allProjects.filter((p) => {
      const towns = participatingMunicipalityTowns(p.allParticipatingMunicipalities)
      return towns.some((t) => {
        const tl = t.toLowerCase()
        return tl.includes(city) || city.includes(tl)
      })
    })
  }, [mapFilterLabel, allProjects])

  const currentProjects = cityProjects

  // Same filtered set as the map sidebar (all projects when sidebar has not synced yet).
  const projectsForMap = mapFilteredProjects ?? allProjects

  // Handle project selection for highlighting
  const handleProjectSelect = (project) => {
    setSelectedProject(project)
  }

  const { choroplethCountsByTown, municipalityHoverProjectsByTown } = useMemo(() => {
    const attribution = new Map()

    const addProjectToTown = (townLabel, project) => {
      const pk = projectDedupeKey(project)
      if (!pk || !townLabel) return
      const trimmed = String(townLabel).trim()
      if (!trimmed) return
      const canon = trimmed.toUpperCase()
      if (!canon) return
      if (!attribution.has(canon)) attribution.set(canon, new Set())
      attribution.get(canon).add(pk)
    }

    // Choropleth + tooltips: only projects slice "All Participating Municipalities"
    // (string or string[]; comma/semicolon splits; ['N/A'] yields no towns).
    projectsForMap.forEach((project) => {
      const pk = projectDedupeKey(project)
      if (!pk) return
      participatingMunicipalityTowns(project.allParticipatingMunicipalities).forEach((town) => {
        addProjectToTown(town, project)
      })
    })

    const counts = {}
    attribution.forEach((set, canon) => {
      const c = set.size
      counts[canon] = c
      counts[String(canon).toUpperCase()] = c
    })

    const projectByKey = new Map()
    projectsForMap.forEach((p) => {
      const pk = projectDedupeKey(p)
      if (pk) projectByKey.set(pk, p)
    })

    const sortDecorated = (a, b) => {
      if (a.year == null && b.year == null) {
        return (a.project.name || '').localeCompare(b.project.name || '', undefined, {
          sensitivity: 'base',
        })
      }
      if (a.year == null) return 1
      if (b.year == null) return -1
      if (b.year !== a.year) return b.year - a.year
      return (a.project.name || '').localeCompare(b.project.name || '', undefined, {
        sensitivity: 'base',
      })
    }

    const municipalityHoverProjectsByTown = {}
    attribution.forEach((set, canon) => {
      const decorated = Array.from(set)
        .map((pk) => {
          const project = projectByKey.get(pk)
          if (!project) return null
          return { project, year: parseYearFromProject(project) }
        })
        .filter(Boolean)

      decorated.sort(sortDecorated)

      const list = decorated.map(({ project, year }) => ({
        id: project.id,
        name: project.name || 'Unnamed Project',
        year,
        project,
      }))

      const upperKey = String(canon).toUpperCase()
      municipalityHoverProjectsByTown[upperKey] = list
      municipalityHoverProjectsByTown[canon] = list
    })

    return { choroplethCountsByTown: counts, municipalityHoverProjectsByTown }
  }, [projectsForMap])

  const handleHoverProjectClick = useCallback((project) => {
    if (!project) return
    setSelectedProject({ ...project })
  }, [setSelectedProject])

  // Handle city not found on map
  const handleCityNotFound = useCallback((cityName) => {
    // Clear any existing timeout
    if (cityNotFoundTimeoutId) {
      clearTimeout(cityNotFoundTimeoutId)
    }
    
    // Reset manual close flag
    alertManuallyClosed.current = false
    
    setCityNotFoundName(cityName)
    setCityNotFoundAlertVisible(true)
    
    // Auto-hide alert after 3 seconds
    const timeoutId = setTimeout(() => {
      // Only hide if not manually closed
      if (!alertManuallyClosed.current) {
        setCityNotFoundAlertVisible(false)
        setCityNotFoundName('')
      }
      setCityNotFoundTimeoutId(null)
    }, 3000)
    
    setCityNotFoundTimeoutId(timeoutId)
  }, [cityNotFoundTimeoutId])

  // Handle manual close of city not found alert
  const handleCloseCityNotFoundAlert = useCallback(() => {
    // Set manual close flag
    alertManuallyClosed.current = true
    
    // Clear the timeout FIRST
    if (cityNotFoundTimeoutId) {
      clearTimeout(cityNotFoundTimeoutId)
      setCityNotFoundTimeoutId(null)
    }
    
    // Set both states in one go to prevent conflicts
    setCityNotFoundAlertVisible(false)
    setCityNotFoundName('')
  }, [cityNotFoundTimeoutId])

  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.popup-header')) {
      setIsDragging(true)
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // Handle mouse down for project popup dragging
  const handleProjectMouseDown = (e) => {
    if (e.target.closest('.popup-header')) {
      setIsProjectDragging(true)
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // Handle mouse move for dragging
  const handleMouseMove = (e) => {
    if (isDragging && !isMinimized) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Keep popup within viewport bounds
      const maxX = window.innerWidth - 1200 // popup width
      const maxY = window.innerHeight - (window.innerHeight * 0.5) // 50% of viewport height
      
      setPopupPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }
  }

  // Handle mouse move for project popup dragging
  const handleProjectMouseMove = (e) => {
    if (isProjectDragging) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Keep project popup within viewport bounds
      const maxX = window.innerWidth - 1000 // project popup width
      const maxY = window.innerHeight - 300 // project popup height
      
      setProjectPopupPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }
  }

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle mouse up for project popup dragging
  const handleProjectMouseUp = () => {
    setIsProjectDragging(false)
  }

  // Handle minimize
  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  // Handle project popup minimize
  const handleProjectMinimize = () => {
    setIsProjectMinimized(!isProjectMinimized)
  }

  // Handle close
  const handleClose = () => {
    setPopupVisible(false)
    applyMapFilterSelection(null, { towns: [] })
  }

  // Loading mask component
  const LoadingMask = () => (
    <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(209, 213, 219, 0.5)' }}>
      <div className="text-center bg-white bg-opacity-90 rounded-lg p-6 shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">Loading Map Data</p>
        <p className="text-sm text-gray-600">Please wait while we fetch your project information...</p>
      </div>
    </div>
  )

  // Error component
  const ErrorDisplay = () => (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => dispatch(fetchProjects())}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  // Debug effect to monitor alert state - removed to prevent infinite loops

  // Effect to trigger map resize when sidebar collapses/expands
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [isSidebarCollapsed]);

  // Effect to trigger map resize when view mode changes
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200)
  }, [viewMode])

  return (
    <div className="flex flex-col w-full h-full">
      {/* Loading Mask */}
      {loading && <LoadingMask />}
      
      {/* Error Display */}
      {error && <ErrorDisplay />}
      
      {/* Controls section removed: map now stays in Municipality mode */}

      {/* Map Container - Full Width */}
      <div 
        className="w-full flex-1 min-h-0 relative"
      >
        <MapView
          onMapTownClick={viewMode === 'city'
            ? ((townName) => {
                applyMapFilterSelection(townName, { source: 'map' })
              })
            : null}
          mapFilterLabel={mapFilterLabel}
          // Keep the current view when selecting a municipality (no zoom/pan on map click).
          shouldAutoZoomOnMapFilter={false}
          openTooltipForSidebarFilter={mapFilterSource === 'filter'}
          filterOutlineTownNames={filterOutlineTownNames}
          viewMode={viewMode}
          selectedProject={null}
          onCityNotFound={handleCityNotFound}
          onMunicipalityClick={null}
          choroplethData={null}
          selectedYear={null}
          isSidebarCollapsed={isSidebarCollapsed}
          municipalityHoverProjectsByTown={municipalityHoverProjectsByTown}
          onHoverProjectClick={handleHoverProjectClick}
          choroplethCountsByTown={
            suppressMapChoropleth ? null : choroplethCountsByTown
          }
          filteredMapProjectCount={projectsForMap.length}
          municipalityCollaborations={municipalityCollaborations}
        />
      </div>
      
      {/* Popup Window - Show in municipality mode */}
      {popupVisible && mapFilterLabel && viewMode === 'city' && (
        <div
          className={`fixed z-50 flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 ${
            isMinimized 
              ? 'w-80 h-16 bottom-4 right-4' 
              : 'w-[1200px] h-[250px]'
          }`}
          style={{
            left: isMinimized ? 'auto' : `${popupPosition.x}px`,
            top: isMinimized ? 'auto' : `${popupPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Header */}
          <div className={`popup-header flex items-center justify-between border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-grab ${
            isMinimized ? 'p-2' : 'p-4'
          }`}>
            <h2 className={`font-semibold text-gray-900 truncate ${
              isMinimized ? 'text-sm' : 'text-lg'
            }`}>
              {`Projects in ${mapFilterLabel}`}
            </h2>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                <span className="text-gray-600 text-sm">
                  {isMinimized ? "□" : "−"}
                </span>
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <span className="text-gray-600 text-sm">×</span>
              </button>
            </div>
          </div>
          
          {/* Content */}
          {!isMinimized && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <ProjectsTable
                variant="embedded"
                projects={currentProjects}
                onProjectSelect={handleProjectSelect}
                selectedProject={selectedProject}
                disableProjectSelection={viewMode === 'city'}
              />
            </div>
          )}
        </div>
      )}

      {/* Project Details Popup */}
      {projectPopupVisible && selectedProject && (
        <>
          {/* Non-blocking popup container (no full-screen mask) */}
          {!isProjectMinimized && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center pointer-events-none">
              <div
                className="pointer-events-auto bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col w-[1000px] h-[460px]"
                style={{
                  cursor: isProjectDragging ? 'grabbing' : 'default',
                  left: `${projectPopupPosition.x}px`,
                  top: `${projectPopupPosition.y}px`
                }}
                onMouseDown={handleProjectMouseDown}
                onMouseMove={handleProjectMouseMove}
                onMouseUp={handleProjectMouseUp}
                onMouseLeave={handleProjectMouseUp}
              >
                {/* Header */}
                <div className="popup-header flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-grab flex-shrink-0 p-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 break-words leading-tight w-full max-w-xs text-sm">
                      {selectedProject.name || 'Unnamed Project'}
                    </h2>
                    {selectedProject.airtableLink && (
                      <a
                        href={selectedProject.airtableLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View details in Airtable
                        <i className="fas fa-external-link-alt text-[10px] opacity-80" aria-hidden />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={handleProjectMinimize}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Minimize"
                    >
                      <span className="text-gray-600 text-sm">−</span>
                    </button>
                    <button
                      onClick={() => {
                        setProjectPopupVisible(false)
                        setSelectedProject(null)
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Close"
                    >
                      <span className="text-gray-600 text-sm">×</span>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="space-y-4">
                    <div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Lead Department:</span>
                          <p className="text-gray-900 break-words">{selectedProject.leadDepartment || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Project Year:</span>
                          <p className="text-gray-900 break-words">{selectedProject.projectYear || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Start Date:</span>
                          <p className="text-gray-900 break-words">
                            {selectedProject.startDate
                              ? new Date(selectedProject.startDate).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">End Date:</span>
                          <p className="text-gray-900 break-words">
                            {selectedProject.actualCompletionDate
                              ? new Date(selectedProject.actualCompletionDate).toLocaleDateString()
                              : selectedProject.anticipatedEndDate
                                ? new Date(selectedProject.anticipatedEndDate).toLocaleDateString()
                                : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Project Manager(s):</span>
                          <p className="text-gray-900 break-words">{selectedProject.projectManager || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <p className="text-gray-900 break-words">{selectedProject.projectStatus || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Project Description:</span>
                          <p className="text-gray-900 break-words">{selectedProject.projectDescription || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Project Budget:</span>
                          <p className="text-gray-900 break-words">
                            {selectedProject.totalProjectBudget != null &&
                            selectedProject.totalProjectBudget !== '' &&
                            Number.isFinite(Number(selectedProject.totalProjectBudget))
                              ? `$${Number(selectedProject.totalProjectBudget).toLocaleString()}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Internal Collaborators:</span>
                          {(() => {
                            const raw = selectedProject.internalCollaborators
                            const list = Array.isArray(raw)
                              ? raw.map((v) => String(v).trim()).filter(Boolean)
                              : typeof raw === 'string'
                                ? raw.split(',').map((s) => s.trim()).filter(Boolean)
                                : []
                            return list.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {list.map((name, idx) => (
                                  <span
                                    key={`${name}-${idx}`}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">N/A</p>
                            )
                          })()}
                        </div>
                        <div>
                          <span className="text-gray-600">Project Type:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedProject.projectType ? (
                              (Array.isArray(selectedProject.projectType)
                                ? selectedProject.projectType
                                : String(selectedProject.projectType).split(',')
                              )
                                .map(type => String(type).trim())
                                .filter(type => type.length > 0)
                                .map((type, index) => (
                                  <span
                                    key={`${type}-${index}`}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {type}
                                  </span>
                                ))
                            ) : (
                              <span className="text-gray-500 text-sm">N/A</span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </div>

                    {selectedProject.stakeholders && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Stakeholders</h3>
                        <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedProject.stakeholders}</p>
                      </div>
                    )}
                    
                    {selectedProject.attachmentUrls && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Attachments</h3>
                        <div className="space-y-2">
                          {selectedProject.attachmentUrls.split('\n').map((attachment, index) => {
                            if (!attachment.trim()) return null
                            
                            const colonIndex = attachment.indexOf(': ')
                            if (colonIndex === -1) return null
                            
                            const filename = attachment.substring(0, colonIndex).trim()
                            const url = attachment.substring(colonIndex + 2).trim()
                            
                            return (
                              <div key={index} className="flex items-center space-x-2">
                                <i className="fas fa-paperclip text-blue-600 text-sm"></i>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                                  title={filename}
                                >
                                  {filename}
                                </a>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Minimized popup - positioned in corner without blocking interactions */}
          {isProjectMinimized && (
            <div className="fixed bottom-4 right-4 z-[1100]">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col w-80 h-16">
                {/* Header */}
                <div className="popup-header flex items-center justify-between border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-grab flex-shrink-0 p-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 break-words leading-tight w-full max-w-xs text-xs">
                      {selectedProject.name || 'Unnamed Project'}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={handleProjectMinimize}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Maximize"
                    >
                      <span className="text-gray-600 text-sm">□</span>
                    </button>
                    <button
                      onClick={() => {
                        setProjectPopupVisible(false)
                        setSelectedProject(null)
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Close"
                    >
                      <span className="text-gray-600 text-sm">×</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      

      {/* City Not Found Alert */}
      {cityNotFoundAlertVisible && (
        <div 
          className="fixed bottom-20 right-4 z-[9999] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseCityNotFoundAlert();
            }
          }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Sorry, we cannot find "{cityNotFoundName}" on the map.
              </p>
              <p className="text-xs text-red-500">Click anywhere to close</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseCityNotFoundAlert();
                }}
                className="text-red-400 hover:text-red-600 cursor-pointer p-1 bg-red-200 rounded hover:bg-red-300 border border-red-300"
                type="button"
                style={{ minWidth: '24px', minHeight: '24px' }}
              >
                <span className="text-lg font-bold">×</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MapPage