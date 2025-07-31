import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useOutletContext } from 'react-router-dom'
import { fetchProjects, selectAllProjects, selectProjectsLoading, selectProjectsError, selectLastFetch, selectSelectedCategory } from '../store/projectsSlice'
import ProjectsTable from '../components/ProjectsTable'
import BreakdownCard from '../components/BreakdownCard'

const DashboardPage = () => {
  const { sidebarSearchTerm } = useOutletContext()
  const dispatch = useDispatch()
  const projects = useSelector(selectAllProjects)
  const selectedCategory = useSelector(selectSelectedCategory)
  const loading = useSelector(selectProjectsLoading)
  const error = useSelector(selectProjectsError)
  
  const [metrics, setMetrics] = useState({})
  const [chartData, setChartData] = useState([])
  const [viewMode, setViewMode] = useState('statistics') // 'statistics' or 'table'
  const [yearlyData, setYearlyData] = useState([])
  const [timeView, setTimeView] = useState('historical') // 'current' or 'historical' or 'missing'
  const [currentYearData, setCurrentYearData] = useState({})
  const [historicalData, setHistoricalData] = useState({})
  const [missingData, setMissingData] = useState({})
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [departmentProjects, setDepartmentProjects] = useState([])
  const [showDepartmentPopup, setShowDepartmentPopup] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false)
  const [selectedYears, setSelectedYears] = useState([])
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [clickedCategoryType, setClickedCategoryType] = useState('') // Track what type of category was clicked
  const departmentDropdownRef = useRef(null)
  const yearDropdownRef = useRef(null)
  const statusDropdownRef = useRef(null)

  // Fetch projects on component mount
  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  useEffect(() => {
    // Filter projects based on selected category
    const filteredProjects = selectedCategory === 'all' 
      ? projects || []
      : selectedCategory === 'others'
      ? projects?.filter(p => !p.projectType || p.projectType === '' || p.projectType === null) || []
      : projects?.filter(p => p.projectType === selectedCategory) || []

    const currentYear = new Date().getFullYear()
    
    // Separate current year and historical projects
    const currentYearProjects = []
    const historicalProjects = []
    const missingYearProjects = []

    if (filteredProjects.length === 0) {
      // No projects found - create empty data
      setMetrics({
        projectCount: { 
          total: 0,
          active: 0,
          category: selectedCategory === 'all' ? 'All Projects' : selectedCategory
        },
        statusBreakdown: {},
        typeBreakdown: {},
        departmentBreakdown: {}
      })
    }
    
    filteredProjects.forEach(project => {
      let projectYear = null
      
      // Only use projectYear field, no fallback to startDate
      if (project.projectYear) {
        // Handle different formats of projectYear
        const yearStr = project.projectYear.toString().trim()
        if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
          const parsedYear = parseInt(yearStr)
          if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
            projectYear = parsedYear
          }
        }
      }
      
      if (projectYear && !isNaN(projectYear)) {
        if (projectYear === currentYear) {
          currentYearProjects.push(project)
        } else {
          historicalProjects.push(project)
        }
      } else {
        missingYearProjects.push(project)
      }
    })

    // Calculate status breakdown for ALL filtered projects (not separated by time)
    const allProjectsStatusBreakdown = filteredProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    // Calculate current year metrics
    const currentYearStatusBreakdown = currentYearProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const currentYearTypeBreakdown = currentYearProjects.reduce((acc, project) => {
      const type = project.projectType || 'Others'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const currentYearDepartmentBreakdown = currentYearProjects.reduce((acc, project) => {
      const dept = project.leadDepartment || 'Not Assigned'
      // Split departments by common delimiters and count each one
      const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
      departments.forEach(department => {
        acc[department] = (acc[department] || 0) + 1
      })
      return acc
    }, {})

    // Calculate historical metrics
    const historicalStatusBreakdown = historicalProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const historicalTypeBreakdown = historicalProjects.reduce((acc, project) => {
      const type = project.projectType || 'Others'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const historicalDepartmentBreakdown = historicalProjects.reduce((acc, project) => {
      const dept = project.leadDepartment || 'Not Assigned'
      // Split departments by common delimiters and count each one
      const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
      departments.forEach(department => {
        acc[department] = (acc[department] || 0) + 1
      })
      return acc
    }, {})

    // Calculate active projects (in progress, ongoing, development)
    const activeStatuses = ['In Progress', 'Service (On Going)', 'In Development', 'Completed', 'Suspended']
    

    
    const currentYearActiveProjects = currentYearProjects.filter(project => 
      activeStatuses.some(status => 
        (project.projectStatus || 'Unknown').toLowerCase().includes(status.toLowerCase())
      )
    )

    const historicalActiveProjects = historicalProjects.filter(project => 
      activeStatuses.some(status => 
        (project.projectStatus || 'Unknown').toLowerCase().includes(status.toLowerCase())
      )
    )

    // Calculate yearly project distribution for all projects
    const yearlyProjects = {}
    
    projects.forEach(project => {
      let projectYear = null
      
      if (project.projectYear) {
        projectYear = parseInt(project.projectYear)
      } else if (project.startDate) {
        const date = new Date(project.startDate)
        if (!isNaN(date.getFullYear())) {
          projectYear = date.getFullYear()
        }
      }
      
      if (projectYear && !isNaN(projectYear)) {
        if (!yearlyProjects[projectYear]) {
          yearlyProjects[projectYear] = []
        }
        yearlyProjects[projectYear].push(project)
      }
    })

    const yearlyChartData = Object.entries(yearlyProjects)
      .map(([year, projects]) => ({
        year: parseInt(year),
        count: projects.length,
        projects: projects.map(p => p.name || 'Unnamed Project')
      }))
      .sort((a, b) => b.year - a.year)

    // Set current year data
    setCurrentYearData({
      projectCount: { 
        total: currentYearProjects.length,
        active: currentYearActiveProjects.length,
        category: selectedCategory === 'all' ? 'All Projects' : selectedCategory
      },
      statusBreakdown: allProjectsStatusBreakdown, // Use all projects status breakdown
      typeBreakdown: currentYearTypeBreakdown,
      departmentBreakdown: currentYearDepartmentBreakdown
    })

    // Set historical data
    setHistoricalData({
      projectCount: { 
        total: historicalProjects.length,
        active: historicalActiveProjects.length,
        category: selectedCategory === 'all' ? 'All Projects' : selectedCategory
      },
      statusBreakdown: allProjectsStatusBreakdown, // Use all projects status breakdown
      typeBreakdown: historicalTypeBreakdown,
      departmentBreakdown: historicalDepartmentBreakdown
    })

    // Set missing data
    setMissingData({
      projectCount: {
        total: missingYearProjects.length,
        active: missingYearProjects.filter(p => activeStatuses.some(status => (p.projectStatus || 'Unknown').toLowerCase().includes(status.toLowerCase()))).length,
        category: selectedCategory === 'all' ? 'All Projects' : selectedCategory
      },
      statusBreakdown: missingYearProjects.reduce((acc, project) => {
        const status = project.projectStatus || 'Unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}),
      typeBreakdown: missingYearProjects.reduce((acc, project) => {
        const type = project.projectType || 'Others'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {}),
      departmentBreakdown: missingYearProjects.reduce((acc, project) => {
        const dept = project.leadDepartment || 'Not Assigned'
        const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
        departments.forEach(department => {
          acc[department] = (acc[department] || 0) + 1
        })
        return acc
      }, {})
    })

    // Set metrics based on current time view
    if (timeView === 'current') {
      setMetrics(currentYearData)
    } else if (timeView === 'historical') {
      setMetrics(historicalData)
    } else if (timeView === 'missing') {
      setMetrics(missingData)
    }
    
    setYearlyData(yearlyChartData)

  }, [projects, selectedCategory, timeView])

  // Update metrics when time view changes
  useEffect(() => {
    // Recalculate metrics based on current time view
    if (timeView === 'current') {
      setMetrics(currentYearData)
    } else if (timeView === 'historical') {
      setMetrics(historicalData)
    } else if (timeView === 'missing') {
      setMetrics(missingData)
    }
  }, [timeView, currentYearData, historicalData, missingData])

  // Function to get projects for a specific department
  const getProjectsForDepartment = (departmentName) => {
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
        return !project.projectYear || project.projectYear.toString().trim() === 'null' || project.projectYear.toString().trim() === 'undefined' || project.projectYear.toString().trim() === ''
      })
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'others') {
        targetProjects = targetProjects.filter(p => !p.projectType || p.projectType === '' || p.projectType === null)
      } else {
        targetProjects = targetProjects.filter(p => p.projectType === selectedCategory)
      }
    }

    return targetProjects.filter(project => {
      const dept = project.leadDepartment || 'Not Assigned'
      const departments = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
      return departments.includes(departmentName)
    })
  }

  // Function to handle department click
  const handleDepartmentClick = (departmentName) => {
    const projects = getProjectsForDepartment(departmentName)
    setSelectedDepartment(departmentName)
    setDepartmentProjects(projects)
    setShowDepartmentPopup(true)
  }

  // Get unique departments from all projects
  const getAllDepartments = () => {
    const departments = new Set()
    projects.forEach(project => {
      const dept = project.leadDepartment || 'Not Assigned'
      const deptList = dept.split(/[,;|&]/).map(d => d.trim()).filter(d => d.length > 0)
      deptList.forEach(d => departments.add(d))
    })
    return Array.from(departments).sort()
  }

  // Get unique years from all projects
  const getAllYears = () => {
    const years = new Set()
    projects.forEach(project => {
      let projectYear = null
      
      // Only use projectYear field, no fallback to startDate
      if (project.projectYear) {
        const yearStr = project.projectYear.toString().trim()
        if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
          const parsedYear = parseInt(yearStr)
          if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
            projectYear = parsedYear
          }
        }
      }
      
      if (projectYear && !isNaN(projectYear)) {
        years.add(projectYear)
      }
    })
    return Array.from(years).sort((a, b) => b - a) // Sort descending (newest first)
  }

  // Get unique statuses from all projects
  const getAllStatuses = () => {
    const statuses = new Set()
    projects.forEach(project => {
      const status = project.projectStatus || 'Unknown'
      statuses.add(status)
    })
    return Array.from(statuses).sort()
  }

  // Handle department filter toggle
  const handleDepartmentToggle = (department) => {
    setSelectedDepartments(prev => 
      prev.includes(department) 
        ? prev.filter(d => d !== department)
        : [...prev, department]
    )
  }

  // Handle year filter toggle
  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  // Handle status filter toggle
  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedDepartments([])
    setSelectedYears([])
    setSelectedStatuses([])
  }

  // Clear table filters when category changes
  useEffect(() => {
    clearAllFilters()
    // Keep the current year view selection when changing categories
    // Don't reset timeView here
  }, [selectedCategory])



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setShowDepartmentDropdown(false)
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])



  const MetricCard = ({ title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      purple: 'text-purple-600'
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 w-[260px]">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2 break-words">{title}</p>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{subtitle}</p>}
        </div>
      </div>
    )
  }

  const StatusMetrics = ({ statusBreakdown }) => {
    const statusValues = Object.keys(statusBreakdown || {})
    
    const handleStatusClick = (status) => {
      // Filter projects by status and time view
      let filteredProjects = []
      
      if (timeView === 'current') {
        // Filter for current year projects with the selected status
        filteredProjects = projects.filter(project => {
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
          return projectYear === new Date().getFullYear() && (project.projectStatus || 'Unknown') === status
        })
      } else if (timeView === 'historical') {
        // Filter for historical projects with the selected status
        filteredProjects = projects.filter(project => {
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
          return projectYear && projectYear !== new Date().getFullYear() && (project.projectStatus || 'Unknown') === status
        })
      } else if (timeView === 'missing') {
        // Filter for projects with missing project years with the selected status
        filteredProjects = projects.filter(project => {
          return (!project.projectYear || 
                  project.projectYear.toString().trim() === 'null' || 
                  project.projectYear.toString().trim() === 'undefined' || 
                  project.projectYear.toString().trim() === '' ||
                  isNaN(parseInt(project.projectYear.toString().trim()))) && 
                 (project.projectStatus || 'Unknown') === status
        })
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'others') {
          filteredProjects = filteredProjects.filter(p => !p.projectType || p.projectType === '' || p.projectType === null)
        } else {
          filteredProjects = filteredProjects.filter(p => p.projectType === selectedCategory)
        }
      }

      setSelectedDepartment(status)
      setClickedCategoryType('Status')
      setDepartmentProjects(filteredProjects)
      setShowDepartmentPopup(true)
    }
    
    return (
      <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6 justify-center">
        {statusValues.map((status, index) => (
          <div 
            key={status}
            onClick={() => handleStatusClick(status)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <MetricCard
              title={status}
              value={(statusBreakdown && statusBreakdown[status]) || 0}
              subtitle={`${status} projects`}
              color={index % 5 === 0 ? 'blue' : 
                     index % 5 === 1 ? 'green' : 
                     index % 5 === 2 ? 'yellow' : 
                     index % 5 === 3 ? 'purple' : 'red'}
            />
          </div>
        ))}
      </div>
    )
  }

  const YearlyBreakdownCard = () => {
    // Get the correct projects based on selected category
    const filteredProjects = selectedCategory === 'all' 
      ? projects || []
      : selectedCategory === 'others'
      ? projects?.filter(p => !p.projectType || p.projectType === '' || p.projectType === null) || []
      : projects?.filter(p => p.projectType === selectedCategory) || []

    // Convert yearly data to breakdown format based on time view
    let yearlyBreakdown = {}
    
    if (timeView === 'current') {
      // Only current year
      const currentYear = new Date().getFullYear()
      const currentYearProjects = filteredProjects.filter(project => {
        let projectYear = null
        
        // using projectYear field
        if (project.projectYear) {
          const yearStr = project.projectYear.toString().trim()
          if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
            const parsedYear = parseInt(yearStr)
            if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
              projectYear = parsedYear
            }
          }
        }
        
        return projectYear === currentYear
      })
      yearlyBreakdown = { [currentYear]: currentYearProjects.length }
    } else if (timeView === 'historical') {
      // All years including current
      const yearlyProjects = {}
      
      filteredProjects.forEach(project => {
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
        
        if (projectYear && !isNaN(projectYear)) {
          if (!yearlyProjects[projectYear]) {
            yearlyProjects[projectYear] = []
          }
          yearlyProjects[projectYear].push(project)
        }
      })

      yearlyBreakdown = Object.entries(yearlyProjects).reduce((acc, [year, projects]) => {
        acc[year] = projects.length
        return acc
      }, {})
    } else if (timeView === 'missing') {
      // Missing year: show empty since these projects don't have valid years
      yearlyBreakdown = {}
    }

    const handleYearClick = (year) => {
      // Filter projects by year from the filtered projects array
      const yearProjects = filteredProjects.filter(project => {
        let projectYear = null
        
        // Only use projectYear field
        if (project.projectYear) {
          const yearStr = project.projectYear.toString().trim()
          if (yearStr && yearStr !== 'null' && yearStr !== 'undefined' && yearStr !== '') {
            const parsedYear = parseInt(yearStr)
            if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
              projectYear = parsedYear
            }
          }
        }
        
        return projectYear === parseInt(year)
      })
      
      if (yearProjects.length > 0) {
        setSelectedDepartment(year.toString())
        setClickedCategoryType('Year')
        setDepartmentProjects(yearProjects)
        setShowDepartmentPopup(true)
      }
    }

    return (
      <div className="cursor-pointer">
        <BreakdownCard
          title="Project Distribution by Year"
          data={yearlyBreakdown}
          color="blue"
          sortNumeric={true}
          scrollable={true}
          onItemClick={handleYearClick}
          projects={filteredProjects}
          setSelectedDepartment={setSelectedDepartment}
          setClickedCategoryType={setClickedCategoryType}
          setDepartmentProjects={setDepartmentProjects}
          setShowDepartmentPopup={setShowDepartmentPopup}
        />
      </div>
    )
  }

  const StatisticsView = () => {
    // Get all unique status values from the data
    const statusValues = Object.keys(metrics.statusBreakdown || {})
    const currentYear = new Date().getFullYear()
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Main Metrics */}
        <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6 justify-center">
          {/* Status Metrics */}
          <StatusMetrics statusBreakdown={metrics.statusBreakdown || {}} />
        </div>

        {/* Time View Toggle */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[420px] h-8 sm:h-10 flex items-center justify-between bg-gray-100 rounded-full shadow-inner px-1 sm:px-2 custom-segmented-switch">
            {['current', 'historical', 'missing'].map((key, idx) => {
              const labels = {
                current: `${currentYear} (Current Year)`,
                historical: 'Historical (All Years)',
                missing: 'Missing Project Year',
              }
              const isActive = timeView === key
              return (
                <button
                  key={key}
                  onClick={() => setTimeView(key)}
                  className={`relative flex-1 h-6 sm:h-8 mx-0.5 sm:mx-1 rounded-full z-10 transition-all duration-300 font-semibold text-xs sm:text-sm focus:outline-none flex items-center justify-center
                    ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700'}
                  `}
                  style={{
                    boxShadow: isActive ? '0 2px 8px 0 rgba(59,130,246,0.15)' : 'none',
                  }}
                  tabIndex={isActive ? 0 : -1}
                  aria-pressed={isActive}
                >
                  <span className="hidden sm:inline text-center">{labels[key]}</span>
                  <span className="sm:hidden text-center">
                    {key === 'current' ? 'Current' : key === 'historical' ? 'Historical' : 'Missing'}
                  </span>
                </button>
              )
            })}
            {/* Animated background */}
            <span
              className="absolute top-1 sm:top-1 left-1 sm:left-2 h-6 sm:h-8 rounded-full bg-blue-600 transition-all duration-300 z-0"
              style={{
                width: 'calc(33.333% - 4px)',
                transform:
                  timeView === 'current'
                    ? 'translateX(0%)'
                    : timeView === 'historical'
                    ? 'translateX(100%)'
                    : 'translateX(200%)',
              }}
            />
          </div>
        </div>

        {/* Custom CSS for segmented switch */}
        <style>{`
          .custom-segmented-switch {
            position: relative;
            overflow: hidden;
          }
          .custom-segmented-switch button {
            background: transparent;
          }
          .custom-segmented-switch span {
            box-shadow: 0 2px 8px 0 rgba(59,130,246,0.15);
          }
        `}</style>

        {/* Breakdowns */}
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
          <BreakdownCard
            title="Project Types"
            data={metrics.typeBreakdown || {}}
            color="green"
            scrollable={true}
            breakWords={true}
            projects={projects}
            setSelectedDepartment={setSelectedDepartment}
            setClickedCategoryType={setClickedCategoryType}
            setDepartmentProjects={setDepartmentProjects}
            setShowDepartmentPopup={setShowDepartmentPopup}
            timeView={timeView}
            selectedCategory={selectedCategory}
          />
          <BreakdownCard
            title="Departments"
            data={metrics.departmentBreakdown || {}}
            color="purple"
            sortKeys={true}
            scrollable={true}
            isDepartment={true}
            projects={projects}
            setSelectedDepartment={setSelectedDepartment}
            setClickedCategoryType={setClickedCategoryType}
            setDepartmentProjects={setDepartmentProjects}
            setShowDepartmentPopup={setShowDepartmentPopup}
            timeView={timeView}
            selectedCategory={selectedCategory}
          />
          <YearlyBreakdownCard />
        </div>
      </div>
    )
  }

  const TableView = () => (
    <div>
      {/* Category Info */}
      {selectedCategory !== 'all' && (
        <div className="mb-4 sm:mb-6">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing projects for: <span className="font-medium">{selectedCategory}</span>
          </div>
        </div>
      )}



      {/* Table Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-row gap-4">
          <div className="flex flex-row gap-4 flex-1">
            {/* Department Filter */}
            <div className="relative flex-1" ref={departmentDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Department</label>
              <button
                onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
              >
                <span className="truncate">
                  {selectedDepartments.length === 0 
                    ? 'All Departments'
                    : selectedDepartments.length === 1 
                      ? selectedDepartments[0] 
                      : `${selectedDepartments.length} Departments Selected`
                  }
                </span>
                <div className="flex items-center space-x-2">
                  {selectedDepartments.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {selectedDepartments.length}
                    </span>
                  )}
                  <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`}></i>
                </div>
              </button>
              
              {showDepartmentDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  <div className="p-2">
                    {getAllDepartments().map((department) => (
                      <label key={department} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(department)}
                          onChange={() => handleDepartmentToggle(department)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{department}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Year Filter */}
            <div className="relative flex-1" ref={yearDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Project Year</label>
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
              >
                <span className="truncate">
                  {selectedYears.length === 0 
                    ? 'All Years'
                    : selectedYears.length === 1 
                      ? selectedYears[0] 
                      : `${selectedYears.length} Years Selected`
                  }
                </span>
                <div className="flex items-center space-x-2">
                  {selectedYears.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      {selectedYears.length}
                    </span>
                  )}
                  <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}></i>
                </div>
              </button>
              
              {showYearDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  <div className="p-2">
                    {getAllYears().map((year) => (
                      <label key={year} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(year)}
                          onChange={() => handleYearToggle(year)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Status Filter */}
            <div className="relative flex-1" ref={statusDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
              >
                <span className="truncate">
                  {selectedStatuses.length === 0 
                    ? 'All Statuses'
                    : selectedStatuses.length === 1 
                      ? selectedStatuses[0] 
                      : `${selectedStatuses.length} Statuses Selected`
                  }
                </span>
                <div className="flex items-center space-x-2">
                  {selectedStatuses.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {selectedStatuses.length}
                    </span>
                  )}
                  <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`}></i>
                </div>
              </button>
              
              {showStatusDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  <div className="p-2">
                    {getAllStatuses().map((status) => (
                      <label key={status} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => handleStatusToggle(status)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedDepartments.length > 0 || selectedYears.length > 0 || selectedStatuses.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {selectedDepartments.map((dept) => (
                <span key={dept} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {dept}
                  <button
                    onClick={() => handleDepartmentToggle(dept)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedYears.map((year) => (
                <span key={year} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                  {year}
                  <button
                    onClick={() => handleYearToggle(year)}
                    className="ml-1 text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedStatuses.map((status) => (
                <span key={status} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {status}
                  <button
                    onClick={() => handleStatusToggle(status)}
                    className="ml-1 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto">
        <ProjectsTable 
          departmentFilter={selectedDepartments}
          yearFilter={selectedYears}
          statusFilter={selectedStatuses}
        />
      </div>
    </div>
  )

  // Loading mask component
  const LoadingMask = () => (
    <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(209, 213, 219, 0.5)' }}>
      <div className="text-center bg-white bg-opacity-90 rounded-lg p-6 shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">Loading Dashboard Data</p>
        <p className="text-sm text-gray-600">Please wait while we fetch the project information...</p>
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
    <div className="p-4 sm:p-6">
      {/* Loading Mask */}
      {loading && <LoadingMask />}
      
      {/* Error Display */}
      {error && <ErrorDisplay />}
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center justify-between mt-1 sm:mt-2 w-full">
            <p className="text-gray-600">Project Portfolio</p>
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 w-48">
              <button
                onClick={() => setViewMode('statistics')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'statistics'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'statistics' ? <StatisticsView /> : <TableView />}

      {/* Department/Status Projects Popup */}
      {showDepartmentPopup && departmentProjects.length > 0 && (
        <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(209, 213, 219, 0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-[800px] max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 break-words leading-tight">
                  {clickedCategoryType}: {selectedDepartment}
                </h2>
                <p className="text-sm text-gray-600 break-words leading-tight mt-1">
                  {departmentProjects.length} projects found
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDepartmentPopup(false)
                  setSelectedDepartment(null)
                  setClickedCategoryType('')
                  setDepartmentProjects([])
                }}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {departmentProjects
                  .sort((a, b) => (a.name || 'Unnamed Project').localeCompare(b.name || 'Unnamed Project'))
                  .map((project, index) => (
                  <div key={project.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 break-words leading-tight">
                          {project.name || 'Unnamed Project'}
                        </h3>
                        <p className="text-sm text-gray-600 break-words leading-tight mt-1">
                          Client: {project.client || 'Not specified'}
                        </p>
                        <p className="text-sm text-gray-600 break-words leading-tight mt-1">
                          Manager: {project.projectManager || 'Not assigned'}
                        </p>
                        {project.metroCommon2050goals && (
                          <p className="text-sm text-gray-600 break-words leading-tight mt-1">
                            MetroCommon 2050 Goals: {project.metroCommon2050goals}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {project.projectStatus || 'Unknown'}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {project.projectType || 'Others'}
                          </span>
                          {project.leadDepartment && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              {project.leadDepartment}
                            </span>
                          )}
                          {project.projectYear && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              {project.projectYear}
                            </span>
                          )}
                        </div>
                        {project.projectDescription && (
                          <p className="text-sm text-gray-700 break-words leading-relaxed mt-2">
                            {project.projectDescription.length > 200 
                              ? `${project.projectDescription.substring(0, 200)}...` 
                              : project.projectDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage 