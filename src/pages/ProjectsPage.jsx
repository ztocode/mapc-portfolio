import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProjects, selectFilteredProjects, selectProjectsLoading, selectProjectsError, selectSelectedCategory } from '../store/projectsSlice'

const ProjectsPage = () => {
  const dispatch = useDispatch()
  const projects = useSelector(selectFilteredProjects)
  const loading = useSelector(selectProjectsLoading)
  const error = useSelector(selectProjectsError)
  const selectedCategory = useSelector(selectSelectedCategory)

  // Transform Redux data to match our expected format
  const transformProjectsData = (projectsData) => {
    if (!Array.isArray(projectsData)) return []
    
    return projectsData.map(project => ({
      id: project.id,
      name: project.name || 'Unnamed Project',
      category: project.projectType || 'Others',
      status: project.projectStatus || 'Unknown',
      progress: Math.floor(Math.random() * 100), // Mock progress since it's not in Airtable
      budget: '$1M', // Mock budget since it's not in Airtable
      startDate: project.startDate || '2024-01-01',
      endDate: '2024-12-31', // Mock end date
      description: project.projectDescription || 'No description available'
    }))
  }

  // Fetch projects on component mount
  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  const transformedProjects = transformProjectsData(projects)

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Planning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      transportation: '🚌',
      environment: '🌱',
      housing: '🏠',
      infrastructure: '🏗️',
      'public-services': '🏥',
      'economic-development': '💼'
    }
    return icons[category] || '📄'
  }

  return (
    <div className="p-6">
      {/* Loading State */}
      {loading && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-yellow-800">Loading projects...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800 mb-2">Error Loading Projects</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {selectedCategory === 'all' ? 'All Projects' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Projects`}
        </h1>
        <p className="text-gray-600 mt-2">
          {selectedCategory === 'all' 
            ? 'Manage and track all city development projects' 
            : `Projects in the ${selectedCategory} category`
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {transformedProjects.map(project => (
          <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Project Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>

            {/* Project Details */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium text-gray-900">{project.budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Category</p>
                    <div className="flex items-center space-x-2">
                      <span>{getCategoryIcon(project.category)}</span>
                      <span className="font-medium text-gray-900 capitalize">{project.category.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">{new Date(project.endDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {transformedProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500">No projects available in this category</p>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage 