const Footer = () => {
  return (
    <footer className="footer border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="text-sm text-gray-600">
              © 2025 MAPC Dashboard. All rights reserved.
            </span>
          </div>
        
        </div>
      </div>
    </footer>
  )
}

export default Footer 