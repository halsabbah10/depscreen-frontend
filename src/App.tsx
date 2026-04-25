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

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { BreathingCircle } from './components/ui/BreathingCircle'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Eager — always needed for the first paint or the 404 fallback.
// Lazy — loaded on first navigation to the page. This drops ~30-50 KB
// gzipped off the initial bundle since a patient never ships the full
// clinician dashboard/patients code and vice versa.
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const ScreeningPage = lazy(() => import('./pages/ScreeningPage').then(m => ({ default: m.ScreeningPage })))
const ResultPage = lazy(() => import('./pages/ResultPage').then(m => ({ default: m.ResultPage })))
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })))
const PatientHistoryPage = lazy(() => import('./pages/PatientHistoryPage').then(m => ({ default: m.PatientHistoryPage })))
const TrendsPage = lazy(() => import('./pages/TrendsPage').then(m => ({ default: m.TrendsPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const PatientListPage = lazy(() => import('./pages/PatientListPage').then(m => ({ default: m.PatientListPage })))
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage').then(m => ({ default: m.PatientDetailPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointmentsPage').then(m => ({ default: m.MyAppointmentsPage })))
const MyCarePlanPage = lazy(() => import('./pages/MyCarePlanPage').then(m => ({ default: m.MyCarePlanPage })))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })))
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })))

/**
 * Fallback while a lazy page's chunk is fetching. We render it inside
 * the Layout so the header/nav stay visible — only the main content
 * area shows the breath indicator. Feels like a normal page transition
 * rather than a cold load.
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <BreathingCircle size="md" label="Loading..." />
    </div>
  )
}

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

      {/* Onboarding — outside Layout (full-screen wizard). Its own
          Suspense since it renders without the shared header/nav. */}
      <Route path="/onboarding" element={
        <ProtectedRoute roles={['patient']}>
          <Suspense fallback={<PageLoader />}>
            <OnboardingPage />
          </Suspense>
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
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
