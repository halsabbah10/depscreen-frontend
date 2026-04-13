import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, AlertTriangle, ChevronRight, ArrowRight } from 'lucide-react'
import { dashboard } from '../api/client'
import type { DashboardStats, ScreeningHistoryResponse } from '../types/api'
import { SEVERITY_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { SkeletonStat } from '../components/ui/Skeleton'

const SEVERITY_BAR_COLORS: Record<string, string> = {
  none: 'bg-slate-300',
  mild: 'bg-sky-400',
  moderate: 'bg-amber-400',
  severe: 'bg-red-400',
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [screenings, setScreenings] = useState<ScreeningHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')

  useEffect(() => {
    Promise.all([
      dashboard.getStats().then(setStats),
      dashboard.getAllScreenings(1, 10, undefined, filter === 'flagged').then(setScreenings),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  if (loading && !stats) {
    return (
      <PageTransition className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <BreathingCircle size="md" label="Preparing your dashboard..." />
        </div>
      </PageTransition>
    )
  }

  const totalForBar = stats ? Math.max(stats.total_screenings, 1) : 1

  return (
    <PageTransition className="max-w-5xl mx-auto space-y-8">
      {/* Headline */}
      <div>
        <h1 className="font-display text-3xl text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Overview of your patients and recent activity
        </p>
      </div>

      {/* Stat cards */}
      {stats ? (
        <StaggerChildren className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Patients', value: stats.total_patients },
            { label: 'Total Screenings', value: stats.total_screenings },
            { label: 'Flagged', value: stats.flagged_count, warn: stats.flagged_count > 0 },
            { label: 'This Week', value: stats.screenings_this_week },
          ].map(card => (
            <StaggerItem key={card.label}>
              <div className={`card-warm p-5 rounded-xl ${card.warn ? 'ring-1 ring-red-200' : ''}`}>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
                  {card.label}
                </p>
                <p className={`font-display text-3xl tracking-tight ${card.warn ? 'text-red-600' : 'text-foreground'}`}>
                  {card.value}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => <SkeletonStat key={i} />)}
        </div>
      )}

      {/* Severity distribution — horizontal stacked bar */}
      {stats && (
        <div className="card-warm p-5 rounded-xl">
          <h3 className="font-display text-lg text-foreground mb-4">Severity Distribution</h3>

          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex bg-muted">
            {(['none', 'mild', 'moderate', 'severe'] as const).map(level => {
              const count = stats.severity_distribution[level] || 0
              const pct = (count / totalForBar) * 100
              if (pct === 0) return null
              return (
                <div
                  key={level}
                  className={`${SEVERITY_BAR_COLORS[level]} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${pct}%` }}
                  title={`${level}: ${count} (${Math.round(pct)}%)`}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            {(['none', 'mild', 'moderate', 'severe'] as const).map(level => {
              const count = stats.severity_distribution[level] || 0
              return (
                <div key={level} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_BAR_COLORS[level]}`} />
                  <span className="text-xs font-body text-muted-foreground capitalize">{level}</span>
                  <span className="text-xs font-display text-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent screenings */}
      <div className="card-warm rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-display text-lg text-foreground">Recent Screenings</h3>

          {/* Filter pills */}
          <div className="flex gap-1.5">
            {([
              { key: 'all' as const, label: 'All' },
              { key: 'flagged' as const, label: 'Flagged' },
            ]).map(pill => (
              <button
                key={pill.key}
                onClick={() => setFilter(pill.key)}
                className={`text-xs font-body px-3 py-1.5 rounded-full transition-colors ${
                  filter === pill.key
                    ? pill.key === 'flagged'
                      ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                      : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {screenings?.items.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="font-display text-lg text-foreground mb-1">
              {filter === 'flagged' ? 'No flagged screenings' : 'No screenings yet'}
            </p>
            <p className="text-sm text-muted-foreground font-body">
              {filter === 'flagged'
                ? 'Nothing requires your immediate attention.'
                : 'Screenings will appear here as patients complete them.'}
            </p>
          </div>
        ) : (
          <StaggerChildren className="divide-y divide-border/40">
            {screenings?.items.map(item => {
              const colors = SEVERITY_COLORS[item.severity_level] || SEVERITY_COLORS.none
              return (
                <StaggerItem key={item.id}>
                  <Link
                    to={`/results/${item.id}`}
                    className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-primary/[0.03] transition-colors group"
                  >
                    {/* Severity dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.severity_level === 'severe' ? 'bg-red-400' :
                      item.severity_level === 'moderate' ? 'bg-amber-400' :
                      item.severity_level === 'mild' ? 'bg-sky-400' : 'bg-slate-300'
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-body uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {item.severity_level}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {item.symptom_count} symptom{item.symptom_count !== 1 ? 's' : ''}
                        </span>
                        {item.flagged_for_review && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-body mt-0.5 truncate leading-relaxed">
                        {item.text_preview}
                      </p>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground font-body shrink-0">
                      {formatDate(item.created_at)}
                    </span>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-primary transition-colors" />
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerChildren>
        )}
      </div>

      {/* View All Patients link */}
      <div className="flex justify-center">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-sm font-body text-primary hover:text-primary/80 transition-colors group"
        >
          <Users className="w-4 h-4" />
          View All Patients
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </PageTransition>
  )
}
