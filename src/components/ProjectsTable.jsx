import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectFilteredProjects } from '../store/projectsSlice'



const ProjectsTable = ({ projects: overrideProjects, onProjectSelect = null, selectedProject = null, disableProjectSelection = false, onCityModeProjectClick = null }) => {
  const projects = overrideProjects || useSelector(selectFilteredProjects)
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
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedProjects.length)} of {sortedProjects.length}
          </p>
        </div>
      </div>

      {/* Table and Pagination Container */}
      <div className="overflow-x-auto flex flex-col h-[500px]">
        {/* Table */}
        <div className="flex-1 ">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    <span>Project Name</span>
                    <SortIcon columnKey="name" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('leadDepartment')}
                  >
                    <span>Department</span>
                    <SortIcon columnKey="leadDepartment" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectManager')}
                  >
                    <span>Manager</span>
                    <SortIcon columnKey="projectManager" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectStatus')}
                  >
                    <span>Status</span>
                    <SortIcon columnKey="projectStatus" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center space-x-1 hover:text-gray-700"
                    onClick={() => handleSort('projectType')}
                  >
                    <span>Type</span>
                    <SortIcon columnKey="projectType" />
                  </button>
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th> */}
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
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {project.name || 'Unnamed Project'}
                    </div>
                    {project.projectDescription && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{project.projectDescription}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.leadDepartment || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.projectManager || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.projectStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                      project.projectStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      project.projectStatus === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.projectStatus || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.projectType || 'Others'}
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-center flex-shrink-0" aria-label="Table pagination">
            <ul className="inline-flex items-center space-x-1 pagination">
              {/* Previous Button */}
              <li>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`page-link p-5 rounded-l border border-gray-300 bg-white text-gray-700 font-medium transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
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
                        className={`page-link p-5 border border-gray-300 bg-white text-gray-700 font-medium transition-colors rounded ${currentPage === 1 ? 'bg-blue-600 text-white border-blue-600 shadow' : 'hover:bg-gray-100'}`}
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
                        className={`page-link p-5 border border-gray-300 font-medium transition-colors rounded ${
                          currentPage === i
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
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
                        className={`page-link p-1.25 border border-gray-300 bg-white text-gray-700 font-medium transition-colors rounded ${currentPage === totalPages ? 'bg-blue-600 text-white border-blue-600 shadow' : 'hover:bg-gray-100'}`}
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
                  className={`page-link p-1.25 rounded-r border border-gray-300 bg-white text-gray-700 font-medium transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  aria-label="Next"
                >
                  &raquo;
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}

export default ProjectsTable 