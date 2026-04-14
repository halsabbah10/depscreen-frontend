import { motion } from 'framer-motion'

interface SeverityBadgeProps {
  level: string
  criteriaCount: number
  totalCriteria?: number
  explanation?: string
}

/** Warm severity label for editorial report header.
 *  Color choices are deliberately muted — no alarm-red bar at the top of a
 *  result page, because the patient may already feel fragile. Red stays on
 *  the fraction numeral (information-carrying) but not on the progress bar. */
const SEVERITY_META: Record<string, { label: string; tone: string; color: string; barColor: string }> = {
  none:     { label: 'A quiet result', tone: 'Nothing clear came up this time — thank you for checking in.', color: 'text-slate-600', barColor: 'bg-slate-300' },
  mild:     { label: 'A few small signals', tone: 'Small signals worth gently noticing.', color: 'text-sky-700', barColor: 'bg-sky-400' },
  moderate: { label: 'Several patterns noticed', tone: 'Talking with someone might lighten the load.', color: 'text-amber-700', barColor: 'bg-amber-400' },
  severe:   { label: 'Many patterns showed up', tone: "This is a moment to let someone hold it with you — a clinician, a trusted person, or Shamsaha (17651421). You don't have to carry this alone.", color: 'text-red-700', barColor: 'bg-amber-500/70' },
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
          {criteriaCount} of {totalCriteria} patterns noticed
        </p>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-md mx-auto font-body">
          {explanation}
        </p>
      )}

      {/* Holding context — especially important for moderate/severe results so
          the patient doesn't read the number as a verdict. */}
      {(level === 'moderate' || level === 'severe') && (
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed mt-5 max-w-md mx-auto font-body">
          This is a screening signal, not a verdict. Many people see numbers
          like these on hard days — what matters now is letting someone hold
          this with you.
        </p>
      )}
    </motion.div>
  )
}
