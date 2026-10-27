import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'

// Layouts
import MainLayout from './components/Layout/MainLayout'
import AuthLayout from './components/Layout/AuthLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import NewReport from './pages/NewReport'
import PDFGenerator from './pages/PDFGenerator'
import Users from './pages/Users'
import Stations from './pages/Stations'
import Profile from './pages/Profile'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <AuthLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthLayout>
    )
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/new" element={<NewReport />} />
        <Route path="/pdf" element={<PDFGenerator />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin only routes */}
        {user?.role === 'admin' && (
          <>
            <Route path="/users" element={<Users />} />
            <Route path="/stations" element={<Stations />} />
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </MainLayout>
  )
}

export default App
