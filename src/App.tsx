/**
 * DepScreen — Application Root
 *
 * RBAC-based routing:
 * - Public: /login
 * - Patient: /onboarding, /screening, /results/:id, /chat/:screeningId,
 *            /chat/conversations, /history, /trends, /notifications, /profile
 * - Clinician: /dashboard, /patients, /patients/:id
 * - Shared: /results/:id, /profile
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

// Pages
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ScreeningPage } from './pages/ScreeningPage'
import { ResultPage } from './pages/ResultPage'
import { ChatPage } from './pages/ChatPage'
import { PatientHistoryPage } from './pages/PatientHistoryPage'
import { TrendsPage } from './pages/TrendsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { PatientListPage } from './pages/PatientListPage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { ProfilePage } from './pages/ProfilePage'

function AppRoutes() {
  const { isAuthenticated, isPatient, user } = useAuth()

  // Redirect new patients to onboarding
  const patientHome = user?.onboarding_completed === false ? '/onboarding' : '/screening'

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to={isPatient ? patientHome : '/dashboard'} replace />
          : <LoginPage />
      } />

      {/* Onboarding — outside Layout (full-screen wizard) */}
      <Route path="/onboarding" element={
        <ProtectedRoute roles={['patient']}>
          <OnboardingPage />
        </ProtectedRoute>
      } />

      {/* Authenticated — wrapped in Layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Patient */}
        <Route path="/screening" element={
          <ProtectedRoute roles={['patient']}><ScreeningPage /></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute roles={['patient']}><PatientHistoryPage /></ProtectedRoute>
        } />
        <Route path="/trends" element={
          <ProtectedRoute roles={['patient']}><TrendsPage /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>
        } />
        <Route path="/chat/c/:conversationId" element={
          <ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>
        } />
        <Route path="/chat/screening/:screeningId" element={
          <ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute roles={['patient']}><NotificationsPage /></ProtectedRoute>
        } />

        {/* Clinician */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['clinician', 'admin']}><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute roles={['clinician', 'admin']}><PatientListPage /></ProtectedRoute>
        } />
        <Route path="/patients/:patientId" element={
          <ProtectedRoute roles={['clinician', 'admin']}><PatientDetailPage /></ProtectedRoute>
        } />

        {/* Shared */}
        <Route path="/results/:screeningId" element={<ResultPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Default */}
      <Route path="*" element={
        <Navigate to={isAuthenticated ? (isPatient ? patientHome : '/dashboard') : '/login'} replace />
      } />
    </Routes>
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
