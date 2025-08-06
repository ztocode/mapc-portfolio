import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectAllProjects } from '../store/projectsSlice'



const ProjectsTable = ({ projects: overrideProjects, onProjectSelect = null, selectedProject = null, disableProjectSelection = false, onCityModeProjectClick = null, searchTerm = '', departmentFilter = [], yearFilter = [], statusFilter = [] }) => {
  const allProjects = overrideProjects || useSelector(selectAllProjects)
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null)
  
  // Filter projects based on search term and other filters
  const projects = useMemo(() => {
    let filtered = allProjects

    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(project => {
        // Search in project name (primary focus)
        if (project.name && project.name.toLowerCase().includes(searchLower)) return true
        // Search in project type
        if (project.projectType && project.projectType.toLowerCase().includes(searchLower)) return true
        // Search in department
        if (project.leadDepartment && project.leadDepartment.toLowerCase().includes(searchLower)) return true
        // Search in manager
        if (project.projectManager && project.projectManager.toLowerCase().includes(searchLower)) return true
        // Search in geographic focus
        if (project.geographicFocus && project.geographicFocus.toLowerCase().includes(searchLower)) return true
        // Search in client
        if (project.client && project.client.toLowerCase().includes(searchLower)) return true
        return false
      })
    }

    // Apply department filter
    if (departmentFilter.length > 0) {
      filtered = filtered.filter(project => {
        const dept = project.leadDepartment || 'Not Assigned'
        const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
        return departments.some(department => departmentFilter.includes(department))
      })
    }

    // Apply year filter
    if (yearFilter.length > 0) {
      filtered = filtered.filter(project => {
        let projectYear = null
        
        // Try to get year from projectYear field first
        if (project.projectYear) {
          projectYear = parseInt(project.projectYear)
        }
        // If no projectYear, try to extract from startDate
        else if (project.startDate) {
          const date = new Date(project.startDate)
          if (!isNaN(date.getFullYear())) {
            projectYear = date.getFullYear()
          }
        }
        
        return projectYear && !isNaN(projectYear) && yearFilter.includes(projectYear)
      })
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(project => {
        const status = project.projectStatus || 'Unknown'
        return statusFilter.includes(status)
      })
    }

    return filtered
  }, [allProjects, searchTerm, departmentFilter, yearFilter, statusFilter])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  })

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      const aValue = a[sortConfig.key] || ''
      const bValue = b[sortConfig.key] || ''
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [projects, sortConfig])

  // Pagination
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProjects = sortedProjects.slice(startIndex, endIndex)

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }


  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400">↕</span>
    return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
      
      {/* Results Summary */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
          <p className="text-xs sm:text-sm text-gray-600">
            {sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedProjects.length)} of {sortedProjects.length}
          </p>
        </div>
      </div>

      {/* Table and Pagination Container */}
      <div className="overflow-x-auto flex flex-col h-[400px] sm:h-[500px]">
        {/* Table */}
        <div className="flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    <span>Project Name</span>
                    <SortIcon columnKey="name" />
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('leadDepartment')}
                  >
                    <span className="hidden sm:inline">Department</span>
                    <span className="sm:hidden">Dept</span>
                    <SortIcon columnKey="leadDepartment" />
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectManager')}
                  >
                    <span className="hidden sm:inline">Manager</span>
                    <span className="sm:hidden">Mgr</span>
                    <SortIcon columnKey="projectManager" />
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectStatus')}
                  >
                    <span>Status</span>
                    <SortIcon columnKey="projectStatus" />
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectType')}
                  >
                    <span>Type</span>
                    <SortIcon columnKey="projectType" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentProjects.map((project) => (
                <tr 
                  key={project.id} 
                  className={`hover:bg-gray-50 ${disableProjectSelection ? 'cursor-pointer' : 'cursor-pointer'} ${
                    selectedProject && selectedProject.id === project.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (disableProjectSelection && onCityModeProjectClick) {
                      // City mode: show center popup
                      onCityModeProjectClick(project)
                    } else if (!disableProjectSelection && onProjectSelect) {
                      // Geographic mode: normal project selection
                      onProjectSelect(project)
                    } else {
                      // Dashboard table view: show project details popup
                      setSelectedProjectDetails(project)
                    }
                  }}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                      {project.name || 'Unnamed Project'}
                    </div>
                    {project.projectDescription && (
                      <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-xs">{project.projectDescription}</div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 break-words">
                    {project.leadDepartment || 'Not assigned'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 break-words">
                    {project.projectManager || 'Not assigned'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.projectStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                      project.projectStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      project.projectStatus === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.projectStatus || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 break-words">
                    {project.projectType || 'Others'}
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-center flex-shrink-0" aria-label="Table pagination">
            <ul className="inline-flex items-center space-x-1 pagination">
              {/* Previous Button */}
              <li>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`page-link px-4 py-3 rounded-l border border-gray-300 text-gray-700 font-medium transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                  aria-label="Previous"
                >
                  &laquo;
                </button>
              </li>

              {/* Page Numbers with Ellipsis */}
              {(() => {
                const pages = []
                let start = Math.max(1, currentPage - 2)
                let end = Math.min(totalPages, start + 4)
                if (end - start < 4) start = Math.max(1, end - 4)

                if (start > 1) {
                  pages.push(
                    <li key={1}>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className={`page-link px-4 py-3 border border-gray-300 text-gray-700 font-medium transition-colors rounded ${currentPage === 1 ? 'bg-blue-600 text-white border-blue-600 shadow' : 'hover:bg-blue-50'}`}
                      >
                        1
                      </button>
                    </li>
                  )
                  if (start > 2) {
                    pages.push(
                      <li key="start-ellipsis">
                        <span className="px-2 text-gray-400">...</span>
                      </li>
                    )
                  }
                }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <li key={i}>
                      <button
                        onClick={() => setCurrentPage(i)}
                        className={`page-link px-4 py-3 border border-gray-300 font-medium transition-colors rounded ${
                          currentPage === i
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        {i}
                      </button>
                    </li>
                  )
                }
                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pages.push(
                      <li key="end-ellipsis">
                        <span className="px-2 text-gray-400">...</span>
                      </li>
                    )
                  }
                  pages.push(
                    <li key={totalPages}>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`page-link px-4 py-3 border border-gray-300 text-gray-700 font-medium transition-colors rounded ${currentPage === totalPages ? 'bg-blue-600 text-white border-blue-600 shadow' : 'hover:bg-blue-50'}`}
                      >
                        {totalPages}
                      </button>
                    </li>
                  )
                }
                return pages
              })()}

              {/* Next Button */}
              <li>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`page-link px-4 py-3 rounded-r border border-gray-300 text-gray-700 font-medium transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                  aria-label="Next"
                >
                  &raquo;
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Project Details Popup */}
      {selectedProjectDetails && (
                <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(209, 213, 219, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl w-[800px] h-[600px] border border-gray-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 break-words">
                  {selectedProjectDetails.name || 'Unnamed Project'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProjectDetails.projectType || 'Others'}
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectDetails(null)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Project Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedProjectDetails.projectStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                          selectedProjectDetails.projectStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          selectedProjectDetails.projectStatus === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedProjectDetails.projectStatus || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Department:</span>
                        <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.leadDepartment || 'Not assigned'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Manager:</span>
                        <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.projectManager || 'Not assigned'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Client:</span>
                        <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.client || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Geographic Focus:</span>
                        <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.geographicFocus || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">MetroCommon 2050 Goals:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedProjectDetails.metroCommon2050goals ? (
                            selectedProjectDetails.metroCommon2050goals
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

                  {/* Dates */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Timeline</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Project Year:</span>
                        <p className="text-sm text-gray-900">{selectedProjectDetails.projectYear || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Start Date:</span>
                        <p className="text-sm text-gray-900">
                          {selectedProjectDetails.startDate ? new Date(selectedProjectDetails.startDate).toLocaleDateString() : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">End Date:</span>
                        <p className="text-sm text-gray-900">
                          {selectedProjectDetails.actualCompletionDate ? new Date(selectedProjectDetails.actualCompletionDate).toLocaleDateString() : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description and Attachments */}
                <div className="space-y-4">
                  {selectedProjectDetails.projectDescription && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                      <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedProjectDetails.projectDescription}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedProjectDetails.attachmentUrls && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Attachments</h3>
                      <div className="space-y-2">
                        {selectedProjectDetails.attachmentUrls.split('\n').map((attachment, index) => {
                          if (!attachment.trim()) return null
                          
                          // Parse the attachment line (filename: url format)
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

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Information</h3>
                    <div className="space-y-3">
                      {selectedProjectDetails.municipalityCollaboration && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Municipal Collaboration:</span>
                          <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.municipalityCollaboration}</p>
                        </div>
                      )}
                      {selectedProjectDetails.mapcSubRegions && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">MAPC Sub Regions:</span>
                          <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.mapcSubRegions}</p>
                        </div>
                      )}
                      {selectedProjectDetails.internalCollaborators && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Internal Collaborators:</span>
                          <p className="text-sm text-gray-900 break-words">{selectedProjectDetails.internalCollaborators}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsTable 