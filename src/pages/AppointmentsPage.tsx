/**
 * AppointmentsPage — clinician view: list + create + edit + cancel appointments.
 *
 * Upcoming appointments appear at top, past below. Create form opens as a modal.
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, MapPin, User as UserIcon, Plus, X, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboard as dashboardApi } from '../api/client'
import type { AppointmentResponse, PatientSummary } from '../types/api'
import { PageTransition } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../lib/localization'

type Filter = 'upcoming' | 'past' | 'all'
type View = 'list' | 'week' | 'month'

const APPOINTMENT_TYPES = [
  { value: 'intake', label: 'Initial assessment' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'crisis', label: 'Urgent / crisis' },
  { value: 'review', label: 'Care plan review' },
]

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

export function AppointmentsPage() {
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [view, setView] = useState<View>('list')
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([])
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [refDate, setRefDate] = useState(() => new Date())

  const reload = useCallback(() => {
    setLoading(true)
    // Calendar views need all appointments; list view respects its filter
    const status = view !== 'list'
      ? 'all'
      : filter === 'upcoming' ? undefined : filter === 'past' ? 'completed' : 'all'
    dashboardApi
      .getAppointments(status)
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }, [filter, view])

  useEffect(() => {
    reload()
  }, [reload])

  // Patients for the selector
  useEffect(() => {
    dashboardApi
      .getPatients()
      .then(setPatients)
      .catch(() => setPatients([]))
  }, [])

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await dashboardApi.updateAppointmentStatus(id, status)
      toast.success(`Marked as ${status}`)
      reload()
    } catch {
      toast.error('Could not update status.')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return
    try {
      await dashboardApi.deleteAppointment(id)
      toast.success('Appointment cancelled')
      reload()
    } catch {
      toast.error('Could not cancel appointment.')
    }
  }

  const viewLabels: Record<View, string> = { list: 'List', week: 'Week', month: 'Month' }
  const viewIcons: Record<View, typeof List> = { list: List, week: LayoutGrid, month: Calendar }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
              Appointments
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-body">
              Schedule and track your patient sessions
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm gap-2">
            <Plus className="w-3.5 h-3.5" />
            New appointment
          </button>
        </header>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          {view === 'list' ? (
            <div className="flex gap-2">
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
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(['list', 'week', 'month'] as View[]).map(v => {
              const Icon = viewIcons[v]
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200 ${
                    view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {viewLabels[v]}
                </button>
              )
            })}
          </div>
        </div>

        {view === 'week' && (
          <WeekCalendarView
            refDate={refDate}
            setRefDate={setRefDate}
            appointments={appointments}
            loading={loading}
            onStatusChange={handleUpdateStatus}
            onCancel={handleCancel}
          />
        )}

        {view === 'month' && (
          <MonthCalendarView
            refDate={refDate}
            setRefDate={setRefDate}
            appointments={appointments}
            loading={loading}
          />
        )}

        {view === 'list' && (loading ? (
          <div className="flex items-center justify-center py-16">
            <BreathingCircle size="md" label="Loading..." />
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description="Click 'New appointment' to schedule one."
            className="py-16"
          />
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {appointments.map((appt, i) => {
                const patient = patients.find(p => p.id === appt.patient_id)
                return (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="card-warm p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium font-body">
                            {formatDate(appt.scheduled_at)} at {formatTime(appt.scheduled_at)}
                          </span>
                          {statusBadge(appt.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-body">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {appt.patient_name || patient?.full_name || 'Unknown patient'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {appt.duration_minutes || 60}m · {appt.appointment_type}
                          </span>
                          {appt.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {appt.location}
                            </span>
                          )}
                        </div>

                        {appt.notes && (
                          <p className="text-xs text-muted-foreground mt-2 font-body italic">"{appt.notes}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                            className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-body"
                          >
                            Confirm
                          </button>
                        )}
                        {['scheduled', 'confirmed'].includes(appt.status) && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-body"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleCancel(appt.id)}
                              className="text-[11px] px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-body"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        ))}
      </div>

      {showCreate && (
        <CreateAppointmentModal
          patients={patients}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            reload()
          }}
        />
      )}
    </PageTransition>
  )
}

// ── Create appointment modal ──

interface CreateModalProps {
  patients: PatientSummary[]
  onClose: () => void
  onCreated: () => void
}

function CreateAppointmentModal({ patients, onClose, onCreated }: CreateModalProps) {
  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [apptType, setApptType] = useState('followup')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !date || !time) {
      toast.error('Patient, date, and time are required.')
      return
    }
    setSaving(true)
    try {
      // Convert local date+time to UTC ISO so backend stores wall-clock-correct.
      // (The clinician's browser is the source of truth for the local time they picked.)
      const iso = new Date(`${date}T${time}:00`).toISOString()
      await dashboardApi.createAppointment({
        patient_id: patientId,
        scheduled_at: iso,
        duration_minutes: duration,
        appointment_type: apptType,
        location: location || undefined,
        notes: notes || undefined,
      })
      toast.success('Appointment scheduled. Confirmation email sent to patient.')
      onCreated()
    } catch (err: unknown) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not schedule.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl text-foreground font-light">New appointment</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 font-body">Patient</label>
            <select
              className="input py-2.5"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              required
            >
              <option value="">Select a patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 font-body">Date</label>
              <input
                type="date"
                className="input py-2.5"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 font-body">Time</label>
              <input
                type="time"
                className="input py-2.5"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 font-body">Type</label>
              <select className="input py-2.5" value={apptType} onChange={e => setApptType(e.target.value)}>
                {APPOINTMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 font-body">Duration (min)</label>
              <input
                type="number"
                className="input py-2.5"
                value={duration}
                min={15}
                max={240}
                step={15}
                onChange={e => setDuration(parseInt(e.target.value, 10) || 60)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 font-body">
              Location <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="input py-2.5"
              placeholder="e.g. Salmaniya Hospital, Room 302"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 font-body">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              className="input py-2.5 resize-none"
              rows={3}
              placeholder="Private notes about this appointment..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

function startOfWeekMonday(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = r.getDay() // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day // make Monday the start
  r.setDate(r.getDate() + diff)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function groupByDay(appointments: AppointmentResponse[]): Map<string, AppointmentResponse[]> {
  const map = new Map<string, AppointmentResponse[]>()
  for (const a of appointments) {
    const iso = a.scheduled_at
    const d = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z')
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const bucket = map.get(key) || []
    bucket.push(a)
    map.set(key, bucket)
  }
  // Sort each day chronologically
  for (const v of map.values()) {
    v.sort((x, y) => new Date(x.scheduled_at).getTime() - new Date(y.scheduled_at).getTime())
  }
  return map
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function statusDot(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-emerald-500'
    case 'scheduled': return 'bg-primary'
    case 'completed': return 'bg-slate-400'
    case 'cancelled': return 'bg-rose-400'
    case 'no_show': return 'bg-amber-500'
    default: return 'bg-slate-400'
  }
}

// ── Week View ───────────────────────────────────────────────────────────────

interface CalendarViewProps {
  refDate: Date
  setRefDate: (d: Date) => void
  appointments: AppointmentResponse[]
  loading: boolean
}

interface WeekViewProps extends CalendarViewProps {
  onStatusChange: (id: string, status: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
}

function WeekCalendarView({ refDate, setRefDate, appointments, loading, onStatusChange, onCancel }: WeekViewProps) {
  const weekStart = useMemo(() => startOfWeekMonday(refDate), [refDate])
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    })
  }, [weekStart])

  const byDay = useMemo(() => groupByDay(appointments), [appointments])
  const today = new Date()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const shiftDays = (n: number) => {
    const next = new Date(refDate)
    next.setDate(refDate.getDate() + n)
    setRefDate(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDays(-7)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRefDate(new Date())}
            className="text-xs font-body text-muted-foreground hover:text-foreground px-2"
          >
            Today
          </button>
          <button
            onClick={() => shiftDays(7)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="font-display text-lg text-foreground font-light">
          {weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          {' — '}
          {weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <BreathingCircle size="sm" label="Loading..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((d, i) => {
            const items = byDay.get(dayKey(d)) || []
            const isToday = sameDay(d, today)
            return (
              <div
                key={i}
                className={`card-warm p-3 min-h-[160px] ${isToday ? 'ring-2 ring-primary/40' : ''}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
                    {WEEKDAY_LABELS[i]}
                  </span>
                  <span className={`text-sm font-body font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {d.getDate()}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 font-body italic">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map(a => (
                      <WeekAppointmentChip
                        key={a.id}
                        appt={a}
                        onStatusChange={onStatusChange}
                        onCancel={onCancel}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WeekAppointmentChip({
  appt,
  onStatusChange,
  onCancel,
}: {
  appt: AppointmentResponse
  onStatusChange: (id: string, status: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const time = formatTime(appt.scheduled_at)
  const dotClass = statusDot(appt.status)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-[11px] font-body p-1.5 rounded bg-background border border-border hover:border-primary/40 transition-colors flex items-center gap-1.5"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="font-medium text-foreground">{time}</span>
        <span className="text-muted-foreground truncate">{appt.patient_name || '—'}</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 w-56 card-warm p-3 shadow-xl">
          <div className="text-xs font-body text-foreground font-medium mb-1">{appt.patient_name || 'Unknown'}</div>
          <div className="text-[11px] text-muted-foreground font-body mb-2">
            {formatDate(appt.scheduled_at)} · {time} · {appt.duration_minutes || 60}m
          </div>
          <div className="text-[11px] text-muted-foreground font-body mb-2 capitalize">{appt.appointment_type}</div>
          {appt.notes && <p className="text-[11px] italic text-muted-foreground mb-2">"{appt.notes}"</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {appt.status === 'scheduled' && (
              <button
                onClick={() => { onStatusChange(appt.id, 'confirmed'); setOpen(false) }}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                Confirm
              </button>
            )}
            {['scheduled', 'confirmed'].includes(appt.status) && (
              <>
                <button
                  onClick={() => { onStatusChange(appt.id, 'completed'); setOpen(false) }}
                  className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Complete
                </button>
                <button
                  onClick={() => { onCancel(appt.id); setOpen(false) }}
                  className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Month View ──────────────────────────────────────────────────────────────

function MonthCalendarView({ refDate, setRefDate, appointments, loading }: CalendarViewProps) {
  const monthStart = useMemo(() => startOfMonth(refDate), [refDate])
  const gridStart = useMemo(() => startOfWeekMonday(monthStart), [monthStart])
  const cells = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      return d
    })
  }, [gridStart])

  const byDay = useMemo(() => groupByDay(appointments), [appointments])
  const today = new Date()
  const currentMonth = refDate.getMonth()

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const shiftMonths = (n: number) => {
    const next = new Date(refDate.getFullYear(), refDate.getMonth() + n, 1)
    setRefDate(next)
    setSelectedDay(null)
  }

  const selectedItems = selectedDay ? byDay.get(dayKey(selectedDay)) || [] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftMonths(-1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setRefDate(new Date()); setSelectedDay(null) }}
            className="text-xs font-body text-muted-foreground hover:text-foreground px-2"
          >
            Today
          </button>
          <button
            onClick={() => shiftMonths(1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="font-display text-lg text-foreground font-light">
          {refDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <BreathingCircle size="sm" label="Loading..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map(d => (
              <div key={d} className="text-[10px] font-body text-muted-foreground uppercase tracking-wider text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === currentMonth
              const isToday = sameDay(d, today)
              const isSelected = selectedDay && sameDay(d, selectedDay)
              const items = byDay.get(dayKey(d)) || []
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  className={`text-left min-h-[82px] p-1.5 rounded-md border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : isToday
                        ? 'border-primary/40 bg-background'
                        : 'border-border bg-background hover:border-primary/30'
                  } ${!inMonth ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={`text-xs font-body ${isToday ? 'text-primary font-semibold' : 'text-foreground'}`}>
                      {d.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-body text-muted-foreground">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {items.slice(0, 6).map(a => (
                      <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${statusDot(a.status)}`} />
                    ))}
                    {items.length > 6 && (
                      <span className="text-[9px] text-muted-foreground font-body">+{items.length - 6}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <div className="mt-6 card-warm p-4">
              <h3 className="font-display text-base text-foreground font-medium mb-3">
                {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body italic">No appointments on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(a.status)}`} />
                      <span className="text-sm font-body font-medium text-foreground min-w-[80px]">
                        {formatTime(a.scheduled_at)}
                      </span>
                      <span className="text-sm font-body text-foreground flex-1">
                        {a.patient_name || 'Unknown patient'}
                      </span>
                      <span className="text-xs font-body text-muted-foreground capitalize">
                        {a.appointment_type}
                      </span>
                      {statusBadge(a.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
