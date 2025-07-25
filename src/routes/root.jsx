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
    const location = useLocation()

    // Determine current page
    const currentPage = location.pathname === '/map' ? 'map' : 'dashboard'

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

    return (
       <Layout>
        <Navbar />
        <main className="flex flex-1">
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
            />
            <div className={`flex-1 overflow-auto transition-all duration-300 ${
                isSidebarCollapsed ? 'ml-0' : ''
            }`}>
                <Outlet context={{ 
                    selectedCity, 
                    setSelectedCity,
                    viewMode,
                    setViewMode,
                    selectedGeographicCount,
                    setSelectedGeographicCount,
                    selectedProject,
                    setSelectedProject
                }} />
            </div>
        </main>
        <Footer />
       </Layout>
    )
}

export default Root;