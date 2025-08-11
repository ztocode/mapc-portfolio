const Layout = ({ children }) => {
  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      {children}
    </div>
  )
}

export default Layout 