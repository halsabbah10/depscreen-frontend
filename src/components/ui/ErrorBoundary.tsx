/**
 * Error boundary with empathetic fallback.
 *
 * When a component crashes, show a warm, reassuring message instead
 * of a blank white screen. The user may be in a fragile state —
 * a crash should never feel like the system abandoned them.
 */

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-clay/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-clay" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">
              Something's not quite right
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              We've noted the issue. You haven't lost any of your data.
              Would you like to try again or return to the previous page?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="btn-primary text-sm"
              >
                Try again
              </button>
              <button
                onClick={() => window.history.back()}
                className="btn-outline text-sm"
              >
                Go back
              </button>
            </div>

            {/* Crisis resource — always visible, even in error states */}
            <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
              If you need immediate support, call{' '}
              <strong className="text-foreground">999</strong>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
