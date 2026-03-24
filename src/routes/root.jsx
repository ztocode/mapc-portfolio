import Layout from '../components/Layout'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const Root = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [selectedCity, setSelectedCity] = useState(null)
    const [selectedCitySource, setSelectedCitySource] = useState(null)
    const [selectedCityTowns, setSelectedCityTowns] = useState([])
    const [viewMode, setViewMode] = useState('city')
    const [selectedGeographicCount, setSelectedGeographicCount] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [tableSearchTerm, setTableSearchTerm] = useState('')
    const [selectedDepartments, setSelectedDepartments] = useState([])
    const [selectedProjectTypes, setSelectedProjectTypes] = useState([])
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false)
    const [showProjectTypeDropdown, setShowProjectTypeDropdown] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState(null)
    const [departmentProjects, setDepartmentProjects] = useState([])
    const [showDepartmentPopup, setShowDepartmentPopup] = useState(false)
    const [selectedYears, setSelectedYears] = useState([])
    const [showYearDropdown, setShowYearDropdown] = useState(false)
    const [selectedStatuses, setSelectedStatuses] = useState([])
    const [showStatusDropdown, setShowStatusDropdown] = useState(false)
    const [clickedCategoryType, setClickedCategoryType] = useState('')
    const [timeView, setTimeView] = useState('historical')
    const location = useLocation()

    // Determine current page
    const currentPage = location.pathname === '/map' || location.pathname === '/map/' ? 'map' : 'dashboard'

    // Reset selected city when leaving map page
    useEffect(() => {
        if (currentPage !== 'map') {
            setSelectedCity(null)
            setSelectedCitySource(null)
            setSelectedCityTowns([])
            setViewMode('city')
            setSelectedGeographicCount(null)
            setSelectedProject(null)
        }
    }, [currentPage])

    const handleCitySelect = (city, options = {}) => {
        setSelectedCity(city)
        setSelectedCitySource(options?.source || null)
        setSelectedCityTowns(Array.isArray(options?.towns) ? options.towns : [])
    }

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

    // Check if sidebar should be visible
    const isSidebarVisible = currentPage !== 'dashboard' && viewMode !== 'year'

    return (
       <Layout>
        <Navbar />
        <main className={`flex flex-1 min-h-0 ${!isSidebarVisible ? 'w-full' : ''}`}>
            {isSidebarVisible && (
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={toggleSidebar}
                    currentPage={currentPage}
                    selectedCity={selectedCity}
                    onCitySelect={handleCitySelect}
                    viewMode={viewMode}
                    selectedGeographicCount={selectedGeographicCount}
                    onProjectSelect={setSelectedProject}
                    selectedProject={selectedProject}
                />
            )}
            <div className={`${isSidebarVisible ? 'flex-1' : 'w-full'} transition-all duration-300 overflow-y-auto h-full`}>
                <Outlet context={{ 
                    selectedCity, 
                    setSelectedCity,
                    selectedCitySource,
                    setSelectedCitySource,
                    selectedCityTowns,
                    setSelectedCityWithSource: handleCitySelect,
                    viewMode,
                    setViewMode,
                    selectedGeographicCount,
                    setSelectedGeographicCount,
                    selectedProject,
                    setSelectedProject,
                    isSidebarCollapsed,
                }} />
            </div>
        </main>
        <Footer />
       </Layout>
    )
}

export default Root;