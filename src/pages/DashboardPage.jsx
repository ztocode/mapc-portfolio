import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProjects, selectAllProjects, selectProjectsLoading, selectProjectsError, selectLastFetch, selectSelectedCategory } from '../store/projectsSlice'
import ProjectsTable from '../components/ProjectsTable'

const DashboardPage = () => {
  const dispatch = useDispatch()
  const projects = useSelector(selectAllProjects)
  const selectedCategory = useSelector(selectSelectedCategory)
  
  const [metrics, setMetrics] = useState({})
  const [chartData, setChartData] = useState([])
  const [viewMode, setViewMode] = useState('statistics') // 'statistics' or 'table'
  const [yearlyData, setYearlyData] = useState([])
  const [timeView, setTimeView] = useState('current') // 'current' or 'historical' or 'empty'
  const [currentYearData, setCurrentYearData] = useState({})
  const [historicalData, setHistoricalData] = useState({})
  const [emptyData, setEmptyData] = useState({})

  // Fetch projects on component mount
  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  useEffect(() => {
    // Filter projects based on selected category
    const filteredProjects = selectedCategory === 'all' 
      ? projects || []
      : projects?.filter(p => p.projectType === selectedCategory) || []

    const currentYear = new Date().getFullYear()
    
    // Separate current year and historical projects
    const currentYearProjects = []
    const historicalProjects = []
    const emptyProjects = []
    
    // Check if we have any projects at all
    if (filteredProjects.length === 0) {
      // No projects found - create empty data
      setEmptyData({
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
      
      if (projectYear && !isNaN(projectYear)) {
        if (projectYear === currentYear) {
          currentYearProjects.push(project)
        } else {
          historicalProjects.push(project)
        }
      } else {
        // Projects without valid years go to empty category
        emptyProjects.push(project)
      }
    })

    // Calculate current year metrics
    const currentYearStatusBreakdown = currentYearProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const currentYearTypeBreakdown = currentYearProjects.reduce((acc, project) => {
      const type = project.projectType || 'Other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const currentYearDepartmentBreakdown = currentYearProjects.reduce((acc, project) => {
      const dept = project.leadDepartment || 'Not Assigned'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {})

    // Calculate historical metrics
    const historicalStatusBreakdown = historicalProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const historicalTypeBreakdown = historicalProjects.reduce((acc, project) => {
      const type = project.projectType || 'Other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const historicalDepartmentBreakdown = historicalProjects.reduce((acc, project) => {
      const dept = project.leadDepartment || 'Not Assigned'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {})

    // Calculate empty projects metrics (projects without valid years)
    const emptyStatusBreakdown = emptyProjects.reduce((acc, project) => {
      const status = project.projectStatus || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const emptyTypeBreakdown = emptyProjects.reduce((acc, project) => {
      const type = project.projectType || 'Other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const emptyDepartmentBreakdown = emptyProjects.reduce((acc, project) => {
      const dept = project.leadDepartment || 'Not Assigned'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {})

    // Calculate active projects (in progress, ongoing, development)
    const activeStatuses = ['In Progress', 'Service (On Going)', 'In Development', 'Completed', 'Suspended']
    const currentYearActiveProjects = currentYearProjects.filter(project => 
      activeStatuses.some(status => 
        project.projectStatus && project.projectStatus.toLowerCase().includes(status.toLowerCase())
      )
    )

    const historicalActiveProjects = historicalProjects.filter(project => 
      activeStatuses.some(status => 
        project.projectStatus && project.projectStatus.toLowerCase().includes(status.toLowerCase())
      )
    )

    const emptyActiveProjects = emptyProjects.filter(project => 
      activeStatuses.some(status => 
        project.projectStatus && project.projectStatus.toLowerCase().includes(status.toLowerCase())
      )
    )

    // Calculate yearly project distribution for all projects
    const yearlyProjects = {}
    
    filteredProjects.forEach(project => {
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
      statusBreakdown: currentYearStatusBreakdown,
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
      statusBreakdown: historicalStatusBreakdown,
      typeBreakdown: historicalTypeBreakdown,
      departmentBreakdown: historicalDepartmentBreakdown
    })

    // Set empty data
    setEmptyData({
      projectCount: { 
        total: emptyProjects.length,
        active: emptyActiveProjects.length,
        category: selectedCategory === 'all' ? 'All Projects' : selectedCategory
      },
      statusBreakdown: emptyStatusBreakdown,
      typeBreakdown: emptyTypeBreakdown,
      departmentBreakdown: emptyDepartmentBreakdown
    })

    // Set metrics based on current time view
    if (timeView === 'current') {
      setMetrics(currentYearData)
    } else if (timeView === 'historical') {
      setMetrics(historicalData)
    } else {
      setMetrics(emptyData)
    }
    
    setYearlyData(yearlyChartData)

  }, [projects, selectedCategory, timeView])

  // Update metrics when time view changes
  useEffect(() => {
    if (timeView === 'current') {
      setMetrics(currentYearData)
    } else if (timeView === 'historical') {
      setMetrics(historicalData)
    } else {
      setMetrics(emptyData)
    }
  }, [timeView, currentYearData, historicalData, emptyData])

  const ProjectCountCard = ({ selected, total, category }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Selected Projects</p>
          <div className="flex items-center justify-center space-x-4">
            <div>
              <p className="text-3xl font-bold text-blue-600">{selected}</p>
              <p className="text-sm text-gray-500">Selected</p>
            </div>
            <div className="text-gray-300 text-2xl">/</div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {category === 'All Projects' ? 'All projects from past to now' : `${category} projects from past to now`}
          </p>
        </div>
      </div>
    )
  }

  const MetricCard = ({ title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      purple: 'text-purple-600'
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    )
  }

  const BreakdownCard = ({ title, data, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      purple: 'bg-purple-100 text-purple-800'
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{key}</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[color]}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const YearlyBreakdownCard = () => {
    // Convert yearly data to breakdown format
    const yearlyBreakdown = yearlyData.reduce((acc, data) => {
      acc[data.year] = data.count
      return acc
    }, {})

    return (
      <BreakdownCard
        title="Project Distribution by Year"
        data={yearlyBreakdown}
        color="blue"
      />
    )
  }

  const StatisticsView = () => {
    // Get all unique status values from the data
    const statusValues = Object.keys(metrics.statusBreakdown || {})
    const currentYear = new Date().getFullYear()
    
    return (
      <div className="space-y-6">
        {/* Time View Toggle */}
        <div className="flex justify-center">
          <div className="flex bg-gray-200 rounded-lg p-1 space-x-2">
            <button
              onClick={() => setTimeView('current')}
              className={`px-10 py-4 text-sm font-medium rounded-md transition-colors mx-2 mr-2 ${
                timeView === 'current'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {currentYear} (Current Year)
            </button>
            <button
              onClick={() => setTimeView('historical')}
              className={`px-10 py-4 text-sm font-medium rounded-md transition-colors mx-2 mr-2 ${
                timeView === 'historical'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Historical (All Years)
            </button>
            <button
              onClick={() => setTimeView('empty')}
              className={`px-10 py-4 text-sm font-medium rounded-md transition-colors mx-2 mr-2 ${
                timeView === 'empty'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Missing Project Year
            </button>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-6">
          

          {/* Dynamically generate status metric cards */}
          {statusValues.slice(0, 4).map((status, index) => (
            <MetricCard
              key={status}
              title={status}
              value={metrics.statusBreakdown[status] || 0}
              subtitle={`${status} projects`}
              color={index % 5 === 0 ? 'blue' : 
                     index % 5 === 1 ? 'green' : 
                     index % 5 === 2 ? 'yellow' : 
                     index % 5 === 3 ? 'purple' : 'red'}
            />
          ))}
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-3 gap-6">
          <BreakdownCard
            title="Project Types"
            data={metrics.typeBreakdown || {}}
            color="green"
          />
          <BreakdownCard
            title="Departments"
            data={metrics.departmentBreakdown || {}}
            color="purple"
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
        <div className="mb-6">
          <div className="text-sm text-gray-600">
            Showing projects for: <span className="font-medium">{selectedCategory}</span>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <ProjectsTable />
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Project Portfolio</p>
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('statistics')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'statistics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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

      {/* Project Count Card - Always visible */}
      <div className="mb-8">
        <ProjectCountCard
          selected={selectedCategory === 'all' ? (projects?.length || 0) : (projects?.filter(p => p.projectType === selectedCategory).length || 0)}
          total={projects?.length || 0}
          category={selectedCategory === 'all' ? 'All Projects' : selectedCategory}
        />
      </div>

      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'statistics' ? <StatisticsView /> : <TableView />}
    </div>
  )
}

export default DashboardPage 