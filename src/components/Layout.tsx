/**
 * Application shell — the breathing frame around every page.
 *
 * Clinical Sanctuary design: warm cream, Cormorant Garamond headlines,
 * subtle geometric pattern, role-based navigation, persistent safety banner.
 *
 * The layout should feel like opening a thoughtful book, not launching an app.
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  Brain, ClipboardList, BarChart3, Users, LayoutDashboard,
  User, LogOut, AlertTriangle, Bell, MessageCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ErrorBoundary } from './ui/ErrorBoundary'

const PATIENT_NAV = [
  { path: '/screening', label: 'New Screening', icon: ClipboardList },
  { path: '/history', label: 'History', icon: BarChart3 },
  { path: '/chat/conversations', label: 'Chat', icon: MessageCircle },
]

const CLINICIAN_NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
]

export function Layout() {
  const { user, logout, isPatient } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = isPatient ? PATIENT_NAV : CLINICIAN_NAV

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background geo-pattern">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            fontFamily: 'Figtree, system-ui, sans-serif',
            background: 'hsl(35 20% 94%)',
            color: 'hsl(220 15% 15%)',
            border: '1px solid hsl(35 15% 85%)',
            boxShadow: '0 4px 12px hsl(35 20% 80% / 0.2)',
          },
          success: {
            iconTheme: { primary: 'hsl(175 45% 32%)', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: 'hsl(10 50% 45%)', secondary: 'white' },
          },
        }}
      />

      {/* Safety banner — always visible, never dismissible */}
      <div className="safety-banner" role="alert">
        <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden="true" />
        Screening tool only — not a diagnostic instrument. In Bahrain, call <strong>999</strong> for emergencies.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[hsl(175,45%,24%)] to-[hsl(175,40%,20%)] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link
            to={isPatient ? '/screening' : '/dashboard'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm transition-transform group-hover:scale-105">
              <Brain className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-display text-white/90 tracking-[0.1em]">
              DepScreen
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(item => {
              const isActive = location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors
                    ${isActive
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/10'}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}

            <div className="w-px h-5 bg-white/20 mx-1.5" aria-hidden="true" />

            {/* Notifications bell */}
            <Link
              to={isPatient ? '/notifications' : '/dashboard'}
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </Link>

            {/* Profile */}
            <Link
              to="/profile"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Profile"
            >
              {user?.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <User className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="hidden md:inline max-w-[100px] truncate font-body text-white/80">
                {user?.full_name}
              </span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-3 px-4 bg-white/60 relative z-10">
        <p className="text-center text-xs text-muted-foreground font-body">
          DepScreen — Research prototype. Not for clinical use without professional supervision.
        </p>
      </footer>
    </div>
  )
}
