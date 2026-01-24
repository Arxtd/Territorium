import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MapsList from './pages/MapsList'
import MapCreate from './pages/MapCreate'
import MapEdit from './pages/MapEdit'
import MapView from './pages/MapView'
import GlobalMap from './pages/GlobalMap'
import Insights from './pages/Insights'
import UsersManagement from './pages/UsersManagement'
import Profile from './pages/Profile'
import Layout from './components/Layout'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Layout>
              <Profile />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/maps"
        element={
          <PrivateRoute>
            <Layout>
              <MapsList />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/maps/create"
        element={
          <PrivateRoute>
            <Layout>
              <MapCreate />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/maps/:id/edit"
        element={
          <PrivateRoute>
            <Layout>
              <MapEdit />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/maps/:id"
        element={
          <PrivateRoute>
            <Layout>
              <MapView />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/global-map"
        element={
          <PrivateRoute>
            <Layout>
              <GlobalMap />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <PrivateRoute>
            <Layout>
              <Insights />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Layout>
              <UsersManagement />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App

