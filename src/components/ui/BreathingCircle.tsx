/**
 * BreathingCircle — the signature DepScreen loading instrument.
 *
 * Two variants:
 *  - `pulse` (default): a calm, organic 6s breath-like pulse for typical
 *    loads (1-5s). Layered concentric rings with soft radial gradients and
 *    a breathing shadow halo. Users feel the app is alive without being
 *    prescribed a rhythm they won't complete.
 *
 *  - `therapeutic`: the clinically-validated 4-7-8 rhythm (4s inhale, 7s
 *    hold, 8s exhale — Dr. Andrew Weil's anxiety-reduction protocol).
 *    Phase-synced label cycles "Breathe in…" / "Hold…" / "Release…" so
 *    the 19-second cycle isn't wasted on waiting but becomes a guided
 *    breath. Use on long operations (≥10s) like screening submission.
 *
 * Both respect `prefers-reduced-motion`: static soft halo, no animation,
 * screen-reader label intact.
 *
 * Design intent: a loading state that actually lowers cortisol. The one
 * unforgettable thing a patient describes when telling someone about
 * DepScreen: "the app that has you breathe while you wait."
 */

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useEffect, useState } from 'react'

export type BreathingCircleSize = 'sm' | 'md' | 'lg' | 'xl'
export type BreathingCircleVariant = 'pulse' | 'therapeutic'

interface BreathingCircleProps {
  size?: BreathingCircleSize
  label?: string
  /** `pulse` for generic loading; `therapeutic` for the full 4-7-8 breath guide */
  variant?: BreathingCircleVariant
  className?: string
}

// ── Size scale (diameter of the outer ring, px) ─────────────────────────────

const OUTER_PX: Record<BreathingCircleSize, number> = {
  sm: 52,
  md: 96,
  lg: 148,
  xl: 208,
}

// Label size scales roughly with size so `lg` hero states have presence
const LABEL_PX: Record<BreathingCircleSize, string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
}

// ── Pulse variant (6s calm breath) ──────────────────────────────────────────
// Inhale ~2.2s, hold ~0.6s, exhale ~3.2s. Close enough to feel breathlike,
// fast enough to resolve before short loads finish.

const PULSE_DURATION = 6

const corePulse: Variants = {
  breathe: {
    scale: [1, 1.18, 1.2, 1],
    opacity: [0.75, 1, 1, 0.75],
    transition: {
      duration: PULSE_DURATION,
      times: [0, 0.36, 0.46, 1],
      ease: ['easeOut', 'linear', 'easeIn'],
      repeat: Infinity,
    },
  },
}

const haloPulse: Variants = {
  breathe: {
    scale: [1, 1.08, 1.1, 1],
    opacity: [0.45, 0.7, 0.7, 0.45],
    transition: {
      duration: PULSE_DURATION,
      times: [0, 0.36, 0.46, 1],
      ease: ['easeOut', 'linear', 'easeIn'],
      repeat: Infinity,
    },
  },
}

const ripplePulse: Variants = {
  breathe: {
    scale: [0.95, 1.22, 1.22, 0.95],
    opacity: [0, 0.35, 0, 0],
    transition: {
      duration: PULSE_DURATION,
      times: [0, 0.42, 0.7, 1],
      ease: ['easeOut', 'linear', 'linear'],
      repeat: Infinity,
    },
  },
}

// ── Therapeutic variant (4-7-8, 19s total) ─────────────────────────────────
// Inhale 4s (21%), hold 7s (37%), exhale 8s (42%).
// Each phase has its own easing: rising ease on inhale, flat hold, gentle
// release on exhale. That's what makes it feel like a breath, not a sine.

const T_TOTAL = 19
const T_IN = 4
const T_HOLD = 7

const tIn = T_IN / T_TOTAL // 0.2105
const tHoldEnd = (T_IN + T_HOLD) / T_TOTAL // 0.5789

const coreTherapeutic: Variants = {
  breathe: {
    scale: [1, 1.28, 1.28, 1],
    opacity: [0.7, 1, 1, 0.7],
    transition: {
      duration: T_TOTAL,
      times: [0, tIn, tHoldEnd, 1],
      ease: ['easeOut', 'linear', 'easeInOut'],
      repeat: Infinity,
    },
  },
}

const haloTherapeutic: Variants = {
  breathe: {
    scale: [1, 1.16, 1.18, 1],
    opacity: [0.4, 0.75, 0.75, 0.4],
    transition: {
      duration: T_TOTAL,
      times: [0, tIn, tHoldEnd, 1],
      ease: ['easeOut', 'linear', 'easeInOut'],
      repeat: Infinity,
    },
  },
}

// Phase-synced label cycle — only used by the therapeutic variant.
// We drive it with a simple interval rather than Framer's stagger so the
// text is decoupled from the scale animation (and stays stable across React
// remounts of the same loading page).

type BreathPhase = 'inhale' | 'hold' | 'exhale'

function useBreathPhase(enabled: boolean): BreathPhase {
  const [phase, setPhase] = useState<BreathPhase>('inhale')
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const cycle = () => {
      if (cancelled) return
      setPhase('inhale')
      timers.push(
        setTimeout(() => {
          if (cancelled) return
          setPhase('hold')
          timers.push(
            setTimeout(() => {
              if (cancelled) return
              setPhase('exhale')
              timers.push(setTimeout(cycle, 8_000))
            }, 7_000),
          )
        }, 4_000),
      )
    }
    cycle()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [enabled])
  return phase
}

const PHASE_COPY: Record<BreathPhase, string> = {
  inhale: 'Breathe in…',
  hold: 'Hold…',
  exhale: 'Release…',
}

// ── Component ───────────────────────────────────────────────────────────────

export function BreathingCircle({
  size = 'md',
  label,
  variant = 'pulse',
  className = '',
}: BreathingCircleProps) {
  const reduceMotion = useReducedMotion()
  const therapeutic = variant === 'therapeutic'
  const phase = useBreathPhase(therapeutic && !reduceMotion)

  const outerPx = OUTER_PX[size]
  const midPx = Math.round(outerPx * 0.66)
  const corePx = Math.round(outerPx * 0.38)

  const ariaLabel = label || (therapeutic ? 'Taking a slow breath while we work' : 'Working gently')

  // ── Reduced-motion fallback: static layered halo, no animation ──
  if (reduceMotion) {
    return (
      <div
        className={`flex flex-col items-center gap-4 ${className}`}
        role="status"
        aria-label={ariaLabel}
      >
        <div className="relative" style={{ width: outerPx, height: outerPx }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(175 45% 32% / 0.28) 0%, hsl(175 45% 32% / 0.12) 55%, transparent 75%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: corePx,
              height: corePx,
              left: (outerPx - corePx) / 2,
              top: (outerPx - corePx) / 2,
              background:
                'radial-gradient(circle, hsl(175 45% 40% / 0.85) 0%, hsl(175 45% 32% / 0.5) 70%, transparent 100%)',
              boxShadow: '0 0 24px hsl(175 45% 32% / 0.18)',
            }}
          />
        </div>
        {label && (
          <p className={`${LABEL_PX[size]} text-muted-foreground font-body tracking-wide`}>{label}</p>
        )}
      </div>
    )
  }

  // ── Animated variants ──
  const coreAnim = therapeutic ? coreTherapeutic : corePulse
  const haloAnim = therapeutic ? haloTherapeutic : haloPulse

  return (
    <div
      className={`flex flex-col items-center gap-4 ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: outerPx, height: outerPx }}
      >
        {/* Outer ripple — only on the pulse variant; therapeutic stays calmer */}
        {!therapeutic && (
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: 'hsl(175 45% 32% / 0.35)' }}
            variants={ripplePulse}
            animate="breathe"
            aria-hidden
          />
        )}

        {/* Halo — soft radial gradient that breathes with the rhythm */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: outerPx,
            height: outerPx,
            background:
              'radial-gradient(circle, hsl(175 45% 36% / 0.32) 0%, hsl(175 45% 32% / 0.14) 55%, transparent 78%)',
          }}
          variants={haloAnim}
          animate="breathe"
          aria-hidden
        />

        {/* Mid ring — subtle ink line that gives the halo definition */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: midPx,
            height: midPx,
            borderColor: 'hsl(175 45% 32% / 0.22)',
          }}
          variants={haloAnim}
          animate="breathe"
          aria-hidden
        />

        {/* Core — the inhale destination. Brighter, denser, softly glowing. */}
        <motion.div
          className="rounded-full"
          style={{
            width: corePx,
            height: corePx,
            background:
              'radial-gradient(circle at 35% 35%, hsl(175 50% 52%) 0%, hsl(175 45% 34%) 55%, hsl(175 50% 26%) 100%)',
            boxShadow:
              '0 0 28px hsl(175 45% 32% / 0.35), inset 0 1px 2px hsl(175 60% 78% / 0.6)',
          }}
          variants={coreAnim}
          animate="breathe"
          aria-hidden
        />
      </div>

      {/* Label + phase cue */}
      {(label || therapeutic) && (
        <div className="flex flex-col items-center gap-1">
          {label && (
            <p className={`${LABEL_PX[size]} text-muted-foreground font-body tracking-wide`}>
              {label}
            </p>
          )}
          {therapeutic && (
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-[11px] font-body italic tracking-wider"
              style={{ color: 'hsl(175 30% 32%)' }}
            >
              {PHASE_COPY[phase]}
            </motion.p>
          )}
        </div>
      )}
    </div>
  )
}

// ── BreathingDot — inline indicator (unread badges, typing, etc.) ──────────

export function BreathingDot({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) {
    return (
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${className}`}
        style={{
          background: 'hsl(175 45% 36%)',
          boxShadow: '0 0 8px hsl(175 45% 32% / 0.4)',
        }}
        aria-hidden
      />
    )
  }
  return (
    <motion.span
      className={`inline-block w-2.5 h-2.5 rounded-full ${className}`}
      style={{
        background: 'hsl(175 45% 36%)',
      }}
      animate={{
        scale: [0.85, 1.15, 0.85],
        opacity: [0.7, 1, 0.7],
        boxShadow: [
          '0 0 4px hsl(175 45% 32% / 0.3)',
          '0 0 14px hsl(175 45% 32% / 0.55)',
          '0 0 4px hsl(175 45% 32% / 0.3)',
        ],
      }}
      transition={{
        duration: 3.6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden
    />
  )
}

// ── ProgressDots — breathing dot for current step, quiet fills for others ──

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
    <div
      className={`flex gap-2 justify-center items-center ${className}`}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current
        const isDone = completedSet.has(i)

        if (isActive) return <BreathingDot key={i} />

        return (
          <span
            key={i}
            className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${
              isDone ? 'bg-primary/55' : 'bg-muted'
            }`}
            aria-hidden
          />
        )
      })}
    </div>
  )
}
