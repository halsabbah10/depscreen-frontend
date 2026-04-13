import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ClipboardList, BarChart3, FileText,
  ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { dashboard } from '../api/client'
import type { PatientSummary, ScreeningHistoryResponse, SymptomTrend, PatientDocument } from '../types/api'
import { SEVERITY_COLORS, SYMPTOM_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'
import { EmptyState } from '../components/ui/EmptyState'

type Tab = 'screenings' | 'trends' | 'documents'

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'screenings', label: 'Screenings', icon: ClipboardList },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FileText },
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
    </PageTransition>
  )
}
