/**
 * Route protection with role-based access control.
 *
 * Wraps routes to require authentication and optionally specific roles.
 * Redirects to /login if not authenticated.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    // User is authenticated but doesn't have the right role
    // Redirect to their appropriate home page
    if (user.role === 'patient') {
      return <Navigate to="/screening" replace />
    }
    if (user.role === 'clinician' || user.role === 'admin') {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
