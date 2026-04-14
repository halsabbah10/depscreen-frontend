import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ChevronRight, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboard } from '../api/client'
import type { PatientSummary } from '../types/api'
import { SEVERITY_COLORS } from '../types/api'
import { formatDate } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'

/** Avatar color palette — warm, muted tones that feel clinical but approachable. */
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

/** Sort patients: severe first, then moderate, mild, none, then null. */
const SEVERITY_ORDER: Record<string, number> = { severe: 0, moderate: 1, mild: 2, none: 3 }

function sortBySeverity(a: PatientSummary, b: PatientSummary): number {
  const sa = a.last_severity ? (SEVERITY_ORDER[a.last_severity] ?? 4) : 5
  const sb = b.last_severity ? (SEVERITY_ORDER[b.last_severity] ?? 4) : 5
  return sa - sb
}

export function PatientListPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboard.getPatients()
      .then(list => setPatients([...list].sort(sortBySeverity)))
      .catch((err: unknown) => {
        const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(detail || 'Could not load patients.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageTransition className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-foreground tracking-tight">Your Patients</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground tracking-tight">Your Patients</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          {patients.length} patient{patients.length !== 1 ? 's' : ''} linked to your practice
        </p>
      </div>

      {patients.length === 0 ? (
        <div className="card-warm rounded-xl">
          <EmptyState
            icon={<Users className="w-5 h-5 text-muted-foreground/50" />}
            title="No patients linked yet"
            description="Share your clinician code to get started. Patients enter it during registration to connect with you."
          />
        </div>
      ) : (
        <StaggerChildren className="space-y-3">
          {patients.map(p => {
            const sev = p.last_severity || 'none'
            const colors = SEVERITY_COLORS[sev] || SEVERITY_COLORS.none
            const initials = p.full_name
              .split(' ')
              .map(w => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <StaggerItem key={p.id}>
                <Link
                  to={`/patients/${p.id}`}
                  className="card-warm rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${avatarColor(p.full_name)}`}>
                    <span className="text-sm font-semibold font-body">{initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-body text-foreground">{p.full_name}</p>
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                      {p.last_severity && (
                        <span className={`text-[10px] font-body uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {sev}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-body">
                        {p.total_screenings} screening{p.total_screenings !== 1 ? 's' : ''}
                      </span>
                      {p.last_screening_date && (
                        <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(p.last_screening_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Symptom count */}
                  {p.last_symptom_count !== null && p.last_symptom_count > 0 && (
                    <span className="text-xs text-muted-foreground font-body shrink-0">
                      {p.last_symptom_count} symptom{p.last_symptom_count !== 1 ? 's' : ''}
                    </span>
                  )}

                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-primary transition-colors" />
                </Link>
              </StaggerItem>
            )
          })}
        </StaggerChildren>
      )}
    </PageTransition>
  )
}
