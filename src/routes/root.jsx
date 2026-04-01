import Layout from '../components/Layout'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'

const Root = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    /** Municipality name or subregion label from sidebar / map (not always a GeoJSON town key). */
    const [mapFilterLabel, setMapFilterLabel] = useState(null)
    /** `'filter'` | `'map'` | null — how {@link mapFilterLabel} was chosen. */
    const [mapFilterSource, setMapFilterSource] = useState(null)
    /** Town names from Airtable `munis` (or fallback) to draw outline polygons on the map. */
    const [mapOutlineTownNames, setMapOutlineTownNames] = useState([])
    const [viewMode, setViewMode] = useState('city')
    const [selectedProject, setSelectedProject] = useState(null)
    const [mapFilteredProjects, setMapFilteredProjects] = useState(null)
    const [suppressMapChoropleth, setSuppressMapChoropleth] = useState(false)
    const location = useLocation()

    const currentPage = location.pathname === '/map' || location.pathname === '/map/' ? 'map' : 'dashboard'

    useEffect(() => {
        if (currentPage !== 'map') {
            setMapFilterLabel(null)
            setMapFilterSource(null)
            setMapOutlineTownNames([])
            setViewMode('city')
            setSelectedProject(null)
            setMapFilteredProjects(null)
            setSuppressMapChoropleth(false)
        }
    }, [currentPage])

    const handleFilteredProjectsForMapChange = useCallback((projects) => {
        setMapFilteredProjects(projects)
    }, [])

    const handleSubregionChoroplethSuppressedChange = useCallback((suppressed) => {
        setSuppressMapChoropleth(Boolean(suppressed))
    }, [])

    /** Single entry point for map filter state (label, source, optional outline town list). */
    const applyMapFilterSelection = useCallback((label, options = {}) => {
        setMapFilterLabel(label)
        setMapFilterSource(options?.source ?? null)
        setMapOutlineTownNames(Array.isArray(options?.towns) ? options.towns : [])
    }, [])

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

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
                    onMapFilterChange={applyMapFilterSelection}
                    viewMode={viewMode}
                    onProjectSelect={setSelectedProject}
                    selectedProject={selectedProject}
                    onFilteredProjectsForMapChange={handleFilteredProjectsForMapChange}
                    onSubregionChoroplethSuppressedChange={handleSubregionChoroplethSuppressedChange}
                />
            )}
            <div className={`${isSidebarVisible ? 'flex-1' : 'w-full'} transition-all duration-300 overflow-y-auto h-full`}>
                <Outlet context={{ 
                    mapFilterLabel,
                    mapFilterSource,
                    mapOutlineTownNames,
                    applyMapFilterSelection,
                    viewMode,
                    setViewMode,
                    selectedProject,
                    setSelectedProject,
                    isSidebarCollapsed,
                    mapFilteredProjects,
                    suppressMapChoropleth,
                }} />
            </div>
        </main>
        <Footer />
       </Layout>
    )
}

export default Root
