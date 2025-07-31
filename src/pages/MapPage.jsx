import Map from '../components/Map'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { selectAllProjects, fetchProjects, selectProjectsLoading, selectProjectsError } from '../store/projectsSlice'
import ProjectsTable from '../components/ProjectsTable'
import { useMemo, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const MapPage = () => {
  const { 
    selectedCity, 
    setSelectedCity,
    viewMode,
    setViewMode,
    selectedGeographicCount,
    setSelectedGeographicCount,
    selectedProject,
    setSelectedProject,
    isSidebarCollapsed
  } = useOutletContext()
  const dispatch = useDispatch()
  const allProjects = useSelector(selectAllProjects)
  const loading = useSelector(selectProjectsLoading)
  const error = useSelector(selectProjectsError)
  const [popupVisible, setPopupVisible] = useState(false)
  const [projectPopupVisible, setProjectPopupVisible] = useState(false)
  const [cityModeProjectPopupVisible, setCityModeProjectPopupVisible] = useState(false)
  const [cityModeSelectedProject, setCityModeSelectedProject] = useState(null)
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

  // Fetch projects if not already loaded
  useEffect(() => {
    if (allProjects.length === 0) {
      dispatch(fetchProjects())
    }
  }, [dispatch, allProjects.length])

  // Show popup when city is selected (only in city view mode)
  useEffect(() => {
    if (selectedCity && viewMode === 'city') {
      setPopupVisible(true)
      setIsMinimized(true) // Start collapsed by default
      // Position popup at bottom of screen, moved right and up
      setPopupPosition({
        x: 300, // 300px from left (moved further right)
        y: window.innerHeight - (window.innerHeight * 0.6) - 150 // 60vh from bottom, moved up by 150px
      })
    }
  }, [selectedCity, viewMode])

  // Calculate geographic focus count for each project
  const projectsWithGeographicCount = useMemo(() => {
    return allProjects.map(project => {
      let count = 0
      if (project.geographicFocus && typeof project.geographicFocus === 'string') {
        // Split by common delimiters and count unique cities
        const cities = project.geographicFocus
          .split(/[,;|&]/)
          .map(city => city.trim())
          .filter(city => city.length > 0)
        count = new Set(cities).size // Count unique cities
      }
      return {
        ...project,
        geographicFocusCount: count
      }
    })
  }, [allProjects])

  // Filter projects by geographic focus count
  const geographicCountProjects = useMemo(() => {
    if (!selectedGeographicCount) return []
    
    return projectsWithGeographicCount.filter(project => {
      if (selectedGeographicCount === '3+') {
        return project.geographicFocusCount >= 3
      }
      return project.geographicFocusCount === selectedGeographicCount
    })
  }, [selectedGeographicCount, projectsWithGeographicCount])

  // Get cities from selected project for highlighting
  const highlightedCities = useMemo(() => {
    if (!selectedProject || !selectedProject.geographicFocus) return []
    
    // Check if geographic focus contains "State-Wide"
    if (selectedProject.geographicFocus.toLowerCase().includes('state-wide')) {
      return ['State-Wide']
    }
    
    const cities = selectedProject.geographicFocus
      .split(/[,;|&]/)
      .map(city => city.trim())
      .filter(city => city.length > 0)
    
    return cities
  }, [selectedProject])

  // Generate random colors for each city
  const cityColors = useMemo(() => {
    if (!highlightedCities || highlightedCities.length === 0) return {}
    
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b',
      '#10b981', '#6366f1', '#f43f5e', '#8b5a2b', '#4ade80', '#a855f7', '#06b6d4', '#f97316', '#84cc16', '#fbbf24',
      '#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635', '#fbbf24',
      '#fb7185', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264', '#fcd34d'
    ]
    
    const colorMap = {}
    highlightedCities.forEach((city, index) => {
      // Use modulo to cycle through colors, ensuring every city gets a color
      colorMap[city] = colors[index % colors.length]
    })
    
    return colorMap
  }, [highlightedCities])

  // Show project popup when project is selected
  useEffect(() => {
    if (selectedProject) {
      setProjectPopupVisible(true)
      setProjectPopupPosition({
        x: 400, // Moved more to the right
        y: window.innerHeight - 320 // Position at bottom of map view (300px height + 20px margin)
      })
    } else {
      setProjectPopupVisible(false)
    }
  }, [selectedProject])

  // Fuzzy filter projects by city
  const cityProjects = useMemo(() => {
    if (!selectedCity) return []
    const city = selectedCity.toLowerCase()
    return allProjects.filter(p =>
      typeof p.geographicFocus === 'string' &&
      p.geographicFocus.toLowerCase().includes(city)
    )
  }, [selectedCity, allProjects])

  // Get current projects based on view mode
  const currentProjects = useMemo(() => {
    if (viewMode === 'geographicCount') {
      return geographicCountProjects
    }
    return cityProjects
  }, [viewMode, geographicCountProjects, cityProjects])

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    setSelectedCity(null)
    setSelectedProject(null)
    
    if (mode === 'geographicCount') {
      // Default to 1 geographic focus when switching to this view
      setSelectedGeographicCount(1)
      setPopupVisible(false) // Don't show table popup in geographic count mode
    } else {
      setSelectedGeographicCount(null)
      setPopupVisible(false)
    }
  }

  // Handle geographic count selection
  const handleGeographicCountSelect = (count) => {
    setSelectedGeographicCount(count)
    setSelectedCity(null)
    setSelectedProject(null) // Clear selected project when changing filter
    setPopupVisible(false) // Don't show table popup in geographic count mode
  }

  // Handle project selection for highlighting
  const handleProjectSelect = (project) => {
    setSelectedProject(project)
  }

  // Handle city mode project click for center popup
  const handleCityModeProjectClick = (project) => {
    setCityModeSelectedProject(project)
    setCityModeProjectPopupVisible(true)
  }

  // Handle city not found on map
  const handleCityNotFound = (cityName) => {
    // Clear any existing timeout
    if (cityNotFoundTimeoutId) {
      clearTimeout(cityNotFoundTimeoutId)
    }
    
    setCityNotFoundName(cityName)
    setCityNotFoundAlertVisible(true)
    
    // Auto-hide alert after 3 seconds
    const timeoutId = setTimeout(() => {
      setCityNotFoundAlertVisible(false)
      setCityNotFoundName('')
      setCityNotFoundTimeoutId(null)
    }, 3000)
    
    setCityNotFoundTimeoutId(timeoutId)
  }

  // Handle manual close of city not found alert
  const handleCloseCityNotFoundAlert = () => {
    // Clear the timeout
    if (cityNotFoundTimeoutId) {
      clearTimeout(cityNotFoundTimeoutId)
      setCityNotFoundTimeoutId(null)
    }
    
    setCityNotFoundAlertVisible(false)
    setCityNotFoundName('')
  }

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
    setSelectedCity(null)
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

  return (
    <div className="flex flex-col w-full h-full p-6">
      {/* Loading Mask */}
      {loading && <LoadingMask />}
      
      {/* Error Display */}
      {error && <ErrorDisplay />}
      
      {/* View Mode Toggle */}
      <div className="mb-4">
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => handleViewModeChange('city')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'city'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            View by City
          </button>
          <button
            onClick={() => handleViewModeChange('geographicCount')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'geographicCount'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            View by Geographic Focus Count
          </button>
        </div>
      </div>

      {/* Geographic Count Filter */}
      {viewMode === 'geographicCount' && (
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => handleGeographicCountSelect(1)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedGeographicCount === 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              1 Geographic Focus ({projectsWithGeographicCount.filter(p => p.geographicFocusCount === 1).length})
            </button>
            <button
              onClick={() => handleGeographicCountSelect(2)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedGeographicCount === 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              2 Geographic Focuses ({projectsWithGeographicCount.filter(p => p.geographicFocusCount === 2).length})
            </button>
            <button
              onClick={() => handleGeographicCountSelect('3+')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedGeographicCount === '3+'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              3+ Geographic Focuses ({projectsWithGeographicCount.filter(p => p.geographicFocusCount >= 3).length})
            </button>
          </div>
        </div>
      )}

      <div className="w-full flex-1 min-h-0" key={`map-container-${isSidebarCollapsed}`}>
        <Map 
          onCitySelect={viewMode === 'city' ? setSelectedCity : null} 
          selectedCity={selectedCity}
          highlightedCities={highlightedCities}
          cityColors={cityColors}
          viewMode={viewMode}
          selectedProject={selectedProject}
          onCityNotFound={handleCityNotFound}
        />
      </div>
      
      {/* Popup Window - Only show in city view mode */}
      {popupVisible && selectedCity && viewMode === 'city' && (
        <div
          className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 ${
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
              {viewMode === 'city' 
                ? `Projects in ${selectedCity}`
                : `Projects with ${selectedGeographicCount} Geographic Focus${selectedGeographicCount === 1 ? '' : selectedGeographicCount === '3+' ? 'es' : 'es'}`
              }
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
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <ProjectsTable 
                  projects={currentProjects} 
                  onProjectSelect={handleProjectSelect}
                  selectedProject={selectedProject}
                  disableProjectSelection={viewMode === 'city'}
                  onCityModeProjectClick={handleCityModeProjectClick}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Details Popup */}
      {projectPopupVisible && selectedProject && (
        <div className={`fixed inset-0 z-50 ${isProjectMinimized ? '' : 'bg-gray-300 bg-opacity-50 flex items-center justify-center'}`} style={{ backgroundColor: isProjectMinimized ? 'transparent' : 'rgba(209, 213, 219, 0.5)' }}>
          <div
            className={`bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col ${
              isProjectMinimized 
                ? 'w-80 h-16 bottom-4 right-4 absolute' 
                : 'w-[1000px] h-[300px]'
            }`}
            style={{
              cursor: isProjectDragging ? 'grabbing' : 'default',
              left: isProjectMinimized ? 'auto' : `${projectPopupPosition.x}px`,
              top: isProjectMinimized ? 'auto' : `${projectPopupPosition.y}px`
            }}
            onMouseDown={isProjectMinimized ? undefined : handleProjectMouseDown}
            onMouseMove={isProjectMinimized ? undefined : handleProjectMouseMove}
            onMouseUp={isProjectMinimized ? undefined : handleProjectMouseUp}
            onMouseLeave={isProjectMinimized ? undefined : handleProjectMouseUp}
          >
          {/* Header */}
          <div className={`popup-header flex items-center justify-between border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-grab flex-shrink-0 ${
            isProjectMinimized ? 'p-2' : 'p-3'
          }`}>
            <div className="flex-1 min-w-0">
              <h2 className={`font-semibold text-gray-900 break-words leading-tight w-full max-w-xs ${
                isProjectMinimized ? 'text-xs' : 'text-sm'
              }`}>
                {selectedProject.name || 'Unnamed Project'}
              </h2>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={handleProjectMinimize}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isProjectMinimized ? "Maximize" : "Minimize"}
              >
                <span className="text-gray-600 text-sm">
                  {isProjectMinimized ? "□" : "−"}
                </span>
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
          {!isProjectMinimized && (
            <div className="p-4 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Project Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Client:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProject.client ? (
                        selectedProject.client
                          .split(/[""]/)
                          .map(client => client.trim().replace(/,/g, ''))
                          .filter(client => client.length > 0)
                          .map((client, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                            >
                              {client}
                            </span>
                          ))
                      ) : (
                        <span className="text-gray-500 text-sm">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <p className="text-gray-900 break-words">{selectedProject.leadDepartment || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Manager:</span>
                    <p className="text-gray-900 break-words">{selectedProject.projectManager || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className="text-gray-900 break-words">{selectedProject.projectStatus || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="text-gray-900 break-words">{selectedProject.projectType || 'Others'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Focus Count:</span>
                    <p className="text-gray-900">{selectedProject.geographicFocusCount || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Geographic Focus:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProject.geographicFocus ? (
                        selectedProject.geographicFocus
                          .split(/[,;|&]/)
                          .map(city => city.trim())
                          .filter(city => city.length > 0)
                          .map((city, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {city}
                            </span>
                          ))
                      ) : (
                        <span className="text-gray-500 text-sm">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">MetroCommon 2050 Goals:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProject.metroCommon2050goals ? (
                        selectedProject.metroCommon2050goals
                          .split(',')
                          .map(goal => goal.trim())
                          .filter(goal => goal.length > 0)
                          .map((goal, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
                            >
                              {goal}
                            </span>
                          ))
                      ) : (
                        <span className="text-gray-500 text-sm">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedProject.projectDescription && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedProject.projectDescription}</p>
                </div>
              )}
              
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
          )}
        </div>
        </div>
      )}

      {/* City Not Found Alert */}
      {cityNotFoundAlertVisible && (
        <div className="fixed bottom-20 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
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
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={handleCloseCityNotFoundAlert}
                className="text-red-400 hover:text-red-600"
              >
                <span className="text-lg">×</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City Mode Project Details Center Popup */}
      {cityModeProjectPopupVisible && cityModeSelectedProject && (
        <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(209, 213, 219, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-[800px] max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 break-words leading-tight">
                  {cityModeSelectedProject.name || 'Unnamed Project'}
                </h2>
                <p className="text-sm text-gray-600 break-words leading-tight mt-1">
                  Client: {cityModeSelectedProject.client || 'Not specified'}
                </p>
              </div>
              <button
                onClick={() => {
                  setCityModeProjectPopupVisible(false)
                  setCityModeSelectedProject(null)
                }}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {cityModeSelectedProject.projectDescription && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 break-words leading-relaxed">{cityModeSelectedProject.projectDescription}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Project Details</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-gray-600 font-medium">Department:</span>
                      <p className="text-gray-900 break-words mt-1">{cityModeSelectedProject.leadDepartment || 'Not assigned'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Manager:</span>
                      <p className="text-gray-900 break-words mt-1">{cityModeSelectedProject.projectManager || 'Not assigned'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Status:</span>
                      <p className="text-gray-900 break-words mt-1">{cityModeSelectedProject.projectStatus || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Type:</span>
                      <p className="text-gray-900 break-words mt-1">{cityModeSelectedProject.projectType || 'Others'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Start Date:</span>
                      <p className="text-gray-900 break-words mt-1">
                        {cityModeSelectedProject.startDate ? new Date(cityModeSelectedProject.startDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">End Date:</span>
                      <p className="text-gray-900 break-words mt-1">
                        {cityModeSelectedProject.actualCompletionDate ? new Date(cityModeSelectedProject.actualCompletionDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Budget:</span>
                      <p className="text-gray-900 break-words mt-1">
                        {cityModeSelectedProject.budget ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(cityModeSelectedProject.budget) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Year:</span>
                      <p className="text-gray-900 break-words mt-1">{cityModeSelectedProject.projectYear || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                
                {cityModeSelectedProject.geographicFocus && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Geographic Focus</h3>
                    <p className="text-gray-700 break-words leading-relaxed">{cityModeSelectedProject.geographicFocus}</p>
                  </div>
                )}
                
                {cityModeSelectedProject.metroCommon2050goals && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">MetroCommon 2050 Goals</h3>
                    <div className="flex flex-wrap gap-2">
                      {cityModeSelectedProject.metroCommon2050goals
                        .split(',')
                        .map(goal => goal.trim())
                        .filter(goal => goal.length > 0)
                        .map((goal, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full"
                          >
                            {goal}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                
                {cityModeSelectedProject.stakeholders && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Stakeholders</h3>
                    <p className="text-gray-700 break-words leading-relaxed">{cityModeSelectedProject.stakeholders}</p>
                  </div>
                )}
                
                {cityModeSelectedProject.attachmentUrls && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Attachments</h3>
                    <div className="space-y-2">
                      {cityModeSelectedProject.attachmentUrls.split('\n').map((attachment, index) => {
                        if (!attachment.trim()) return null
                        
                        const colonIndex = attachment.indexOf(': ')
                        if (colonIndex === -1) return null
                        
                        const filename = attachment.substring(0, colonIndex).trim()
                        const url = attachment.substring(colonIndex + 2).trim()
                        
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <i className="fas fa-paperclip text-blue-600 text-lg"></i>
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
    </div>
  )
}

export default MapPage