/**
 * MyCarePlanPage — patient view of their assigned care plan.
 *
 * Read-only. The clinician creates and updates the plan; patient sees goals,
 * interventions, next review date, and can track what's been asked of them.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Sparkles, Calendar, User as UserIcon, BookOpenCheck } from 'lucide-react'
import { patient as patientApi } from '../api/client'
import type { CarePlanResponse } from '../types/api'
import { PageTransition } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../lib/localization'

export function MyCarePlanPage() {
  const [plan, setPlan] = useState<CarePlanResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    patientApi
      .getMyCarePlan()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BreathingCircle size="md" label="Loading your care plan..." />
      </div>
    )
  }

  if (!plan) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <EmptyState
            title="No care plan yet"
            description="Your clinician hasn't assigned a care plan yet. When they do, you'll find your goals and recommended interventions here."
            className="py-20"
          />
        </div>
      </PageTransition>
    )
  }

  const goals = Array.isArray(plan.goals) ? plan.goals : []
  const interventions = Array.isArray(plan.interventions) ? plan.interventions : []

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-3xl text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
            {plan.title}
          </h1>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-2 font-body leading-relaxed max-w-xl">
              {plan.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground font-body">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              Created by {plan.clinician_name || 'your clinician'}
            </span>
            {plan.review_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Next review: {formatDate(plan.review_date)}
              </span>
            )}
            {plan.status === 'review_needed' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Review needed
              </span>
            )}
          </div>
        </header>

        {/* Goals */}
        {goals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-warm p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-display text-xl text-foreground font-light">Your goals</h2>
            </div>
            <div className="space-y-3">
              {goals.map((g: Record<string, unknown>, i: number) => (
                <div key={i} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5 font-body">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-foreground leading-relaxed">{String(g.text || '')}</p>
                    {g.target_date ? (
                      <p className="text-[11px] text-muted-foreground mt-1 font-body">
                        Target: {formatDate(String(g.target_date))}
                      </p>
                    ) : null}
                    {g.status ? (
                      <span
                        className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          g.status === 'achieved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : g.status === 'revised'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {String(g.status).replace('_', ' ')}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Interventions */}
        {interventions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-warm p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-display text-xl text-foreground font-light">Recommended practices</h2>
            </div>
            <div className="space-y-4">
              {interventions.map((intr: Record<string, unknown>, i: number) => (
                <div key={i} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <BookOpenCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body font-medium text-foreground text-sm">{String(intr.name || '')}</h3>
                      {intr.frequency ? (
                        <p className="text-xs text-muted-foreground mt-0.5 font-body">
                          Frequency: {String(intr.frequency)}
                        </p>
                      ) : null}
                      {intr.instructions ? (
                        <p className="text-sm text-muted-foreground mt-2 font-body leading-relaxed">
                          {String(intr.instructions)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <p className="text-xs text-muted-foreground text-center font-body italic">
          This plan is a collaboration between you and your clinician.
          If something doesn't feel right, bring it up in your next session.
        </p>
      </div>
    </PageTransition>
  )
}
