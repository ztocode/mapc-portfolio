import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Root from './routes/root'
import Dashboard from './pages/DashboardPage'
import Projects from './pages/ProjectsPage'
import Map from './pages/MapPage'
import Analytics from './pages/AnalyticsPage'
import Reports from './pages/ReportsPage'
import Settings from './pages/SettingsPage'

function App() {  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Root />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="map" element={<Map />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
