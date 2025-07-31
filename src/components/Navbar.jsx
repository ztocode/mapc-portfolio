import { NavLink } from 'react-router-dom'
import mapcLogo from '../assets/img/mapc-logo.png'

const Navbar = () => {
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/map', label: 'Map' },
  ]

  return (
    <nav className="navbar shadow-sm border-b border-gray-200 bg-white flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={mapcLogo} 
                alt="MAPC Logo" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-900">
                MAPC Dashboard
              </h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                    isActive
                      ? 'text-[#2862a0] font-extrabold border-b-4 border-[#2862a0]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#2862a0' : undefined
                })}
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1 px-3 py-2 text-xs font-extrabold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-[#2862a0] font-extrabold border-b-4 border-[#2862a0]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#2862a0' : undefined
                })}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 