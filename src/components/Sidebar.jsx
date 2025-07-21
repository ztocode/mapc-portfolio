import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedCategory, selectProjectsCategories, selectSelectedCategory, selectAllProjects } from '../store/projectsSlice'

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const dispatch = useDispatch()
  const categories = useSelector(selectProjectsCategories)
  const selectedCategory = useSelector(selectSelectedCategory)
  const allProjects = useSelector(selectAllProjects)

  // Generate categories from project types
  const projectTypeCategories = categories.map((type, index) => {
    const count = allProjects.filter(project => project.projectType === type).length
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500']
    
    return {
      id: type,
      name: type,
      description: `Projects of type: ${type}`,
      color: colors[index % colors.length],
      count: count
    }
  })

  // Add "Others" category for undefined/null project types
  const othersCategory = {
    id: 'others',
    name: 'Others',
    description: 'Projects with undefined or missing type',
    color: 'bg-gray-400',
    count: allProjects.filter(project => !project.projectType || project.projectType === '').length
  }

  // Sort categories by count in descending order (excluding "All Projects")
  const sortedCategories = [...projectTypeCategories, othersCategory].sort((a, b) => b.count - a.count)

  // Combine "All Projects" with sorted categories
  const projectCategories = [
    {
      id: 'all',
      name: 'All Projects',
      description: 'View all projects across all types',
      color: 'bg-gray-500',
      count: allProjects.length
    },
    ...sortedCategories
  ]

  const handleCategorySelect = (categoryId) => {
    dispatch(setSelectedCategory(categoryId))
    console.log('Selected category:', categoryId)
  }

  const handleToggle = () => {
    console.log('Toggle button clicked! Current state:', isCollapsed)
    if (onToggle) {
      onToggle()
    } else {
      console.error('onToggle function is not provided!')
    }
  }

  const selectedCategoryData = projectCategories.find(c => c.id === selectedCategory) || projectCategories[0]

  return (
    <aside className={`sidebar shadow-sm border-r border-gray-200 h-full overflow-y-auto transition-all duration-300 ${
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
            {projectCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full h-8 mb-1 flex items-center justify-center rounded transition-all duration-200 cursor-pointer ${
                  selectedCategory === category.id
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
              <div className={`w-3 h-3 rounded ${selectedCategoryData.color}`}></div>
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
                <div className={`w-3 h-3 rounded ${selectedCategoryData.color}`}></div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedCategoryData.name}</h2>
                  <p className="text-sm text-gray-500">{selectedCategoryData.description}</p>
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
            <h3 className="text-sm font-medium text-gray-900 mb-3">Project Categories</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}>
              {projectCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded ${category.color}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.count} projects</p>
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
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Category Summary</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Selected Category</p>
                <p className="text-lg font-bold text-gray-900">{selectedCategoryData.name}</p>
                <p className="text-sm text-gray-600">{selectedCategoryData.count} projects</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">Total Projects</p>
                <p className="text-lg font-bold text-blue-900">{allProjects.length}</p>
                <p className="text-sm text-blue-600">Across all categories</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </aside>
  )
}

export default Sidebar 