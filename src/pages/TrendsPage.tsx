/**
 * TrendsPage — Symptom progression over time.
 *
 * Clinical Sanctuary: editorial timeline, warm tones, gentle motion.
 * Shows the patient's mental health journey — not just data.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { patient as patientApi } from '../api/client'
import type { SymptomTrend } from '../types/api'
import { SEVERITY_COLORS, SYMPTOM_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

const SYMPTOM_FRIENDLY_LABELS: Record<string, string> = {
  DEPRESSED_MOOD: 'Depressed Mood',
  ANHEDONIA: 'Loss of Interest',
  APPETITE_CHANGE: 'Appetite Change',
  SLEEP_ISSUES: 'Sleep Issues',
  PSYCHOMOTOR: 'Psychomotor Changes',
  FATIGUE: 'Fatigue',
  WORTHLESSNESS: 'Worthlessness',
  COGNITIVE_ISSUES: 'Difficulty Concentrating',
  SUICIDAL_THOUGHTS: 'Thoughts of Self-Harm',
  SPECIAL_CASE: 'Other',
  NO_SYMPTOM: 'No Symptom',
}

export function TrendsPage() {
  const [data, setData] = useState<SymptomTrend | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  useEffect(() => {
    setLoading(true)
    patientApi.getTrends(days)
      .then(setData)
      .catch(() => toast.error('Unable to load your trends right now.'))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Looking at your journey..." />
      </div>
    )
  }

  if (!data || data.total_screenings === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<BarChart3 className="w-6 h-6 text-muted-foreground/40" />}
          title="Not enough data yet"
          description="Complete at least 2 screenings to see how things are changing over time. There's no rush."
        />
      </PageTransition>
    )
  }

  const TrendIcon = data.trend === 'improving' ? TrendingDown :
                    data.trend === 'worsening' ? TrendingUp : Minus
  const trendColor = data.trend === 'improving' ? 'text-emerald-600' :
                     data.trend === 'worsening' ? 'text-red-600' : 'text-muted-foreground'
  const trendBg = data.trend === 'improving' ? 'bg-emerald-50' :
                  data.trend === 'worsening' ? 'bg-red-50' : 'bg-muted'

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-foreground">Your Journey</h1>
            <p className="text-sm text-muted-foreground mt-1 font-body">
              {data.total_screenings} screenings over {days} days
            </p>
          </div>

          {/* Time range pills (custom, not native select) */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {[
              { value: 30, label: '30d' },
              { value: 90, label: '90d' },
              { value: 180, label: '6mo' },
              { value: 365, label: '1yr' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium font-body rounded-md transition-all duration-200 ${
                  days === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trend summary card */}
        <motion.div
          className={`card-warm p-5 flex items-center gap-4 mb-8`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trendBg}`}>
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
          </div>
          <div>
            <p className={`font-display text-lg ${trendColor}`}>
              {data.trend === 'improving' ? 'Things seem to be improving' :
               data.trend === 'worsening' ? 'Some indicators have increased' :
               data.trend === 'stable' ? 'Things appear stable' : 'More data needed'}
            </p>
            <p className="text-sm text-muted-foreground font-body">
              {data.all_symptoms_observed.length} unique symptoms observed across all screenings
            </p>
          </div>
        </motion.div>

        {/* Timeline */}
        <StaggerChildren className="space-y-0">
          {data.timeline.map((entry, i) => {
            const colors = SEVERITY_COLORS[entry.severity_level] || SEVERITY_COLORS.none
            const isLast = i === data.timeline.length - 1

            return (
              <StaggerItem key={entry.screening_id}>
                <div className="flex gap-4">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0 w-6">
                    <div className={`w-3 h-3 rounded-full border-2 mt-1.5 ${
                      entry.severity_level === 'severe' ? 'bg-red-400 border-red-200' :
                      entry.severity_level === 'moderate' ? 'bg-amber-400 border-amber-200' :
                      entry.severity_level === 'mild' ? 'bg-sky-400 border-sky-200' : 'bg-slate-300 border-slate-200'
                    }`} />
                    {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
                    <div className="flex items-center gap-2 text-xs font-body">
                      <span className="text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {entry.severity_level}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.symptom_count} symptom{entry.symptom_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground/40">via {entry.source}</span>
                    </div>

                    {entry.symptoms_detected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.symptoms_detected.map(s => (
                          <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full border font-body ${SYMPTOM_COLORS[s] || 'bg-muted text-muted-foreground border-border'}`}>
                            {SYMPTOM_FRIENDLY_LABELS[s] || s.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerChildren>
      </div>
    </PageTransition>
  )
}
