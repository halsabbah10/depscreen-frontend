import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ClipboardList, BarChart3, FileText, ClipboardCheck,
  ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, Save, Target, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboard } from '../api/client'
import type { PatientSummary, ScreeningHistoryResponse, SymptomTrend, PatientDocument, CarePlanResponse } from '../types/api'
import { SEVERITY_COLORS, SYMPTOM_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

type Tab = 'screenings' | 'trends' | 'documents' | 'care-plan'

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'screenings', label: 'Screenings', icon: ClipboardList },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'care-plan', label: 'Care Plan', icon: ClipboardCheck },
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
  const [tab, setTab] = useState<Tab>('screenings')

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
      .catch(() => {})
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
