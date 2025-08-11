const Layout = ({ children }) => {
  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      {children}
    </div>
  )
}

export default Layout 