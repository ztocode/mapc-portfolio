import Layout from '../components/Layout'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const Root = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [selectedCity, setSelectedCity] = useState(null)
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
    const [mapcSubregionsData, setMapcSubregionsData] = useState(null)
    const location = useLocation()

    // Determine current page
    const currentPage = location.pathname === '/map' ? 'map' : 'dashboard'

    // Load MAPC Subregions GeoJSON
    useEffect(() => {
        fetch('/data/MAPC_Subregions.geojson')
            .then(response => response.json())
            .then(data => setMapcSubregionsData(data))
            .catch(error => console.error('Error loading MAPC Subregions GeoJSON:', error))
    }, [])

    // Reset selected city when leaving map page
    useEffect(() => {
        if (currentPage !== 'map') {
            setSelectedCity(null)
            setViewMode('city')
            setSelectedGeographicCount(null)
            setSelectedProject(null)
        }
    }, [currentPage])

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

    // Check if sidebar should be visible
    const isSidebarVisible = currentPage !== 'dashboard' && viewMode !== 'year'

    return (
       <Layout>
        <Navbar />
        <main className={`flex flex-1 min-h-0 ${!isSidebarVisible ? 'w-screen' : ''}`}>
            {isSidebarVisible && (
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={toggleSidebar}
                    currentPage={currentPage}
                    selectedCity={selectedCity}
                    onCitySelect={setSelectedCity}
                    viewMode={viewMode}
                    selectedGeographicCount={selectedGeographicCount}
                    onProjectSelect={setSelectedProject}
                    selectedProject={selectedProject}
                    mapcSubregionsData={mapcSubregionsData}
                />
            )}
            <div className={`${isSidebarVisible ? 'flex-1' : 'w-full'} transition-all duration-300 overflow-y-auto`}>
                <Outlet context={{ 
                    selectedCity, 
                    setSelectedCity,
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