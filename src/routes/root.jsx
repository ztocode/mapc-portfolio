import Layout from '../components/Layout'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { Outlet } from 'react-router-dom'
import { useState } from 'react'

const Root = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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
            />
            <div className={`flex-1 overflow-auto transition-all duration-300 ${
                isSidebarCollapsed ? 'ml-0' : ''
            }`}>
                <Outlet />
            </div>
        </main>
        <Footer />
       </Layout>
    )
}

export default Root;