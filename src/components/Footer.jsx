const Footer = () => {
  return (
    <footer className="footer border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="text-sm text-gray-600">
              © 2024 MAPC Dashboard. All rights reserved.
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Contact Support
            </a>
            <span className="text-xs">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 