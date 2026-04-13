/**
 * Content-shape skeleton loader.
 * Shows shimmer placeholders while data loads.
 * Warm cream tones match the Clinical Sanctuary palette.
 */

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** Card-shaped skeleton for list items. */
export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

/** Text block skeleton for content areas. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/** Stat card skeleton for dashboard. */
export function SkeletonStat() {
  return (
    <div className="card p-4 space-y-2" aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-12" />
    </div>
  )
}
