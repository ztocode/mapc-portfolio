import React, { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectAllProjects } from '../store/projectsSlice'

const ProjectByDepartmentChart = () => {
  const projects = useSelector(selectAllProjects)
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [selectedYears, setSelectedYears] = useState([])

  // Debug logging
  console.log('ProjectByDepartmentChart - projects count:', projects.length)
  console.log('ProjectByDepartmentChart - selectedDepartments:', selectedDepartments)
  console.log('ProjectByDepartmentChart - selectedYears:', selectedYears)

  // Get unique departments and years from projects
  const { departments, years } = useMemo(() => {
    const deptSet = new Set()
    const yearSet = new Set()
    
    projects.forEach(project => {
      // Extract departments
      if (project.leadDepartment) {
        const deptList = project.leadDepartment.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
        deptList.forEach(dept => deptSet.add(dept))
      }
      
      // Extract years
      if (project.projectYear) {
        const yearStr = project.projectYear.toString().trim()
        if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
          const parsedYear = parseInt(yearStr)
          if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
            yearSet.add(parsedYear)
          }
        }
      }
    })
    
    return {
      departments: Array.from(deptSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a) // Sort descending (newest first)
    }
  }, [projects])

  // Set default selections
  useEffect(() => {
    if (departments.length > 0 && selectedDepartments.length === 0) {
      setSelectedDepartments([departments[0]]) // Select first department by default
    }
    if (years.length > 0 && selectedYears.length === 0) {
      setSelectedYears([years[0]]) // Select latest year by default
    }
  }, [departments, years, selectedDepartments.length, selectedYears.length])

  // Calculate chart data based on selections
  const chartData = useMemo(() => {
    if (selectedDepartments.length === 0 || selectedYears.length === 0) {
      return []
    }

    // Group data by year for stacked bar chart
    const yearData = {}
    
    selectedYears.forEach(year => {
      yearData[year] = {}
      selectedDepartments.forEach(department => {
        const count = projects.filter(project => {
          // Check if project belongs to this department
          const projectDepts = project.leadDepartment ? 
            project.leadDepartment.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0) : []
          
          // Check if project year matches
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
          
          return projectDepts.includes(department) && projectYear === year
        }).length
        
        yearData[year][department] = count
      })
    })
    
    return yearData
  }, [projects, selectedDepartments, selectedYears])

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    if (!chartData || Object.keys(chartData).length === 0) return 0
    
    return Math.max(
      ...Object.values(chartData).map(yearData => 
        Object.values(yearData).reduce((sum, count) => sum + count, 0)
      )
    )
  }, [chartData])

  // Calculate total for each year
  const yearTotals = useMemo(() => {
    if (!chartData || Object.keys(chartData).length === 0) return {}
    
    const totals = {}
    Object.keys(chartData).forEach(year => {
      totals[year] = Object.values(chartData[year]).reduce((sum, count) => sum + count, 0)
    })
    return totals
  }, [chartData])

  // Handle department selection
  const handleDepartmentToggle = (department) => {
    setSelectedDepartments(prev => 
      prev.includes(department) 
        ? prev.filter(d => d !== department)
        : [...prev, department]
    )
  }

  // Handle year selection
  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  // Generate colors for departments
  const getDepartmentColor = (department) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ]
    const index = departments.indexOf(department) % colors.length
    return colors[index]
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Projects by Department and Year</h2>
      
      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Department Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Departments</h3>
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => handleDepartmentToggle(dept)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedDepartments.includes(dept)
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Year Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Years</h3>
          <div className="flex flex-wrap gap-2">
            {years.map(year => (
              <button
                key={year}
                onClick={() => handleYearToggle(year)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedYears.includes(year)
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {Object.keys(chartData).length > 0 ? (
          <div className="space-y-6">
            {/* Chart Bars */}
            <div className="space-y-4">
              {Object.keys(chartData).map(year => (
                <div key={year} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">{year}</div>
                    <div className="text-sm text-gray-600">Total: {yearTotals[year]}</div>
                  </div>
                  
                  {/* Stacked Bar */}
                  <div className="flex h-8 bg-gray-200 rounded-lg overflow-hidden">
                    {selectedDepartments.map(department => {
                      const count = chartData[year][department] || 0;
                      const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                      
                      return count > 0 ? (
                        <div
                          key={department}
                          className="h-full transition-all duration-300 flex items-center justify-center"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: getDepartmentColor(department),
                            minWidth: count > 0 ? '20px' : '0px'
                          }}
                          title={`${department}: ${count} projects`}
                        >
                          {count > 0 && (
                            <span className="text-xs font-medium text-white px-1 truncate">
                              {count}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Departments</h4>
              <div className="flex flex-wrap gap-3">
                {selectedDepartments.map(department => (
                  <div key={department} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getDepartmentColor(department) }}
                    />
                    <span className="text-sm text-gray-600">{department}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No data available for selected filters
          </div>
        )}
      </div>

      {/* Summary */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Total projects: {Object.values(yearTotals).reduce((sum, total) => sum + total, 0)}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectByDepartmentChart