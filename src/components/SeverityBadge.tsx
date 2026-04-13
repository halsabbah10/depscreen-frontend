import { motion } from 'framer-motion'

interface SeverityBadgeProps {
  level: string
  criteriaCount: number
  totalCriteria?: number
  explanation?: string
}

/** Warm severity label for editorial report header. */
const SEVERITY_META: Record<string, { label: string; tone: string; color: string; barColor: string }> = {
  none:     { label: 'No indicators detected', tone: 'A reassuring sign', color: 'text-slate-600', barColor: 'bg-slate-300' },
  mild:     { label: 'Mild indicators', tone: 'Worth keeping an eye on', color: 'text-sky-700', barColor: 'bg-sky-400' },
  moderate: { label: 'Moderate indicators', tone: 'Professional guidance may help', color: 'text-amber-700', barColor: 'bg-amber-400' },
  severe:   { label: 'Significant indicators', tone: 'Speaking with a professional is strongly encouraged', color: 'text-red-700', barColor: 'bg-red-400' },
}

export function SeverityBadge({ level, criteriaCount, totalCriteria = 9, explanation }: SeverityBadgeProps) {
  const meta = SEVERITY_META[level] || SEVERITY_META.none
  const percentage = Math.round((criteriaCount / totalCriteria) * 100)

  return (
    <motion.div
      className="py-8 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Large serif fraction */}
      <div className="mb-3">
        <span className={`font-display text-6xl tracking-tight ${meta.color}`}>
          {criteriaCount}
        </span>
        <span className="font-display text-3xl text-muted-foreground/50 mx-1">/</span>
        <span className="font-display text-3xl text-muted-foreground/50">
          {totalCriteria}
        </span>
      </div>

      {/* Severity label */}
      <p className={`font-display text-xl ${meta.color}`}>
        {meta.label}
      </p>

      {/* Warm tone subtext */}
      <p className="text-sm text-muted-foreground mt-1 font-body">
        {meta.tone}
      </p>

      {/* Gentle progress bar */}
      <div className="max-w-xs mx-auto mt-5">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${meta.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="text-xs text-muted-foreground/60 mt-2">
          {criteriaCount} of {totalCriteria} DSM-5 criteria observed
        </p>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-md mx-auto font-body">
          {explanation}
        </p>
      )}
    </motion.div>
  )
}
