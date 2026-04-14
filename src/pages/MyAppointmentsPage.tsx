/**
 * MyAppointmentsPage — patient view of their upcoming + past appointments.
 *
 * Read-only. Clinicians schedule appointments; patients see them here with
 * all the details (date, time, type, location, notes).
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, MapPin, User as UserIcon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { patient as patientApi } from '../api/client'
import type { AppointmentResponse } from '../types/api'
import { PageTransition } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../lib/localization'

type Filter = 'upcoming' | 'past' | 'all'

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  intake: 'Initial assessment',
  followup: 'Follow-up',
  crisis: 'Urgent',
  review: 'Review',
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z')
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
    scheduled: { label: 'Scheduled', classes: 'bg-primary/10 text-primary', icon: Clock },
    confirmed: { label: 'Confirmed', classes: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    completed: { label: 'Completed', classes: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', classes: 'bg-rose-100 text-rose-700', icon: XCircle },
    no_show: { label: 'No show', classes: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  }
  const config = map[status] || map.scheduled
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.classes}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

export function MyAppointmentsPage() {
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const status = filter === 'upcoming' ? undefined : filter === 'past' ? 'completed' : 'all'
    patientApi
      .getMyAppointments(status)
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Your upcoming sessions and recent history
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BreathingCircle size="md" label="Loading..." />
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description={
              filter === 'upcoming'
                ? "You don't have any upcoming appointments. Your clinician will schedule one when needed."
                : 'No appointments in this view yet.'
            }
            className="py-16"
          />
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {appointments.map((appt, i) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-warm p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium font-body">
                          {formatDate(appt.scheduled_at)} at {formatTime(appt.scheduled_at)}
                        </span>
                        {statusBadge(appt.status)}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground font-body">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3" />
                          {appt.clinician_name || 'Clinician'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {appt.duration_minutes || 60} minutes ·{' '}
                          {APPOINTMENT_TYPE_LABELS[appt.appointment_type] || appt.appointment_type}
                        </div>
                        {appt.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {appt.location}
                          </div>
                        )}
                      </div>

                      {appt.notes && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground font-body italic">"{appt.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  )
}
