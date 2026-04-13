/**
 * PatientHistoryPage — Timeline of past screenings.
 *
 * Clinical Sanctuary: editorial list, warm tones, gentle stagger animation.
 * Each screening entry links to the full result page.
 * Empty state is warm and encouraging.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { screening as screeningApi } from '../api/client'
import type { ScreeningHistoryResponse } from '../types/api'
import { SEVERITY_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

export function PatientHistoryPage() {
  const [data, setData] = useState<ScreeningHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    screeningApi.getHistory(page, 15)
      .then(setData)
      .catch(() => toast.error('Unable to load your history. Please try again.'))
      .finally(() => setLoading(false))
  }, [page])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Loading your history..." />
      </div>
    )
  }

  const items = data?.items || []
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl text-foreground">Your Journey</h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            {data?.total || 0} screening{(data?.total || 0) !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6 text-muted-foreground/40" />}
            title="No screenings yet"
            description="Whenever you're ready, we're here. Your first screening takes just a few minutes."
            action={
              <Link to="/screening" className="btn-primary">
                <ClipboardList className="w-4 h-4" />
                Start Screening
              </Link>
            }
          />
        ) : (
          <StaggerChildren className="space-y-2">
            {items.map(item => {
              const colors = SEVERITY_COLORS[item.severity_level] || SEVERITY_COLORS.none
              return (
                <StaggerItem key={item.id}>
                  <Link
                    to={`/results/${item.id}`}
                    className="card-warm p-4 flex items-center gap-4 hover:shadow-md transition-shadow duration-300"
                  >
                    {/* Severity indicator */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.severity_level === 'severe' ? 'bg-red-400' :
                      item.severity_level === 'moderate' ? 'bg-amber-400' :
                      item.severity_level === 'mild' ? 'bg-sky-400' : 'bg-slate-300'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-body ${colors.bg} ${colors.text}`}>
                          {item.severity_level}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {item.symptom_count} symptom{item.symptom_count !== 1 ? 's' : ''}
                        </span>
                        {item.flagged_for_review && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-label="Flagged for review" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 truncate font-body">
                        {item.text_preview}
                      </p>
                    </div>

                    <span className="text-xs text-muted-foreground shrink-0 font-body">
                      {formatDate(item.created_at)}
                    </span>
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerChildren>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground font-body">
              {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost text-xs"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
