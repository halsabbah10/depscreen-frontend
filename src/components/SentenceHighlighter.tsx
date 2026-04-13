import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SymptomDetection } from '../types/api'

/** Warm, muted highlight colours per symptom — light backgrounds with gentle borders. */
const HIGHLIGHT_STYLES: Record<string, string> = {
  DEPRESSED_MOOD:    'bg-blue-50/70 border-blue-200/60',
  ANHEDONIA:         'bg-purple-50/70 border-purple-200/60',
  APPETITE_CHANGE:   'bg-orange-50/70 border-orange-200/60',
  SLEEP_ISSUES:      'bg-indigo-50/70 border-indigo-200/60',
  PSYCHOMOTOR:       'bg-pink-50/70 border-pink-200/60',
  FATIGUE:           'bg-amber-50/70 border-amber-200/60',
  WORTHLESSNESS:     'bg-red-50/60 border-red-200/60',
  COGNITIVE_ISSUES:  'bg-cyan-50/70 border-cyan-200/60',
  SUICIDAL_THOUGHTS: 'bg-rose-50/60 border-rose-200/60',
}

const LABEL_STYLES: Record<string, string> = {
  DEPRESSED_MOOD:    'bg-blue-50 text-blue-700 border-blue-200',
  ANHEDONIA:         'bg-purple-50 text-purple-700 border-purple-200',
  APPETITE_CHANGE:   'bg-orange-50 text-orange-700 border-orange-200',
  SLEEP_ISSUES:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  PSYCHOMOTOR:       'bg-pink-50 text-pink-700 border-pink-200',
  FATIGUE:           'bg-amber-50 text-amber-700 border-amber-200',
  WORTHLESSNESS:     'bg-red-50 text-red-700 border-red-200',
  COGNITIVE_ISSUES:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  SUICIDAL_THOUGHTS: 'bg-rose-50 text-rose-700 border-rose-200',
}

interface SentenceHighlighterProps {
  text: string
  detections: SymptomDetection[]
}

export function SentenceHighlighter({ text, detections }: SentenceHighlighterProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const sentences = text.split(/(?<=[.!?])\s+|(?:\n+)/g).filter(s => s.trim().length > 0)

  const sentenceDetectionMap = new Map<string, SymptomDetection>()
  for (const d of detections) {
    const key = sentences.find(s =>
      s.includes(d.sentence_text) || d.sentence_text.includes(s) ||
      s.toLowerCase().includes(d.sentence_text.toLowerCase().slice(0, 30))
    )
    if (key && !sentenceDetectionMap.has(key)) {
      sentenceDetectionMap.set(key, d)
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-foreground mb-1">
        Your words, highlighted
      </h2>
      <p className="text-sm text-muted-foreground font-body mb-5">
        Sentences that contributed to the analysis are gently marked. Hover to see which criterion they relate to.
      </p>

      <div className="text-base leading-[1.85] font-body text-foreground/80">
        {sentences.map((sentence, idx) => {
          const detection = sentenceDetectionMap.get(sentence)
          const isHighlighted = !!detection
          const isHovered = hoveredIdx === idx
          const highlightClass = detection ? HIGHLIGHT_STYLES[detection.symptom] || 'bg-muted/50 border-muted' : ''

          return (
            <span
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`
                inline relative rounded-sm px-0.5 transition-all duration-200
                ${isHighlighted
                  ? `border-b-2 ${highlightClass} cursor-default`
                  : ''}
              `}
            >
              {sentence}{' '}

              {/* Tooltip */}
              <AnimatePresence>
                {isHighlighted && isHovered && detection && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 px-3 py-1.5 rounded-md bg-card border border-border shadow-md text-xs whitespace-nowrap z-20"
                  >
                    <span className="font-display text-sm">{detection.symptom_label}</span>
                    <span className="text-muted-foreground ml-2 font-body">
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          )
        })}
      </div>

      {/* Legend */}
      {detections.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
          {Array.from(new Set(detections.map(d => d.symptom))).map(symptom => {
            const d = detections.find(det => det.symptom === symptom)
            const labelClass = LABEL_STYLES[symptom] || 'bg-muted text-muted-foreground border-border'
            return (
              <span key={symptom} className={`text-xs px-2.5 py-1 rounded-full border font-body ${labelClass}`}>
                {d?.symptom_label || symptom}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
