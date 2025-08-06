import React from 'react'

const BreakdownCard = ({ 
  title, 
  data, 
  color = 'blue', 
  sortKeys = false, 
  sortNumeric = false, 
  scrollable = false, 
  breakWords = false, 
  isDepartment = false, 
  onItemClick,
  projects = [],
  setSelectedDepartment,
  setClickedCategoryType,
  setDepartmentProjects,
  setShowDepartmentPopup,
  timeView = 'historical'
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800'
  }

  // Optionally sort keys alphabetically or numerically
  let entries = Object.entries(data)
  if (sortKeys) {
    entries = entries.sort((a, b) => a[0].localeCompare(b[0]))
  } else if (sortNumeric) {
    entries = entries.sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Latest to oldest
  }

  const handleItemClick = (key) => {
    let filteredProjects = []
    
    if (isDepartment) {
      // Get the correct project set based on time view
      let targetProjects = []
      
      if (timeView === 'current') {
        // Filter for current year projects
        targetProjects = projects.filter(project => {
          let projectYear = null
          if (project.projectYear) {
            const yearStr = project.projectYear.toString().trim()
            if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
              const parsedYear = parseInt(yearStr)
              if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
                projectYear = parsedYear
              }
            }
          }
          return projectYear === new Date().getFullYear()
        })
      } else if (timeView === 'historical') {
        // Filter for historical projects (not current year)
        targetProjects = projects.filter(project => {
          let projectYear = null
          if (project.projectYear) {
            const yearStr = project.projectYear.toString().trim()
            if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
              const parsedYear = parseInt(yearStr)
              if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
                projectYear = parsedYear
              }
            }
          }
          return projectYear && projectYear !== new Date().getFullYear()
        })
      } else if (timeView === 'missing') {
        // Filter for projects with missing project years
        targetProjects = projects.filter(project => {
          return !project.projectYear || 
                 project.projectYear.toString().trim() === 'null' || 
                 project.projectYear.toString().trim() === 'undefined' || 
                 project.projectYear.toString().trim() === '' ||
                 isNaN(parseInt(project.projectYear.toString().trim()))
        })
      }

      // Filter projects by department
      filteredProjects = targetProjects.filter(project => {
        const dept = project.leadDepartment || 'Not Assigned'
        const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
        return departments.includes(key)
      })
      setClickedCategoryType('Department')
    } else if (title === 'Project Types') {
      // Get the correct project set based on time view
      let targetProjects = []
      
      if (timeView === 'current') {
        // Filter for current year projects
        targetProjects = projects.filter(project => {
          let projectYear = null
          if (project.projectYear) {
            const yearStr = project.projectYear.toString().trim()
            if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
              const parsedYear = parseInt(yearStr)
              if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
                projectYear = parsedYear
              }
            }
          }
          return projectYear === new Date().getFullYear()
        })
      } else if (timeView === 'historical') {
        // Filter for historical projects (not current year)
        targetProjects = projects.filter(project => {
          let projectYear = null
          if (project.projectYear) {
            const yearStr = project.projectYear.toString().trim()
            if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
              const parsedYear = parseInt(yearStr)
              if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
                projectYear = parsedYear
              }
            }
          }
          return projectYear && projectYear !== new Date().getFullYear()
        })
      } else if (timeView === 'missing') {
        // Filter for projects with missing project years
        targetProjects = projects.filter(project => {
          return !project.projectYear || 
                 project.projectYear.toString().trim() === 'null' || 
                 project.projectYear.toString().trim() === 'undefined' || 
                 project.projectYear.toString().trim() === '' ||
                 isNaN(parseInt(project.projectYear.toString().trim()))
        })
      }

      // Filter projects by type
      filteredProjects = targetProjects.filter(project => 
        (project.projectType || 'Others') === key
      )
      setClickedCategoryType('Project Type')
    } else if (onItemClick) {
      // Use custom click handler (for years)
      onItemClick(key)
      return
    }
    
    if (filteredProjects.length > 0) {
      setSelectedDepartment(key)
      setDepartmentProjects(filteredProjects)
      setShowDepartmentPopup(true)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-[400px] xl:w-[300px] ${scrollable ? 'h-[350px] sm:h-[450px] overflow-auto' : ''}`}>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
      <div className="space-y-2 sm:space-y-3">
        {entries.length > 0 ? (
          entries.map(([key, value]) => (
            <div 
              key={key} 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => handleItemClick(key)}
            >
              <span className={`text-xs sm:text-sm text-gray-600 ${breakWords ? 'break-words whitespace-normal max-w-[120px] sm:max-w-[180px]' : ''}`}>{key}</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[color]} flex-shrink-0`}>
                {value}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No data available</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different category or time period</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BreakdownCard 