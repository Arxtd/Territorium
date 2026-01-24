import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Map, Plus, BarChart3, LogOut, Menu, X, Sun, Moon, UserPlus, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const Layout = ({ children }) => {
  const { userProfile, signOut, isSuperintendente } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/profile', label: 'Meu Perfil', icon: User },
    { path: '/maps', label: 'Mapas', icon: Map },
    ...(isSuperintendente
      ? [
          { path: '/maps/create', label: 'Criar Mapa', icon: Plus },
          { path: '/users', label: 'Usuários', icon: UserPlus },
        ]
      : []),
    { path: '/global-map', label: 'Mapa Geral', icon: Map },
    { path: '/insights', label: 'Insights', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 overflow-hidden ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className={`flex flex-col items-center flex-shrink-0 pt-5 pb-4 relative ${
            sidebarCollapsed ? 'px-2' : 'px-4'
          }`}>
            {!sidebarCollapsed && (
              <div className="flex items-center w-full relative">
                <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400 transition-colors duration-200">
                  Territorium
                </h1>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 hover:scale-110 z-10"
                  aria-label="Minimizar sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
            {sidebarCollapsed && (
              <>
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400 transition-colors duration-200 mb-2">
                  T
                </h1>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 hover:scale-110"
                  aria-label="Expandir sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <nav className={`py-4 space-y-1 ${sidebarCollapsed ? 'px-1' : 'px-2'}`}>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center ${
                      sidebarCollapsed ? 'justify-center px-1' : 'px-3'
                    } py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out relative ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    } ${!sidebarCollapsed ? 'hover:translate-x-1' : ''}`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <Icon
                      className={`flex-shrink-0 h-5 w-5 transition-all duration-200 ${
                        sidebarCollapsed ? '' : 'mr-3'
                      } ${
                        isActive
                          ? 'text-primary-500 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300 group-hover:scale-110'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                        {item.label}
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 ${
            sidebarCollapsed ? 'p-2' : 'p-4'
          }`}>
            {!sidebarCollapsed ? (
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate transition-colors duration-200">
                      {userProfile?.name || userProfile?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors duration-200">
                      {userProfile?.role === 'superintendente'
                        ? 'Superintendente'
                        : 'Dirigente'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      toggleTheme()
                    }}
                    className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Alternar tema"
                    type="button"
                  >
                    {isDark ? (
                      <Sun className="h-5 w-5 transition-transform duration-200" />
                    ) : (
                      <Moon className="h-5 w-5 transition-transform duration-200" />
                    )}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Sair"
                    type="button"
                  >
                    <LogOut className="h-5 w-5 transition-transform duration-200" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    toggleTheme()
                  }}
                  className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95 relative group"
                  aria-label="Alternar tema"
                  type="button"
                  title="Alternar tema"
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 transition-transform duration-200" />
                  ) : (
                    <Moon className="h-5 w-5 transition-transform duration-200" />
                  )}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                    Alternar tema
                  </div>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95 relative group"
                  aria-label="Sair"
                  type="button"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5 transition-transform duration-200" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                    Sair
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300"></div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:hidden shadow-xl`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              Territorium
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-2 text-base font-medium rounded-md transition-all duration-200 ease-in-out ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <Icon
                      className={`mr-3 flex-shrink-0 h-6 w-6 transition-all duration-200 ${
                        isActive
                          ? 'text-primary-500 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300 group-hover:scale-110'
                      }`}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {userProfile?.name || userProfile?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile?.role === 'superintendente'
                    ? 'Superintendente'
                    : 'Dirigente'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleTheme()
                }}
                className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Alternar tema"
                type="button"
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="flex-shrink-0 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Sair"
                type="button"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      }`}>
        {/* Mobile header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Territorium
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault()
                toggleTheme()
              }}
              className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Alternar tema"
              type="button"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default Layout
