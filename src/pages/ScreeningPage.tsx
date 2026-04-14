import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Upload, Share2, PenLine,
  Clock, Heart,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { ingest } from '../api/client'
import type { CheckInPrompt } from '../types/api'

import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle, ProgressDots } from '../components/ui/BreathingCircle'
import { Skeleton } from '../components/ui/Skeleton'

// ── Types ───────────────────────────────────────────────────────────────────

type View = 'select' | 'checkin' | 'social' | 'bulk'
type SocialPlatform = 'reddit' | 'x'

// ── Patient-friendly criterion labels ───────────────────────────────────────
// Clinical DSM-5 codes (SUICIDAL_THOUGHTS, ANHEDONIA, etc.) are kept internal.
// The patient sees soft topical words that don't alarm or clinicalize the
// moment of answering. First letter capitalized for consistency.
const CRITERION_LABELS: Record<string, string> = {
  DEPRESSED_MOOD: 'Mood',
  ANHEDONIA: 'What brings you joy',
  APPETITE_CHANGE: 'Appetite',
  SLEEP_ISSUES: 'Sleep',
  PSYCHOMOTOR: 'Body',
  FATIGUE: 'Energy',
  WORTHLESSNESS: 'How you see yourself',
  COGNITIVE_ISSUES: 'Focus',
  SUICIDAL_THOUGHTS: 'Safety',
}

// ── Motion presets ──────────────────────────────────────────────────────────



const questionTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
}

// ── Component ───────────────────────────────────────────────────────────────

export function ScreeningPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<View>('select')
  const [loading, setLoading] = useState(false)

  // Check-in state
  const [prompts, setPrompts] = useState<CheckInPrompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [currentPrompt, setCurrentPrompt] = useState(0)

  // Social media state
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>('reddit')
  const [username, setUsername] = useState('')
  const [mentalHealthOnly, setMentalHealthOnly] = useState(true)

  // Bulk state
  const [bulkContent, setBulkContent] = useState('')

  // Derived
  const answeredCount = useMemo(
    () => Object.values(responses).filter(v => v.trim().length > 0).length,
    [responses],
  )

  const completedIndices = useMemo(
    () => prompts.reduce<number[]>((acc, p, i) => {
      if (responses[p.id]?.trim()) acc.push(i)
      return acc
    }, []),
    [prompts, responses],
  )

  // ── Load prompts when entering check-in ─────────────────────────────────

  useEffect(() => {
    if (view === 'checkin' && prompts.length === 0) {
      setPromptsLoading(true)
      ingest
        .getCheckInPrompts()
        .then(data => setPrompts(data.prompts))
        .catch(() => toast.error('Could not load check-in questions. Please try again.'))
        .finally(() => setPromptsLoading(false))
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────

  const goBack = () => {
    setView('select')
    setUsername('')
    setMentalHealthOnly(true)
  }

  const handleSubmitCheckin = async () => {
    if (answeredCount < 3) {
      toast.error('A few more answers will help this be more meaningful — 3 is a good starting point.')
      return
    }
    setLoading(true)
    try {
      const result = await ingest.submitCheckIn(responses)
      toast.success('Your responses have been received. Preparing your results.')
      navigate(`/results/${result.id}`)
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Something went wrong. Please try again when you are ready.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitSocial = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username to continue.')
      return
    }
    setLoading(true)
    try {
      const result = socialPlatform === 'reddit'
        ? await ingest.analyzeReddit(username.trim(), mentalHealthOnly)
        : await ingest.analyzeX(username.trim(), mentalHealthOnly)
      toast.success('Analysis complete. Taking you to your results.')
      navigate(`/results/${result.screening_id}`)
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(
        errorDetail ||
        `We could not retrieve posts from ${socialPlatform === 'reddit' ? 'Reddit' : 'X'}. Please double-check the username.`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitBulk = async () => {
    if (bulkContent.trim().length < 50) {
      toast.error('A little more writing helps us understand better. Share whatever feels right.')
      return
    }
    setLoading(true)
    try {
      const result = await ingest.uploadBulk(bulkContent) as { screening_id: string }
      toast.success('Your text has been analyzed. Preparing your results.')
      navigate(`/results/${result.screening_id}`)
    } catch (err: unknown) {
      const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
      toast.error(errorDetail || 'Upload did not complete. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Back button (shared) ──────────────────────────────────────────────────

  const BackButton = () => (
    <motion.button
      onClick={goBack}
      className="btn-ghost text-sm mb-6 -ml-2 group"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Back to methods</span>
    </motion.button>
  )

  // ── Loading overlay ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition className="max-w-2xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <BreathingCircle size="lg" label="Taking a moment to understand your words..." />
          <p className="text-sm text-muted-foreground font-body text-center max-w-xs leading-relaxed">
            Breathe gently if you need to. This will only take a moment.
          </p>
        </div>
      </PageTransition>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  METHOD SELECTION
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'select') {
    const methods = [
      {
        id: 'checkin' as View,
        icon: PenLine,
        title: 'Guided Check-in',
        description:
          'A thoughtful series of questions aligned with clinical criteria. Like a quiet conversation with yourself.',
        time: '3 to 5 minutes',
        recommended: true,
      },
      {
        id: 'social' as View,
        icon: Share2,
        title: 'Social Media Analysis',
        description:
          'We gently review your public posts on Reddit or X for patterns that may reflect how you have been feeling.',
        time: '1 to 2 minutes',
        recommended: false,
      },
      {
        id: 'bulk' as View,
        icon: Upload,
        title: 'Upload Text Data',
        description:
          'Share journal entries, exported messages, or personal writing. Your words, in your own time.',
        time: 'Varies',
        recommended: false,
      },
    ]

    return (
      <PageTransition className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-3 text-balance text-center">
            How would you like to begin?
          </h1>
          <p className="font-body text-muted-foreground text-base leading-relaxed max-w-lg mx-auto text-center">
            There is no wrong choice here. Each method helps us understand how you
            have been feeling by looking at the words you use. Everything stays
            private and confidential.
          </p>
        </div>

        {/* Method cards */}
        <StaggerChildren className="space-y-4" staggerDelay={0.1}>
          {methods.map(m => (
            <StaggerItem key={m.id}>
              <button
                onClick={() => setView(m.id)}
                className={`
                  w-full text-left p-6 rounded-lg border transition-all duration-300 group
                  hover:shadow-md hover:border-primary/30
                  ${m.recommended ? 'card-warm border-primary/20' : 'card'}
                `}
              >
                <div className="flex items-start gap-5">
                  {/* Icon circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300
                    ${m.recommended
                      ? 'bg-primary/12 text-primary group-hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                  `}>
                    <m.icon className="w-5 h-5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-display text-lg text-foreground">
                        {m.title}
                      </span>
                      {m.recommended && (
                        <span className="text-[11px] font-body font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed mb-2">
                      {m.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-body">{m.time}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-all duration-300 group-hover:translate-x-0.5 mt-3 shrink-0" />
                </div>
              </button>
            </StaggerItem>
          ))}
        </StaggerChildren>

        {/* Gentle footer note */}
        <motion.p
          className="text-center text-xs text-muted-foreground/60 font-body mt-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          All screening methods analyze language patterns against DSM-5 criteria.
          <br />
          This is not a diagnosis — it is a starting point for understanding.
        </motion.p>
      </PageTransition>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  GUIDED CHECK-IN
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'checkin') {
    // Loading skeleton while prompts load
    if (promptsLoading || prompts.length === 0) {
      return (
        <PageTransition className="max-w-2xl mx-auto px-4">
          <BackButton />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="card-warm p-8 mt-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          </div>
        </PageTransition>
      )
    }

    const prompt = prompts[currentPrompt]
    const isFirst = currentPrompt === 0
    const isLast = currentPrompt === prompts.length - 1
    const canSubmit = answeredCount >= 3

    return (
      <PageTransition className="max-w-2xl mx-auto px-4">
        <BackButton />

        {/* Title area */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">
            Guided Check-in
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-body">
            <span>
              Question {currentPrompt + 1} of {prompts.length}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{answeredCount} answered</span>
            {answeredCount < 3 && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="text-primary/70">At least 3 needed</span>
              </>
            )}
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          {prompt && (
            <motion.div
              key={prompt.id}
              {...questionTransition}
              className="card-warm p-6 md:p-8 mb-6"
            >
              {/* Patient-friendly topic label — clinical codes are kept internal */}
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-body mb-4">
                {CRITERION_LABELS[prompt.dsm5_criterion] || prompt.dsm5_criterion.replace(/_/g, ' ').toLowerCase()}
              </p>

              {/* Large serif question */}
              <h2 className="font-display text-xl md:text-2xl text-foreground leading-snug mb-2 text-balance">
                {prompt.question}
              </h2>

              {/* Follow-up prompt */}
              {prompt.follow_up && (
                <p className="font-body text-sm text-muted-foreground leading-relaxed mb-5 italic">
                  {prompt.follow_up}
                </p>
              )}

              {!prompt.follow_up && <div className="mb-5" />}

              {/* Journal-style textarea */}
              <div className="relative">
                <textarea
                  className="
                    w-full min-h-[160px] px-5 py-4 resize-y
                    bg-background/60 border border-border/60 rounded-lg
                    text-foreground font-body text-[15px] leading-[1.85]
                    placeholder:text-muted-foreground/40
                    focus:outline-none focus:ring-1 focus:ring-primary/25 focus:border-primary/30
                    transition-all duration-300
                  "
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(transparent, transparent 1.85em, hsl(var(--border) / 0.3) 1.85em, hsl(var(--border) / 0.3) calc(1.85em + 1px))',
                    backgroundPosition: '0 0.9em',
                  }}
                  placeholder="Write whatever comes to mind. There are no wrong answers here..."
                  value={responses[prompt.id] || ''}
                  onChange={e =>
                    setResponses(prev => ({ ...prev, [prompt.id]: e.target.value }))
                  }
                />
              </div>

              {/* Gentle encouragement */}
              <div className="flex items-center gap-2 mt-3">
                <Heart className="w-3.5 h-3.5 text-clay/50" />
                <p className="text-xs text-muted-foreground/50 font-body">
                  Take your time. Breathe if you need to.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {!isFirst && (
              <button
                onClick={() => setCurrentPrompt(p => p - 1)}
                className="btn-ghost text-sm group"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLast ? (
              <button
                onClick={handleSubmitCheckin}
                disabled={!canSubmit}
                className="btn-primary text-sm"
              >
                Complete Check-in
              </button>
            ) : (
              <button
                onClick={() => setCurrentPrompt(p => p + 1)}
                className="btn-primary text-sm group"
              >
                Next
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Breathing progress dots */}
        <ProgressDots
          total={prompts.length}
          current={currentPrompt}
          completed={completedIndices}
          className="mt-2"
        />
      </PageTransition>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SOCIAL MEDIA ANALYSIS (unified Reddit + X)
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'social') {
    const prefix = socialPlatform === 'reddit' ? 'u/' : '@'
    const platformLabel = socialPlatform === 'reddit' ? 'Reddit' : 'X'
    const contentLabel = socialPlatform === 'reddit' ? 'subreddits' : 'content'

    return (
      <PageTransition className="max-w-xl mx-auto px-4">
        <BackButton />

        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">
            Social Media Analysis
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-md">
            We will gently review your public posts for language patterns
            that may reflect how you have been feeling. Nothing is stored
            beyond the screening.
          </p>
        </div>

        <div className="card-warm p-6 md:p-8 space-y-6">
          {/* Platform selector */}
          <div>
            <label className="block text-sm font-body font-medium text-foreground mb-3">
              Choose a platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['reddit', 'x'] as const).map(platform => {
                const isActive = socialPlatform === platform
                const label = platform === 'reddit' ? 'Reddit' : 'X (Twitter)'
                return (
                  <button
                    key={platform}
                    onClick={() => {
                      setSocialPlatform(platform)
                      setUsername('')
                    }}
                    className={`
                      p-3 rounded-lg border text-sm font-body text-center transition-all duration-200
                      ${isActive
                        ? 'border-primary/40 bg-primary/5 text-primary font-medium'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/20 hover:bg-primary/5'}
                    `}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Username input */}
          <div>
            <label className="block text-sm font-body font-medium text-foreground mb-1.5">
              {platformLabel} Username
            </label>
            <div className="flex items-stretch">
              <span className="inline-flex items-center px-3.5 bg-muted border border-border border-r-0 rounded-l-md text-sm text-muted-foreground font-body">
                {prefix}
              </span>
              <input
                type="text"
                className="input rounded-l-none"
                placeholder="your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && username.trim()) handleSubmitSocial()
                }}
              />
            </div>
          </div>

          {/* Mental health filter */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={mentalHealthOnly}
              onChange={e => setMentalHealthOnly(e.target.checked)}
              className="mt-0.5 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground font-body leading-relaxed group-hover:text-foreground transition-colors">
              Only analyze posts from mental health-related {contentLabel}
            </span>
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmitSocial}
            disabled={!username.trim()}
            className="btn-primary w-full"
          >
            Analyze {platformLabel} Profile
          </button>
        </div>

        {/* Privacy note */}
        <motion.p
          className="text-center text-xs text-muted-foreground/50 font-body mt-6 leading-relaxed max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Only your publicly visible posts are accessed. No login credentials,
          API keys, or private data are required or collected.
        </motion.p>
      </PageTransition>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  UPLOAD TEXT DATA
  // ══════════════════════════════════════════════════════════════════════════

  if (view === 'bulk') {
    const charCount = bulkContent.length
    const isReady = charCount >= 50

    return (
      <PageTransition className="max-w-2xl mx-auto px-4">
        <BackButton />

        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">
            Upload Text Data
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-lg">
            Share journal entries, exported messages, or personal writing.
            Each paragraph will be considered separately. Write as much
            or as little as feels right.
          </p>
        </div>

        <div className="card-warm p-6 md:p-8 space-y-5">
          <textarea
            className="
              w-full min-h-[220px] px-4 py-4 resize-y
              bg-background/60 border border-border/60 rounded-lg
              text-foreground font-body text-[15px] leading-[1.85]
              placeholder:text-muted-foreground/40
              focus:outline-none focus:ring-1 focus:ring-primary/25 focus:border-primary/30
              transition-all duration-300
            "
            placeholder="Paste or type your text here..."
            value={bulkContent}
            onChange={e => setBulkContent(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60 font-body">
              {charCount.toLocaleString()} character{charCount !== 1 ? 's' : ''}
              {!isReady && charCount > 0 && (
                <span className="ml-1.5 text-clay/60">
                  (at least 50 needed)
                </span>
              )}
            </span>

            <button
              onClick={handleSubmitBulk}
              disabled={!isReady}
              className="btn-primary text-sm"
            >
              Analyze Text
            </button>
          </div>
        </div>

        <motion.p
          className="text-center text-xs text-muted-foreground/50 font-body mt-6 leading-relaxed max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Your text is analyzed once and never shared. You can delete your
          screening at any time from your history.
        </motion.p>
      </PageTransition>
    )
  }

  return null
}
