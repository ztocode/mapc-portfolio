import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectFilteredProjects } from '../store/projectsSlice'

const ProjectsTable = () => {
  const projects = useSelector(selectFilteredProjects)
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

  // Generate Airtable row link
  const getAirtableLink = (recordId) => {
    const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
    return `https://airtable.com/app${baseId}/tbl${baseId}/${recordId}`
  }

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400">↕</span>
    return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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

      {/* Table */}
      <div className="overflow-x-auto">
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
                  onClick={() => handleSort('leadDepartment')}
                >
                  <span>Department</span>
                  <SortIcon columnKey="leadDepartment" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{project.name || 'Unnamed Project'}</div>
                  {project.projectDescription && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">{project.projectDescription}</div>
                  )}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {project.projectManager || 'Not assigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {project.leadDepartment || 'Not assigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a
                    href={getAirtableLink(project.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View in Airtable
                  </a>
                  <button className="text-gray-600 hover:text-gray-900">
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsTable 