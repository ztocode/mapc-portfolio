import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectAllProjects } from '../store/projectsSlice'

const Sidebar = ({ 
  isCollapsed = false, 
  onToggle, 
  currentPage = 'dashboard', 
  selectedCity = null, 
  onCitySelect = null,
  viewMode = 'city',
  selectedGeographicCount = null,
  onGeographicCountSelect = null,
  onProjectSelect = null,
  selectedProject = null,
  onSearchTermChange = null
}) => {
  // Don't render sidebar for dashboard page or year view mode
  if (currentPage === 'dashboard' || viewMode === 'year') {
    return null
  }

  const allProjects = useSelector(selectAllProjects)
  const [searchTerm, setSearchTerm] = useState('')

  // Calculate geographic focus count for each project
  const projectsWithGeographicCount = allProjects.map(project => {
    let count = 0
    if (project.geographicFocus && typeof project.geographicFocus === 'string') {
      const cities = project.geographicFocus
        .split(/[,;|&]/)
        .map(city => city.trim())
        .filter(city => city.length > 0)
      count = new Set(cities).size
    }
    return { ...project, geographicFocusCount: count }
  })

  // Extract unique cities from geographicFocus for map page
  const cityProjects = allProjects.reduce((acc, project) => {
    if (project.geographicFocus && typeof project.geographicFocus === 'string') {
      // Split by common delimiters and clean up
      const cities = project.geographicFocus
        .split(/[,;|&]/)
        .map(city => city.trim())
        .filter(city => city.length > 0)
      
      cities.forEach(city => {
        if (!acc[city]) {
          acc[city] = []
        }
        acc[city].push(project)
      })
    }
    return acc
  }, {})

  // Get projects based on geographic focus count when in that view mode
  const geographicCountProjects = projectsWithGeographicCount.filter(project => {
    if (selectedGeographicCount === '3+') {
      return project.geographicFocusCount >= 3
    }
    return project.geographicFocusCount === selectedGeographicCount
  })

  // Convert to array and sort alphabetically
  const cityCategories = Object.entries(cityProjects)
    .map(([city, projects]) => ({
      id: city,
      name: city,
      description: `Projects in ${city}`,
      color: 'bg-blue-500',
      count: projects.length
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Convert geographic count projects to array and sort by name
  const geographicCountProjectCategories = geographicCountProjects
    .map(project => {
      // Create both short and full descriptions
      let shortDescription = 'No geographic focus'
      let fullDescription = 'No geographic focus'
      
      if (project.geographicFocus) {
        const focus = project.geographicFocus.trim()
        fullDescription = focus
        
        // Count the number of geographic focuses
        const focusCount = focus.split(/[,;|&]/).filter(item => item.trim().length > 0).length
        
        if (focusCount > 20) {
          // If more than 20 geographic focuses, truncate to 30 characters and add ellipsis
          shortDescription = focus.length > 30 ? focus.substring(0, 30) + '...' : focus
        } else {
          // If 20 or fewer geographic focuses, show the full text
          shortDescription = focus
        }
      }
      
      return {
        id: project.id,
        name: project.name || 'Unnamed Project',
        description: shortDescription,
        fullDescription: fullDescription,
        color: 'bg-green-500',
        count: 1,
        project: project // Store the full project object
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  // Filter categories based on search term and view mode
  const filteredCategories = currentPage === 'map' 
    ? (viewMode === 'geographicCount' && selectedGeographicCount 
        ? geographicCountProjectCategories.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : cityCategories.filter(city => 
            city.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : [] // No categories for dashboard page

  // Use different data based on current page and view mode
  const displayCategories = filteredCategories
  const selectedItem = currentPage === 'map' 
    ? (viewMode === 'geographicCount' && selectedGeographicCount ? selectedProject?.id : selectedCity)
    : null
  const selectedItemData = displayCategories.find(c => c.id === selectedItem) || 
    (displayCategories.length > 0 ? displayCategories[0] : {
      id: 'none',
      name: 'No Results',
      description: 'No matching cities found',
      color: 'bg-gray-400',
      count: 0
    })

  // Clear search when changing pages
  useEffect(() => {
    setSearchTerm('')
  }, [currentPage])

  // Notify parent component when search term changes (for dashboard page)
  useEffect(() => {
    if (currentPage === 'dashboard' && onSearchTermChange) {
      onSearchTermChange(searchTerm)
    }
  }, [searchTerm, currentPage, onSearchTermChange])

  const handleCategorySelect = (categoryId) => {
    if (currentPage === 'map') {
      if (viewMode === 'geographicCount' && selectedGeographicCount) {
        // Handle project selection in geographic count view
        const selectedCategory = displayCategories.find(cat => cat.id === categoryId)
        if (selectedCategory && selectedCategory.project && onProjectSelect) {
          onProjectSelect(selectedCategory.project)
        }
        console.log('Selected project:', selectedCategory?.project?.name)
      } else {
        // Handle city selection in regular city view
        if (onCitySelect) {
          onCitySelect(categoryId)
        }
        console.log('Selected city:', categoryId)
      }
    }
  }

  const handleToggle = () => {
    console.log('Toggle button clicked! Current state:', isCollapsed)
    if (onToggle) {
      onToggle()
    } else {
      console.error('onToggle function is not provided!')
    }
  }

  return (
    <aside className={`sidebar shadow-sm border-r border-gray-200 bg-white flex-shrink-0 h-full overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {isCollapsed ? (
        // Collapsed view - much narrower like Taipei City Dashboard
        <div className="flex flex-col h-full">
          {/* Toggle Button */}
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={handleToggle}
              className="w-full h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <span className="text-sm">→</span>
            </button>
          </div>

          {/* Category Indicators */}
          <div className="flex-1 p-1">
            {displayCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full h-8 mb-1 flex items-center justify-center rounded transition-all duration-200 cursor-pointer ${
                  selectedItem === category.id
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-gray-100'
                }`}
                title={`${category.name} (${category.count} projects)`}
              >
                <div className={`w-3 h-3 rounded ${category.color}`}></div>
              </button>
            ))}
          </div>

          {/* Selected Category Indicator */}
          <div className="p-1 border-t border-gray-200">
            <div className="w-full h-8 flex items-center justify-center">
              <div className={`w-3 h-3 rounded ${selectedItemData.color}`}></div>
            </div>
          </div>
        </div>
      ) : (
        // Expanded view
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded ${selectedItemData.color}`}></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 break-words leading-tight w-full max-w-xs">{selectedItemData.name}</h2>
                  <p className="text-sm text-gray-500 break-words leading-tight w-full" style={{ maxWidth: '16em' }}>{selectedItemData.description}</p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <span className="text-lg">←</span>
              </button>
            </div>
          </div>

          {/* Project Categories */}
          <div className="flex-1 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {currentPage === 'map' 
                ? (viewMode === 'geographicCount' && selectedGeographicCount ? 'Projects' : 'Cities')
                : 'Project Categories'
              }
            </h3>
            
            {/* Search Bar - Show on both map and dashboard pages */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    currentPage === 'map' 
                      ? (viewMode === 'geographicCount' && selectedGeographicCount ? "Search projects..." : "Search cities...")
                      : "Search project categories..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-8 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400 text-sm"></i>
                </div>
              </div>
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-1">
                  {filteredCategories.length} {
                    currentPage === 'map' 
                      ? (viewMode === 'geographicCount' && selectedGeographicCount ? 'projects' : 'cities')
                      : 'categories'
                  } found
                </p>
              )}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}>
              {displayCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedItem === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded ${category.color}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words leading-tight">{category.name}</p>
                      {viewMode !== 'geographicCount' ? (
                        <p className="text-xs text-gray-500 break-words leading-tight">{category.count} projects</p>
                      ) : (
                        <p className="text-xs text-gray-500 break-words leading-tight">{category.fullDescription || category.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-gray-500">Click to view</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Summary */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Category Summary</h3>
            <div className="space-y-3 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Selected Category</p>
                <p className="text-lg font-bold text-gray-900 break-words leading-tight">{selectedItemData.name}</p>
                <p className="text-sm text-gray-600 break-words leading-tight">{selectedItemData.count} projects</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">Total Projects</p>
                <p className="text-lg font-bold text-blue-900 break-words leading-tight">{allProjects.length}</p>
                <p className="text-sm text-blue-600 break-words leading-tight">Across all categories</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </aside>
  )
}

export default Sidebar 