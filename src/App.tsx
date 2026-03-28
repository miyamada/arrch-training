import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import CurriculumManagePage from './pages/CurriculumManagePage'
import EmployeeManagePage from './pages/EmployeeManagePage'
import MyPage from './pages/MyPage'
import Layout from './components/Layout'

function AppRoutes() {
  const { employee, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0c0c0c' }}>
        <div style={{ color: '#c8a96a', fontSize: '14px', letterSpacing: '0.15em' }}>読み込み中...</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (employee.role === 'admin') {
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/curriculum" element={<CurriculumManagePage />} />
          <Route path="/manage-employees" element={<EmployeeManagePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
