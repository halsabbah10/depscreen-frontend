/**
 * Authentication Context
 *
 * Provides auth state and methods to the entire app.
 * Handles JWT token management, auto-refresh, and role-based access.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { UserProfile, LoginRequest, RegisterRequest } from '../types/api'
import { auth, loadStoredRefreshToken, clearTokens } from '../api/client'

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isPatient: boolean
  isClinician: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<{ user: UserProfile }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Try to restore session from stored refresh token on mount
  useEffect(() => {
    const restore = async () => {
      const storedRefresh = loadStoredRefreshToken()
      if (!storedRefresh) {
        setIsLoading(false)
        return
      }

      try {
        const result = await auth.refresh()
        setUser(result.user)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    restore()
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const result = await auth.login(data)
    setUser(result.user)
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    const result = await auth.register(data)
    setUser(result.user)
    return { user: result.user }
  }, [])

  const logout = useCallback(() => {
    auth.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const profile = await auth.getProfile()
      setUser(profile)
    } catch {
      // Token expired — try refresh
      try {
        const result = await auth.refresh()
        setUser(result.user)
      } catch {
        clearTokens()
        setUser(null)
      }
    }
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isPatient: user?.role === 'patient',
    isClinician: user?.role === 'clinician' || user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
