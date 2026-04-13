/**
 * Warm, empathetic empty state component.
 *
 * Every empty list gets a thoughtful message — never just "No data."
 * Tone: supportive, gentle, non-judgmental. The user should feel
 * welcomed, not confronted with absence.
 */

import { type ReactNode } from 'react'
import { BreathingDot } from './BreathingCircle'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  showBreathingDot?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  showBreathingDot = false,
}: EmptyStateProps) {
  return (
    <div className={`py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}

      {!icon && showBreathingDot && (
        <div className="flex justify-center mb-4">
          <BreathingDot />
        </div>
      )}

      <h3 className="font-display text-lg text-foreground mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}
