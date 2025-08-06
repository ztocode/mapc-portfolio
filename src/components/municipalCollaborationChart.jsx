import React, { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectAllProjects } from '../store/projectsSlice'

const MunicipalCollaborationChart = () => {
  const projects = useSelector(selectAllProjects)
  const [selectedYears, setSelectedYears] = useState([])

  // Get unique years from projects
  const years = useMemo(() => {
    const yearSet = new Set()
    
    projects.forEach(project => {
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
    
    return Array.from(yearSet).sort((a, b) => b - a) // Sort descending (newest first)
  }, [projects])

  // Set default selections
  useEffect(() => {
    if (years.length > 0 && selectedYears.length === 0) {
      setSelectedYears([years[0]]) // Select latest year by default
    }
  }, [years, selectedYears.length])

  // Calculate chart data based on selections
  const chartData = useMemo(() => {
    if (selectedYears.length === 0) { return [] }
    
    const yearData = {}
    const allCollaborationTypes = new Set()
    
    selectedYears.forEach(year => {
      yearData[year] = {}
      const yearProjects = projects.filter(project => {
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
        return projectYear === year
      })
      
      yearProjects.forEach(project => {
        let collaborationType = 'No Collaboration'
        if (project.municipalityCollaboration) {
          const collaboration = project.municipalityCollaboration.trim()
          if (collaboration.length > 0) {
            collaborationType = collaboration
          }
        }
        
        yearData[year][collaborationType] = (yearData[year][collaborationType] || 0) + 1
        allCollaborationTypes.add(collaborationType)
      })
    })
    
    return { yearData, allCollaborationTypes: Array.from(allCollaborationTypes).sort() }
  }, [projects, selectedYears])

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    if (!chartData.yearData || Object.keys(chartData.yearData).length === 0) return 0
    
    return Math.max(
      ...Object.values(chartData.yearData).map(yearData => 
        Object.values(yearData).reduce((sum, count) => sum + count, 0)
      )
    )
  }, [chartData])

  // Handle year selection
  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  // Generate colors for collaboration types
  const getCollaborationColor = (type) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
      '#F472B6', '#A78BFA', '#34D399', '#FBBF24', '#FB7185'
    ]
    const index = chartData.allCollaborationTypes?.indexOf(type) % colors.length || 0
    return colors[index]
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Municipal Collaboration by Year</h2>
      
      {/* Year Filter */}
      <div className="mb-6">
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

      {/* Grouped Bar Chart */}
      <div className="space-y-6">
        {Object.keys(chartData.yearData || {}).length > 0 ? (
          <div className="space-y-8">
            {/* Chart Bars */}
            <div className="space-y-6">
              {Object.keys(chartData.yearData).map(year => {
                const yearData = chartData.yearData[year]
                const yearTotal = Object.values(yearData).reduce((sum, count) => sum + count, 0)
                
                return (
                  <div key={year} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">{year}</div>
                      <div className="text-sm text-gray-600">Total: {yearTotal}</div>
                    </div>
                    
                    {/* Stacked Bar */}
                    <div className="flex h-8 bg-gray-200 rounded-lg overflow-hidden">
                      {chartData.allCollaborationTypes.map(type => {
                        const count = yearData[type] || 0
                        const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0
                        
                        return count > 0 ? (
                          <div
                            key={type}
                            className="h-full transition-all duration-300 flex items-center justify-center"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getCollaborationColor(type),
                              minWidth: count > 0 ? '20px' : '0px'
                            }}
                            title={`${type}: ${count} projects`}
                          >
                            {count > 0 && (
                              <span className="text-xs font-medium text-white px-1 truncate">
                                {count}
                              </span>
                            )}
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-8">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Collaboration Types</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartData.allCollaborationTypes?.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getCollaborationColor(type) }}
                    />
                    <span className="text-sm text-gray-600 truncate">{type}</span>
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
      {Object.keys(chartData.yearData || {}).length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Total projects: {Object.values(chartData.yearData).reduce((sum, yearData) => 
              sum + Object.values(yearData).reduce((yearSum, count) => yearSum + count, 0), 0
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MunicipalCollaborationChart 