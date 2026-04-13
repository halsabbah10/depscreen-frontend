import { motion } from 'framer-motion'
import type { SymptomDetection } from '../types/api'

const DSM5_SYMPTOM_LABELS: Record<string, string> = {
  DEPRESSED_MOOD: 'Depressed Mood',
  ANHEDONIA: 'Loss of Interest or Pleasure',
  APPETITE_CHANGE: 'Appetite or Weight Change',
  SLEEP_ISSUES: 'Sleep Disturbance',
  PSYCHOMOTOR: 'Psychomotor Changes',
  FATIGUE: 'Fatigue or Loss of Energy',
  WORTHLESSNESS: 'Worthlessness or Guilt',
  COGNITIVE_ISSUES: 'Difficulty Concentrating',
  SUICIDAL_THOUGHTS: 'Thoughts of Self-Harm',
}

/** Brief clinical descriptions for each DSM-5 criterion. */
const DSM5_CLINICAL_DESCRIPTIONS: Record<string, string> = {
  DEPRESSED_MOOD: 'Persistent feelings of sadness, emptiness, or hopelessness that colour most of the day.',
  ANHEDONIA: 'A noticeable loss of interest or pleasure in activities that were once enjoyed.',
  APPETITE_CHANGE: 'Significant changes in appetite or unintentional weight loss or gain.',
  SLEEP_ISSUES: 'Difficulty falling or staying asleep, or sleeping much more than usual.',
  PSYCHOMOTOR: 'Observable restlessness or slowing down of physical movements and speech.',
  FATIGUE: 'Persistent tiredness or loss of energy, even with adequate rest.',
  WORTHLESSNESS: 'Excessive or inappropriate feelings of guilt or a diminished sense of self-worth.',
  COGNITIVE_ISSUES: 'Difficulty thinking clearly, concentrating, or making everyday decisions.',
  SUICIDAL_THOUGHTS: 'Recurrent thoughts about death, self-harm, or ending one\'s life.',
}

const ALL_SYMPTOMS = Object.keys(DSM5_SYMPTOM_LABELS)

interface SymptomChecklistProps {
  detections: SymptomDetection[]
  symptomExplanations?: Record<string, string>
}

export function SymptomChecklist({ detections, symptomExplanations }: SymptomChecklistProps) {
  const detectedMap = new Map<string, SymptomDetection>()
  for (const d of detections) {
    if (!detectedMap.has(d.symptom) || d.confidence > detectedMap.get(d.symptom)!.confidence) {
      detectedMap.set(d.symptom, d)
    }
  }

  const detectedSymptoms = ALL_SYMPTOMS.filter(s => detectedMap.has(s))
  const undetectedSymptoms = ALL_SYMPTOMS.filter(s => !detectedMap.has(s))

  return (
    <div className="space-y-6">
      {/* Section title */}
      <div>
        <h2 className="font-display text-2xl text-foreground">
          What we observed
        </h2>
        <p className="text-sm text-muted-foreground mt-1 font-body">
          {detectedMap.size} of {ALL_SYMPTOMS.length} DSM-5 criteria were reflected in your words.
          {detectedMap.size > 0 && ' Each finding is shown with the evidence that informed it.'}
        </p>
      </div>

      {/* Detected symptoms — editorial sections */}
      {detectedSymptoms.map((symptom, idx) => {
        const detection = detectedMap.get(symptom)!
        const explanation = symptomExplanations?.[symptom] ||
          symptomExplanations?.[DSM5_SYMPTOM_LABELS[symptom]] || null

        return (
          <motion.div
            key={symptom}
            className="pb-6 border-b border-border last:border-b-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Symptom name — serif */}
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h3 className="font-display text-lg text-foreground">
                {DSM5_SYMPTOM_LABELS[symptom]}
              </h3>
              <span className="text-xs text-muted-foreground/60 font-body shrink-0">
                {Math.round(detection.confidence * 100)}% confidence
              </span>
            </div>

            {/* Clinical description */}
            <p className="text-sm text-muted-foreground leading-relaxed font-body mb-3">
              {DSM5_CLINICAL_DESCRIPTIONS[symptom]}
            </p>

            {/* Evidence pull-quote */}
            {detection.sentence_text && (
              <blockquote className="pull-quote text-base leading-relaxed">
                {detection.sentence_text}
              </blockquote>
            )}

            {/* AI explanation */}
            {explanation && (
              <p className="text-sm text-muted-foreground/80 leading-relaxed font-body mt-3">
                {explanation}
              </p>
            )}
          </motion.div>
        )
      })}

      {/* Undetected symptoms — quiet list */}
      {undetectedSymptoms.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-body mb-3">
            Not observed
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {undetectedSymptoms.map(symptom => (
              <span key={symptom} className="text-sm text-muted-foreground/40 font-body">
                {DSM5_SYMPTOM_LABELS[symptom]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
