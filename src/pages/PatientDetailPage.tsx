import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ClipboardList, BarChart3, FileText, ClipboardCheck, UserCircle2,
  ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, Save, Target, Sparkles,
  Phone, Pill, Activity, Heart, Calendar, Pencil, Trash2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboard, terminology } from '../api/client'
import type { PatientSummary, ScreeningHistoryResponse, SymptomTrend, PatientDocument, CarePlanResponse, PatientFullProfile, MedicationResponse, MedicationCreate, ScreeningScheduleResponse, ScreeningScheduleCreate, DiagnosisResponse, DiagnosisCreate } from '../types/api'
import { Autocomplete } from '../components/ui/Autocomplete'
import { SEVERITY_COLORS, SYMPTOM_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

type Tab = 'profile' | 'screenings' | 'trends' | 'documents' | 'care-plan' | 'messages'

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
  { id: 'screenings', label: 'Screenings', icon: ClipboardList },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'care-plan', label: 'Care Plan', icon: ClipboardCheck },
  { id: 'messages', label: 'Messages', icon: Heart },
]

const SEVERITY_DOT: Record<string, string> = {
  severe: 'bg-red-400',
  moderate: 'bg-amber-400',
  mild: 'bg-sky-400',
  none: 'bg-slate-300',
}

/** Avatar color palette — same as PatientListPage for consistency. */
const AVATAR_COLORS = [
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-600" />
  if (trend === 'worsening') return <TrendingDown className="w-4 h-4 text-red-600" />
  return <Minus className="w-4 h-4 text-muted-foreground" />
}

function trendColor(trend: string): string {
  if (trend === 'improving') return 'text-emerald-700'
  if (trend === 'worsening') return 'text-red-700'
  return 'text-muted-foreground'
}

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [screenings, setScreenings] = useState<ScreeningHistoryResponse | null>(null)
  const [trends, setTrends] = useState<SymptomTrend | null>(null)
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')

  const patient = patients.find(p => p.id === patientId)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    Promise.all([
      dashboard.getPatients().then(setPatients),
      dashboard.getPatientScreenings(patientId).then(setScreenings),
      dashboard.getPatientTrends(patientId).then(setTrends).catch(() => null),
      dashboard.getPatientDocuments(patientId).then(setDocuments).catch(() => []),
    ])
      .catch((err: unknown) => {
        const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(detail || 'Could not load patient details.')
      })
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) {
    return (
      <PageTransition className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <BreathingCircle size="md" label="Loading patient record..." />
        </div>
      </PageTransition>
    )
  }

  const patientName = patient?.full_name || 'Patient'
  const initials = patientName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const sev = patient?.last_severity || 'none'
  const sevColors = SEVERITY_COLORS[sev] || SEVERITY_COLORS.none

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Link>

      {/* Patient header card */}
      <div className="card-warm rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${avatarColor(patientName)}`}>
          <span className="text-xl font-semibold font-body">{initials}</span>
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-foreground tracking-tight">{patientName}</h1>
          {patient?.email && (
            <p className="text-sm text-muted-foreground font-body mt-0.5">{patient.email}</p>
          )}
        </div>

        {/* Stats cluster */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center">
            <p className="font-display text-2xl text-foreground">{patient?.total_screenings || 0}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Screenings</p>
          </div>
          {patient?.last_severity && (
            <div className="text-center">
              <span className={`inline-block text-xs font-body uppercase tracking-wide px-2.5 py-1 rounded-full ${sevColors.bg} ${sevColors.text}`}>
                {sev}
              </span>
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Latest</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body transition-all ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab — full patient details ── */}
      {tab === 'profile' && patientId && <ProfileTab patientId={patientId} />}

      {/* ── Screenings tab ── */}
      {tab === 'screenings' && (
        <>
          {screenings?.items.length === 0 ? (
            <div className="card-warm rounded-xl">
              <EmptyState
                icon={<ClipboardList className="w-5 h-5 text-muted-foreground/50" />}
                title="No screenings yet"
                description="Screening results will appear here once this patient completes their first assessment."
              />
            </div>
          ) : (
            <StaggerChildren className="space-y-2.5">
              {screenings?.items.map(item => {
                const colors = SEVERITY_COLORS[item.severity_level] || SEVERITY_COLORS.none
                return (
                  <StaggerItem key={item.id}>
                    <Link
                      to={`/results/${item.id}`}
                      className="card-warm rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md transition-all group"
                    >
                      {/* Severity dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_DOT[item.severity_level] || SEVERITY_DOT.none}`} />

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
        </>
      )}

      {/* ── Trends tab ── */}
      {tab === 'trends' && (
        <>
          {!trends || trends.timeline.length === 0 ? (
            <div className="card-warm rounded-xl">
              <EmptyState
                icon={<BarChart3 className="w-5 h-5 text-muted-foreground/50" />}
                title="Not enough data for trends"
                description="Trends require at least two screenings to identify patterns over time."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Trend summary card */}
              <div className="card-warm rounded-xl p-5 flex items-center gap-4">
                <TrendIcon trend={trends.trend} />
                <div>
                  <p className="text-sm font-body text-foreground">
                    Overall trend:{' '}
                    <span className={`font-semibold capitalize ${trendColor(trends.trend)}`}>
                      {trends.trend.replace(/_/g, ' ')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {trends.total_screenings} screening{trends.total_screenings !== 1 ? 's' : ''} analyzed
                    {' \u00b7 '}
                    {trends.all_symptoms_observed.length} unique symptom{trends.all_symptoms_observed.length !== 1 ? 's' : ''} observed
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <StaggerChildren className="space-y-2.5">
                {trends.timeline.map(entry => (
                  <StaggerItem key={entry.screening_id}>
                    <div className="card-warm rounded-xl p-4 flex items-start gap-3.5">
                      {/* Severity dot on timeline line */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[entry.severity_level] || SEVERITY_DOT.none}`} />
                        <div className="w-px flex-1 bg-border/50 mt-1" />
                      </div>

                      {/* Entry content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 text-xs">
                          <span className="text-muted-foreground font-body">{formatDate(entry.date)}</span>
                          <span className={`font-body uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            SEVERITY_COLORS[entry.severity_level]?.bg || ''
                          } ${SEVERITY_COLORS[entry.severity_level]?.text || ''}`}>
                            {entry.severity_level}
                          </span>
                          <span className="text-muted-foreground font-body">
                            {entry.symptom_count} symptom{entry.symptom_count !== 1 ? 's' : ''}
                          </span>
                          {entry.flagged_for_review && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>

                        {/* Symptom chips */}
                        {entry.symptoms_detected.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {entry.symptoms_detected.map(s => (
                              <span
                                key={s}
                                className={`text-[10px] font-body px-2 py-0.5 rounded-full border ${SYMPTOM_COLORS[s] || 'bg-slate-50 border-slate-200 text-slate-600'}`}
                              >
                                {s.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          )}
        </>
      )}

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        <>
          {documents.length === 0 ? (
            <div className="card-warm rounded-xl">
              <EmptyState
                icon={<FileText className="w-5 h-5 text-muted-foreground/50" />}
                title="No documents uploaded"
                description="Clinical documents, notes, and attachments for this patient will appear here."
              />
            </div>
          ) : (
            <StaggerChildren className="space-y-2.5">
              {documents.map(doc => (
                <StaggerItem key={doc.id}>
                  <div className="card-warm rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium font-body text-foreground">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-body uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {doc.doc_type}
                          </span>
                          <span className="text-xs text-muted-foreground font-body">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {doc.content_preview && (
                      <p className="text-xs text-muted-foreground font-body mt-2.5 leading-relaxed line-clamp-2">
                        {doc.content_preview}
                      </p>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </>
      )}

      {tab === 'care-plan' && patientId && <CarePlanTab patientId={patientId} />}

      {tab === 'messages' && patientId && <MessagesTab patientId={patientId} />}
    </PageTransition>
  )
}

// ── Care Plan Tab (clinician CRUD) ────────────────────────────────────────────

interface Goal {
  text: string
  target_date?: string
  status?: string
}

interface Intervention {
  name: string
  frequency?: string
  instructions?: string
}

function CarePlanTab({ patientId }: { patientId: string }) {
  const [plans, setPlans] = useState<CarePlanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Active plan editing form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [reviewDate, setReviewDate] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = () => {
    setLoading(true)
    dashboard
      .getPatientCarePlans(patientId)
      .then(data => {
        setPlans(data)
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [patientId])

  const startEditing = (cp: CarePlanResponse) => {
    setEditingId(cp.id)
    setShowCreate(false)
    setTitle(cp.title)
    setDescription(cp.description || '')
    setGoals(
      (cp.goals || []).map(g => ({
        text: String(g.text ?? ''),
        target_date: g.target_date ? String(g.target_date) : undefined,
        status: g.status ? String(g.status) : undefined,
      }))
    )
    setInterventions(
      (cp.interventions || []).map(i => ({
        name: String(i.name ?? ''),
        frequency: i.frequency ? String(i.frequency) : undefined,
        instructions: i.instructions ? String(i.instructions) : undefined,
      }))
    )
    setReviewDate(cp.review_date || '')
  }

  const startCreating = () => {
    setEditingId(null)
    setShowCreate(true)
    setTitle('')
    setDescription('')
    setGoals([])
    setInterventions([])
    setReviewDate('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowCreate(false)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await dashboard.updateCarePlan(editingId, {
          title,
          description: description || undefined,
          goals,
          interventions,
          review_date: reviewDate || undefined,
        })
        toast.success('Care plan updated. Patient has been notified.')
      } else {
        await dashboard.createCarePlan({
          patient_id: patientId,
          title,
          description: description || undefined,
          goals,
          interventions,
          review_date: reviewDate || undefined,
        })
        toast.success('Care plan created')
      }
      cancelEdit()
      reload()
    } catch (err: unknown) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not save care plan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <BreathingCircle size="sm" label="Loading care plans..." />
      </div>
    )
  }

  const editing = editingId || showCreate

  if (editing) {
    return (
      <div className="card-warm rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl text-foreground font-light">
            {editingId ? 'Edit care plan' : 'New care plan'}
          </h2>
          <button onClick={cancelEdit} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 font-body">Title</label>
          <input
            type="text"
            className="input py-2.5"
            placeholder="e.g. Behavioral Activation — Mild Depression"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 font-body">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            className="input py-2.5 resize-none"
            rows={3}
            placeholder="Brief overview of the treatment approach..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium font-body flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Goals
            </label>
            <button
              type="button"
              onClick={() => setGoals(g => [...g, { text: '', status: 'in_progress' }])}
              className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 font-body"
            >
              <Plus className="w-3 h-3" /> Add goal
            </button>
          </div>
          <div className="space-y-2">
            {goals.length === 0 && (
              <p className="text-xs text-muted-foreground italic font-body">No goals yet. Add one to get started.</p>
            )}
            {goals.map((g, i) => (
              <div key={i} className="flex gap-2 items-start">
                <textarea
                  className="input py-2 flex-1 resize-none text-sm"
                  rows={2}
                  placeholder={`Goal ${i + 1}`}
                  value={g.text}
                  onChange={e => setGoals(gs => gs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
                <input
                  type="date"
                  className="input py-2 text-xs w-36"
                  value={g.target_date || ''}
                  onChange={e => setGoals(gs => gs.map((x, j) => (j === i ? { ...x, target_date: e.target.value } : x)))}
                />
                <button
                  type="button"
                  onClick={() => setGoals(gs => gs.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-danger p-2"
                  aria-label="Remove goal"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Interventions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium font-body flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Interventions
            </label>
            <button
              type="button"
              onClick={() => setInterventions(ints => [...ints, { name: '', frequency: '', instructions: '' }])}
              className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 font-body"
            >
              <Plus className="w-3 h-3" /> Add intervention
            </button>
          </div>
          <div className="space-y-2">
            {interventions.length === 0 && (
              <p className="text-xs text-muted-foreground italic font-body">
                No interventions yet. E.g. "Daily mood journaling", "Behavioral activation: 1 pleasant activity/day".
              </p>
            )}
            {interventions.map((intr, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input py-1.5 flex-1 text-sm"
                    placeholder="Name (e.g. Behavioral activation)"
                    value={intr.name}
                    onChange={e =>
                      setInterventions(ints => ints.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <input
                    type="text"
                    className="input py-1.5 text-sm w-36"
                    placeholder="Frequency"
                    value={intr.frequency || ''}
                    onChange={e =>
                      setInterventions(ints => ints.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setInterventions(ints => ints.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-danger p-1"
                    aria-label="Remove intervention"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  className="input py-1.5 text-sm resize-none"
                  rows={2}
                  placeholder="Instructions for the patient..."
                  value={intr.instructions || ''}
                  onChange={e =>
                    setInterventions(ints =>
                      ints.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x))
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 font-body">Next review date</label>
          <input
            type="date"
            className="input py-2.5 w-48"
            value={reviewDate}
            onChange={e => setReviewDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary text-sm gap-2">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : editingId ? 'Update & notify patient' : 'Create care plan'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground font-light">Care plans</h2>
        <button onClick={startCreating} className="btn-primary text-sm gap-2">
          <Plus className="w-3.5 h-3.5" />
          New care plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="card-warm rounded-xl">
          <EmptyState
            icon={<ClipboardCheck className="w-5 h-5 text-muted-foreground/50" />}
            title="No care plan yet"
            description="Create a care plan to guide this patient's treatment with structured goals and interventions."
          />
        </div>
      ) : (
        <StaggerChildren className="space-y-3">
          {plans.map(cp => (
            <StaggerItem key={cp.id}>
              <div className="card-warm rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium font-body text-foreground">{cp.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          cp.status === 'active'
                            ? 'bg-primary/10 text-primary'
                            : cp.status === 'review_needed'
                            ? 'bg-amber-100 text-amber-700'
                            : cp.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cp.status.replace('_', ' ')}
                      </span>
                    </div>
                    {cp.description && (
                      <p className="text-sm text-muted-foreground font-body mb-2 line-clamp-2">{cp.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-body">
                      <span>{(cp.goals || []).length} goal(s)</span>
                      <span>·</span>
                      <span>{(cp.interventions || []).length} intervention(s)</span>
                      {cp.review_date && (
                        <>
                          <span>·</span>
                          <span>Review: {formatDate(cp.review_date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => startEditing(cp)} className="btn-ghost text-xs">
                    Edit
                  </button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </div>
  )
}

// ── Profile Tab — complete patient details ──────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Pill
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card-warm rounded-xl p-5 mb-4">
      <h3 className="font-display text-base text-foreground font-medium flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5 text-sm font-body">
      <span className="text-muted-foreground min-w-[140px]">{label}</span>
      <span className="text-foreground flex-1">{value || <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  )
}

const SEVERITY_COLORS_MAP: Record<string, string> = {
  severe: 'bg-rose-100 text-rose-700',
  moderate: 'bg-amber-100 text-amber-700',
  mild: 'bg-sky-100 text-sky-700',
  'life-threatening': 'bg-rose-200 text-rose-900',
}

function ProfileTab({ patientId }: { patientId: string }) {
  const [profile, setProfile] = useState<PatientFullProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboard
      .getPatientFullProfile(patientId)
      .then(setProfile)
      .catch(err => {
        const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(detail || 'Could not load patient profile.')
      })
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <BreathingCircle size="sm" label="Loading patient profile..." />
      </div>
    )
  }
  if (!profile) return null

  const d = profile.demographics
  const mi = profile.medical_identifiers
  const c = profile.contact
  const s = profile.stats

  return (
    <div>
      {/* Top summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="card-warm rounded-xl p-3 text-center">
          <p className="font-display text-xl text-foreground font-light">{s.total_screenings}</p>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Screenings</p>
        </div>
        <div className="card-warm rounded-xl p-3 text-center">
          <p className="font-display text-xl text-foreground font-light">{s.upcoming_appointments}</p>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Upcoming</p>
        </div>
        <div className="card-warm rounded-xl p-3 text-center">
          <p className="font-display text-xl text-foreground font-light">{s.active_care_plans}</p>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Care Plans</p>
        </div>
        <div className="card-warm rounded-xl p-3 text-center">
          <p className="font-display text-xl text-foreground font-light capitalize">{s.last_severity || '—'}</p>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Last Severity</p>
        </div>
      </div>

      <Section icon={UserCircle2} title="Demographics">
        <DataRow label="Full Name" value={profile.full_name} />
        <DataRow label="Email" value={profile.email} />
        <DataRow
          label="Date of Birth"
          value={d.date_of_birth ? `${formatDate(d.date_of_birth)}${d.age ? ` (${d.age} years)` : ''}` : null}
        />
        <DataRow label="Gender" value={d.gender ? <span className="capitalize">{d.gender.replace('_', ' ')}</span> : null} />
        <DataRow label="Nationality" value={d.nationality} />
        <DataRow label="Language" value={d.language_preference === 'ar' ? 'Arabic' : 'English'} />
        <DataRow label="Timezone" value={d.timezone} />
        <DataRow
          label="Onboarding"
          value={
            profile.onboarding_completed ? (
              <span className="text-emerald-700">Completed</span>
            ) : (
              <span className="text-amber-700">In progress</span>
            )
          }
        />
      </Section>

      <Section icon={UserCircle2} title="Medical Identifiers">
        <DataRow
          label="CPR Number"
          value={mi.cpr_number ? <span className="font-mono tracking-wider">{mi.cpr_number}</span> : null}
        />
        <DataRow label="Medical Record #" value={mi.medical_record_number} />
        <DataRow label="Blood Type" value={mi.blood_type} />
      </Section>

      <Section icon={Phone} title="Contact">
        <DataRow label="Phone" value={c.phone} />
        <DataRow label="Reddit" value={c.reddit_username ? `u/${c.reddit_username}` : null} />
        <DataRow label="X / Twitter" value={c.twitter_username ? `@${c.twitter_username}` : null} />
      </Section>

      <MedicationsSection patientId={patientId} />

      <Section icon={Activity} title={`Allergies (${profile.allergies.length})`}>
        {profile.allergies.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">No known allergies.</p>
        ) : (
          <div className="space-y-2">
            {profile.allergies.map(a => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-body font-medium text-sm text-foreground">{a.allergen}</span>
                    {a.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEVERITY_COLORS_MAP[a.severity] || 'bg-muted'}`}>
                        {a.severity}
                      </span>
                    )}
                    {a.allergy_type && (
                      <span className="text-[10px] text-muted-foreground font-body">· {a.allergy_type}</span>
                    )}
                  </div>
                  {a.reaction && <p className="text-xs text-muted-foreground font-body mt-1">Reaction: {a.reaction}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <DiagnosesSection patientId={patientId} />


      <Section icon={Phone} title={`Emergency Contacts (${profile.emergency_contacts.length})`}>
        {profile.emergency_contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">No emergency contacts on record.</p>
        ) : (
          <div className="space-y-2">
            {profile.emergency_contacts.map(ec => (
              <div key={ec.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-body font-medium text-sm text-foreground">{ec.contact_name}</span>
                    {ec.is_primary && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Primary</span>
                    )}
                    {ec.relation && <span className="text-xs text-muted-foreground font-body">· {ec.relation}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 font-mono">{ec.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <ScreeningScheduleSection patientId={patientId} />
    </div>
  )
}

// ── Medications Section — editable for clinicians ───────────────────────────

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'daily', label: 'Daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed' },
]

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  weekly: 'Weekly',
  as_needed: 'As needed',
}

function emptyMedForm(): MedicationCreate {
  return { name: '', dosage: '', frequency: '', start_date: '', end_date: '', prescribed_by: '', notes: '' }
}

function MedicationsSection({ patientId }: { patientId: string }) {
  const [meds, setMeds] = useState<MedicationResponse[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<MedicationCreate>(emptyMedForm())
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const fresh = await dashboard.getPatientMedications(patientId)
      setMeds(fresh)
    } catch {
      toast.error('Could not refresh medications.')
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const startEdit = (m: MedicationResponse) => {
    setAdding(false)
    setEditingId(m.id)
    setForm({
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      start_date: m.start_date || '',
      end_date: m.end_date || '',
      prescribed_by: m.prescribed_by || '',
      notes: m.notes || '',
    })
  }

  const startAdd = () => {
    setEditingId(null)
    setAdding(true)
    setForm(emptyMedForm())
  }

  const cancel = () => {
    setEditingId(null)
    setAdding(false)
    setForm(emptyMedForm())
  }

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Medication name is required.')
      return
    }
    setSubmitting(true)
    try {
      const payload: MedicationCreate = {
        name: form.name.trim(),
        dosage: form.dosage?.trim() || undefined,
        frequency: form.frequency || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        prescribed_by: form.prescribed_by?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      }
      if (editingId) {
        await dashboard.updatePatientMedication(editingId, payload)
        toast.success('Medication updated.')
      } else {
        await dashboard.addPatientMedication(patientId, payload)
        toast.success('Medication added.')
      }
      cancel()
      await reload()
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not save medication.')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (m: MedicationResponse) => {
    if (!confirm(`Mark "${m.name}" as inactive? This keeps the record but removes it from the active list.`)) return
    try {
      await dashboard.deactivatePatientMedication(m.id)
      toast.success('Medication marked inactive.')
      await reload()
    } catch {
      toast.error('Could not update medication.')
    }
  }

  const formOpen = adding || editingId !== null

  return (
    <Section icon={Pill} title={`Medications (${meds.length})`}>
      {meds.length === 0 && !formOpen ? (
        <p className="text-sm text-muted-foreground font-body italic mb-3">No medications on record.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {meds.map(m => (
            <div key={m.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body font-medium text-sm text-foreground">{m.name}</span>
                  {m.dosage && <span className="text-xs text-muted-foreground font-body">· {m.dosage}</span>}
                  {m.frequency && (
                    <span className="text-xs text-muted-foreground font-body">
                      · {FREQUENCY_LABELS[m.frequency] || m.frequency}
                    </span>
                  )}
                  {!m.is_active && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>
                  )}
                </div>
                {(m.prescribed_by || m.start_date) && (
                  <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                    {m.prescribed_by && `Prescribed by ${m.prescribed_by}`}
                    {m.start_date && ` · Started ${formatDate(m.start_date)}`}
                    {m.end_date && ` · Ended ${formatDate(m.end_date)}`}
                  </p>
                )}
                {m.notes && <p className="text-xs text-muted-foreground font-body italic mt-1">"{m.notes}"</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(m)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  title="Edit"
                  aria-label="Edit medication"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {m.is_active && (
                  <button
                    onClick={() => remove(m)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Mark inactive"
                    aria-label="Mark medication inactive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!formOpen && (
        <button onClick={startAdd} className="text-xs font-body text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add medication
        </button>
      )}

      {formOpen && (
        <div className="border border-border rounded-lg p-3 bg-background/60 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-body font-medium text-foreground uppercase tracking-wider">
              {editingId ? 'Edit medication' : 'Add medication'}
            </h4>
            <button
              onClick={cancel}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Name *</span>
              <div className="mt-1">
                <Autocomplete
                  value={form.name}
                  onChange={v => setForm({ ...form, name: v })}
                  fetcher={terminology.rxnorm}
                  placeholder="Start typing a drug name (e.g., Sertraline)"
                  aria-label="Medication name"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Dosage</span>
              <input
                type="text"
                value={form.dosage || ''}
                onChange={e => setForm({ ...form, dosage: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g., 50mg"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Frequency</span>
              <select
                value={form.frequency || ''}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {FREQUENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Start date</span>
              <input
                type="date"
                value={form.start_date || ''}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">End date</span>
              <input
                type="date"
                value={form.end_date || ''}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Prescribed by</span>
              <input
                type="text"
                value={form.prescribed_by || ''}
                onChange={e => setForm({ ...form, prescribed_by: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Defaults to your name"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Notes</span>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Side effects to watch for, instructions, etc."
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={cancel} className="text-xs font-body text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !form.name.trim()}
              className="text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add medication'}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

// ── Screening Schedule Section — clinician assigns recurring check-ins ──────

const FREQUENCY_CHOICES: { value: string; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom (every N days)' },
]

const DAY_CHOICES = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  custom: 'Custom',
}

const DAY_LABEL: Record<number, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday',
}

function ScreeningScheduleSection({ patientId }: { patientId: string }) {
  const [schedule, setSchedule] = useState<ScreeningScheduleResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [frequency, setFrequency] = useState<string>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(0)
  const [customDays, setCustomDays] = useState<number>(14)
  const [preferredTime, setPreferredTime] = useState<string>('09:00')
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const s = await dashboard.getPatientScreeningSchedule(patientId)
      setSchedule(s)
    } catch {
      toast.error('Could not load screening schedule.')
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const startEdit = () => {
    if (schedule) {
      setFrequency(schedule.frequency)
      setDayOfWeek(schedule.day_of_week ?? 0)
      setCustomDays(schedule.custom_days ?? 14)
      setPreferredTime(schedule.preferred_time || '09:00')
    } else {
      setFrequency('weekly')
      setDayOfWeek(0)
      setCustomDays(14)
      setPreferredTime('09:00')
    }
    setEditing(true)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload: ScreeningScheduleCreate = { frequency, preferred_time: preferredTime || undefined }
      if (frequency === 'weekly' || frequency === 'biweekly') payload.day_of_week = dayOfWeek
      if (frequency === 'custom') payload.custom_days = customDays
      await dashboard.assignPatientScreeningSchedule(patientId, payload)
      toast.success('Check-in rhythm set. The patient has been notified.')
      setEditing(false)
      await reload()
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not save schedule.')
    } finally {
      setSubmitting(false)
    }
  }

  const clear = async () => {
    if (!confirm('Stop the recurring check-ins for this patient? They can set up their own any time.')) return
    try {
      await dashboard.deactivatePatientScreeningSchedule(patientId)
      toast.success('Recurring check-ins stopped.')
      await reload()
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not stop schedule.')
    }
  }

  return (
    <Section icon={Calendar} title="Recurring Check-ins">
      {!editing && schedule && (
        <>
          <DataRow label="Frequency" value={FREQ_LABEL[schedule.frequency] || schedule.frequency} />
          {schedule.day_of_week !== null && schedule.day_of_week !== undefined && (
            <DataRow label="Day" value={DAY_LABEL[schedule.day_of_week]} />
          )}
          {schedule.custom_days && (
            <DataRow label="Interval" value={`Every ${schedule.custom_days} days`} />
          )}
          {schedule.preferred_time && <DataRow label="Preferred time" value={schedule.preferred_time} />}
          {schedule.next_due_at && <DataRow label="Next due" value={formatDate(schedule.next_due_at)} />}
          {schedule.last_completed_at && <DataRow label="Last completed" value={formatDate(schedule.last_completed_at)} />}
          {schedule.assigned_by_name && (
            <DataRow label="Assigned by" value={schedule.assigned_by_name} />
          )}
          <div className="flex items-center gap-3 mt-3">
            <button onClick={startEdit} className="text-xs font-body text-primary hover:underline flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5" /> Update rhythm
            </button>
            <button onClick={clear} className="text-xs font-body text-muted-foreground hover:text-rose-600 transition-colors">
              Stop recurring check-ins
            </button>
          </div>
        </>
      )}

      {!editing && !schedule && (
        <>
          <p className="text-sm text-muted-foreground font-body italic mb-3">
            No recurring rhythm yet. Suggesting one gives the patient a gentle, predictable cadence to come back to.
          </p>
          <button onClick={startEdit} className="text-xs font-body text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Set a check-in rhythm
          </button>
        </>
      )}

      {editing && (
        <div className="border border-border rounded-lg p-3 bg-background/60 mt-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-body font-medium text-foreground uppercase tracking-wider">
              {schedule ? 'Update rhythm' : 'Set a rhythm'}
            </h4>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Frequency</span>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {FREQUENCY_CHOICES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            {(frequency === 'weekly' || frequency === 'biweekly') && (
              <label className="block">
                <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Day of week</span>
                <select
                  value={dayOfWeek}
                  onChange={e => setDayOfWeek(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {DAY_CHOICES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </label>
            )}
            {frequency === 'custom' && (
              <label className="block">
                <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Every N days</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={e => setCustomDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            )}
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Preferred time</span>
              <input
                type="time"
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={() => setEditing(false)} className="text-xs font-body text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : schedule ? 'Update rhythm' : 'Set rhythm'}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

// ── Messages Tab — clinician-to-patient direct thread ───────────────────────

function MessagesTab({ patientId }: { patientId: string }) {
  const [thread, setThread] = useState<import('../types/api').DirectMessageThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    dashboard.getPatientMessages(patientId)
      .then(setThread)
      .catch(err => {
        const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(detail || 'Could not load messages.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [thread?.messages.length])

  const send = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const msg = await dashboard.sendPatientMessage(patientId, content)
      setThread(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
      setInput('')
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <BreathingCircle size="sm" label="Loading messages..." />
      </div>
    )
  }

  if (!thread) return null

  return (
    <div className="max-w-3xl">
      <div className="card-warm p-3 mb-3">
        <p className="text-xs font-body text-muted-foreground">
          Direct thread with <span className="text-foreground font-medium">{thread.patient_name}</span>.
          Private messaging — not the AI assistant. The patient sees these under their Messages page.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="card-warm p-4 h-[55vh] overflow-y-auto mb-3 space-y-3"
      >
        {thread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground font-body italic text-center max-w-xs">
              No messages yet. A short note — checking in, following up on a screening, or scheduling — can go a long way.
            </p>
          </div>
        ) : (
          thread.messages.map(m => <MessagesTabBubble key={m.id} message={m} isClinician={m.role === 'clinician'} patientName={thread.patient_name} clinicianName={thread.clinician_name || ''} />)
        )}
      </div>

      <div className="card-warm p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Write a message to the patient..."
            rows={2}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-body focus:outline-none"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="text-xs font-body bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MessagesTabBubble({
  message,
  isClinician,
  patientName,
  clinicianName,
}: {
  message: import('../types/api').DirectMessageResponse
  isClinician: boolean
  patientName: string
  clinicianName: string
}) {
  const senderName = isClinician ? clinicianName : patientName
  return (
    <div className={`flex ${isClinician ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
        isClinician ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground'
      }`}>
        <p className="text-[10px] font-body text-muted-foreground mb-0.5 uppercase tracking-wider">
          {senderName}
        </p>
        <p className="text-sm font-body whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p className="text-[10px] text-muted-foreground/70 font-body mt-1">
          {new Date(message.created_at).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

// ── Diagnoses Section — editable for clinicians, ICD-10 autocomplete ────────

const DX_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'remission', label: 'In remission' },
  { value: 'resolved', label: 'Resolved' },
]

function emptyDxForm(): DiagnosisCreate {
  return {
    condition: '',
    icd10_code: '',
    diagnosed_date: '',
    status: 'active',
    diagnosed_by: '',
    notes: '',
  }
}

function DiagnosesSection({ patientId }: { patientId: string }) {
  const [diagnoses, setDiagnoses] = useState<DiagnosisResponse[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<DiagnosisCreate>(emptyDxForm())
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const fresh = await dashboard.getPatientDiagnoses(patientId)
      setDiagnoses(fresh)
    } catch {
      toast.error('Could not refresh diagnoses.')
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const startAdd = () => {
    setForm(emptyDxForm())
    setAdding(true)
  }

  const cancel = () => {
    setAdding(false)
    setForm(emptyDxForm())
  }

  const submit = async () => {
    if (!form.condition.trim()) {
      toast.error('Condition is required.')
      return
    }
    setSubmitting(true)
    try {
      const payload: DiagnosisCreate = {
        condition: form.condition.trim(),
        icd10_code: form.icd10_code?.trim() || undefined,
        diagnosed_date: form.diagnosed_date || undefined,
        status: form.status || 'active',
        diagnosed_by: form.diagnosed_by?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      }
      await dashboard.addPatientDiagnosis(patientId, payload)
      toast.success('Diagnosis added.')
      cancel()
      await reload()
    } catch (err) {
      const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(detail || 'Could not save diagnosis.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (dx: DiagnosisResponse, status: string) => {
    try {
      await dashboard.updateDiagnosis(dx.id, { status })
      toast.success('Status updated.')
      await reload()
    } catch {
      toast.error('Could not update diagnosis.')
    }
  }

  const remove = async (dx: DiagnosisResponse) => {
    if (!confirm(`Remove the diagnosis "${dx.condition}" from this patient's record?`)) return
    try {
      await dashboard.deletePatientDiagnosis(dx.id)
      toast.success('Diagnosis removed.')
      await reload()
    } catch {
      toast.error('Could not remove diagnosis.')
    }
  }

  // When the clinician picks an ICD-10 suggestion, populate both fields.
  // NLM label is "code — name" with em-dashes; value is the code.
  const handleIcd10Pick = (s: { value: string; label: string }) => {
    const parts = s.label.split(/\s[—-]\s/)
    const name = parts.length > 1 ? parts.slice(1).join(' — ').trim() : s.label
    setForm(f => ({ ...f, icd10_code: s.value, condition: name }))
  }

  return (
    <Section icon={Heart} title={`Diagnoses (${diagnoses.length})`}>
      {diagnoses.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground font-body italic mb-3">No diagnoses on record.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {diagnoses.map(dx => (
            <div key={dx.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body font-medium text-sm text-foreground">{dx.condition}</span>
                  {dx.icd10_code && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {dx.icd10_code}
                    </span>
                  )}
                  <select
                    value={dx.status}
                    onChange={e => updateStatus(dx, e.target.value)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border-0 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="Diagnosis status"
                  >
                    {DX_STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {(dx.diagnosed_by || dx.diagnosed_date) && (
                  <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                    {dx.diagnosed_date && `Diagnosed ${formatDate(dx.diagnosed_date)}`}
                    {dx.diagnosed_by && ` · By ${dx.diagnosed_by}`}
                  </p>
                )}
                {dx.notes && <p className="text-xs text-muted-foreground font-body italic mt-1">"{dx.notes}"</p>}
              </div>
              <button
                onClick={() => remove(dx)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                title="Remove"
                aria-label="Remove diagnosis"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding && (
        <button onClick={startAdd} className="text-xs font-body text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add diagnosis
        </button>
      )}

      {adding && (
        <div className="border border-border rounded-lg p-3 bg-background/60 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-body font-medium text-foreground uppercase tracking-wider">Add diagnosis</h4>
            <button
              onClick={cancel}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">
                ICD-10 lookup
              </span>
              <p className="text-[11px] text-muted-foreground/70 font-body mb-1">
                Start typing a condition or code. Picking a result fills both the name and code.
              </p>
              <Autocomplete
                value={form.icd10_code || ''}
                onChange={v => setForm(f => ({ ...f, icd10_code: v }))}
                onPick={handleIcd10Pick}
                fetcher={terminology.icd10}
                placeholder="e.g., major depressive, F33"
                aria-label="ICD-10 code lookup"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Condition *</span>
              <input
                type="text"
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g., Major depressive disorder, recurrent"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Diagnosed on</span>
              <input
                type="date"
                value={form.diagnosed_date || ''}
                onChange={e => setForm({ ...form, diagnosed_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Status</span>
              <select
                value={form.status || 'active'}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {DX_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Diagnosed by</span>
              <input
                type="text"
                value={form.diagnosed_by || ''}
                onChange={e => setForm({ ...form, diagnosed_by: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Defaults to your name"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">Notes</span>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Clinical context, onset, severity notes..."
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={cancel} className="text-xs font-body text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !form.condition.trim()}
              className="text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Add diagnosis'}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}
