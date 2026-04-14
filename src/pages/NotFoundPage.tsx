/**
 * NotFoundPage — a warm 404.
 *
 * A missing link shouldn't feel like being shut out. Treat it as a quiet
 * dead-end with a clear way back home and an always-visible crisis number,
 * consistent with every other error surface in the app.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { PageTransition } from '../components/ui/PageTransition'
import { useAuth } from '../contexts/AuthContext'

export function NotFoundPage() {
  const { isAuthenticated, isPatient } = useAuth()
  const homePath = !isAuthenticated ? '/login' : isPatient ? '/screening' : '/dashboard'
  const homeLabel = !isAuthenticated ? 'Back to sign in' : isPatient ? 'Back to home' : 'Back to dashboard'

  return (
    <PageTransition>
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {/* Quiet compass — not a stop sign */}
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <Compass className="w-6 h-6" />
          </div>

          <p className="text-[11px] font-body uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Page not found
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl text-foreground font-light leading-tight mb-4"
            style={{ letterSpacing: '0.01em' }}
          >
            Nothing lives at this address.
          </h1>
          <p className="text-sm text-muted-foreground font-body leading-relaxed mb-8 max-w-sm mx-auto">
            The link may have moved, or it may have never existed. Either way, we can point you back
            to somewhere familiar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={homePath}
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {homeLabel}
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-ghost text-sm"
            >
              Go back one step
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border max-w-xs mx-auto">
            If you need immediate support in Bahrain, call{' '}
            <strong className="text-foreground">999</strong>, 24/7.
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
