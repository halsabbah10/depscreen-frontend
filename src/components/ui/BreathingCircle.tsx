/**
 * The signature DepScreen component.
 *
 * A breathing circle that follows the clinically-validated 4-7-8 rhythm
 * (4s inhale, 7s hold, 8s exhale) used in anxiety reduction therapy.
 *
 * Turns waiting into therapy — literally lowers cortisol.
 * Used during: screening submission, chat loading, page transitions.
 */

import { motion } from 'framer-motion'

interface BreathingCircleProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
}

// 4-7-8 breathing: 4s in, 7s hold, 8s out = 19s total
const breathingAnimation = {
  scale: [1, 1.15, 1.15, 1],
  opacity: [0.3, 0.9, 0.9, 0.3],
}

const breathingTransition = {
  duration: 19,
  times: [0, 0.21, 0.58, 1] as number[], // 4/19, 11/19, 19/19
  repeat: Infinity,
  ease: 'easeInOut' as const,
}

export function BreathingCircle({ size = 'md', label, className = '' }: BreathingCircleProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label || 'Processing — breathe gently'}>
      <motion.div
        className={`${sizes[size]} rounded-full bg-primary/20 border border-primary/10`}
        animate={breathingAnimation}
        transition={breathingTransition}
      >
        <motion.div
          className="w-full h-full rounded-full bg-primary/30"
          animate={breathingAnimation}
          transition={breathingTransition}
        />
      </motion.div>

      {label && (
        <motion.p
          className="text-xs text-muted-foreground font-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {label}
        </motion.p>
      )}
    </div>
  )
}

/**
 * Smaller breathing dot for inline use (progress indicators, typing states).
 */
export function BreathingDot({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`w-2.5 h-2.5 rounded-full bg-primary ${className}`}
      animate={{
        scale: [0.8, 1.3, 0.8],
        opacity: [0.3, 1, 0.3],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    />
  )
}

/**
 * Row of breathing dots for progress tracking (e.g., check-in question progress).
 */
export function ProgressDots({
  total,
  current,
  completed,
  className = '',
}: {
  total: number
  current: number
  completed: Set<number> | number[]
  className?: string
}) {
  const completedSet = completed instanceof Set ? completed : new Set(completed)

  return (
    <div className={`flex gap-2 justify-center ${className}`} role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current
        const isDone = completedSet.has(i)

        return isActive ? (
          <BreathingDot key={i} />
        ) : (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isDone ? 'bg-primary/50' : 'bg-muted'
            }`}
          />
        )
      })}
    </div>
  )
}
