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
import { MyAppointmentsPage } from './pages/MyAppointmentsPage'
import { MyCarePlanPage } from './pages/MyCarePlanPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { MessagesPage } from './pages/MessagesPage'
import { NotFoundPage } from './pages/NotFoundPage'

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
        {/* Root — send each role to its own home. ProtectedRoute above
            has already guaranteed authentication, so this is a pure
            routing decision. */}
        <Route index element={
          <Navigate to={isPatient ? patientHome : '/dashboard'} replace />
        } />

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
        <Route path="/chat/*" element={
          <ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute roles={['patient', 'clinician']}><NotificationsPage /></ProtectedRoute>
        } />
        <Route path="/appointments" element={
          <ProtectedRoute roles={['patient']}><MyAppointmentsPage /></ProtectedRoute>
        } />
        <Route path="/care-plan" element={
          <ProtectedRoute roles={['patient']}><MyCarePlanPage /></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute roles={['patient']}><MessagesPage /></ProtectedRoute>
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
        <Route path="/clinician-appointments" element={
          <ProtectedRoute roles={['clinician', 'admin']}><AppointmentsPage /></ProtectedRoute>
        } />

        {/* Shared */}
        <Route path="/results/:screeningId" element={<ResultPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* 404 — authenticated: show the warm NotFoundPage inside Layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Unauthenticated catch-all — bounce to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
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
