import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, MessageCircle,
  AlertTriangle, Phone,
} from 'lucide-react'
import { screening as screeningApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import type { ScreeningResponse } from '../types/api'
import { SeverityBadge } from '../components/SeverityBadge'
import { SymptomChecklist } from '../components/SymptomChecklist'
import { SentenceHighlighter } from '../components/SentenceHighlighter'
import { formatDate, formatTime, TOP_CRISIS_RESOURCES, SAFETY_DISCLAIMER } from '../lib/localization'
import { PageTransition, StaggerChildren, StaggerItem } from '../components/ui/PageTransition'
import { BreathingCircle } from '../components/ui/BreathingCircle'

export function ResultPage() {
  const { screeningId } = useParams<{ screeningId: string }>()
  const { isPatient } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<ScreeningResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!screeningId) return
    setLoading(true)
    screeningApi.getById(screeningId)
      .then(setData)
      .catch(err => setError(err.detail || 'Failed to load screening results.'))
      .finally(() => setLoading(false))
  }, [screeningId])

  /* ── Loading state — breathing circle ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <BreathingCircle size="lg" label="Preparing your results — take a slow breath" />
      </div>
    )
  }

  /* ── Error state ── */
  if (error || !data) {
    return (
      <PageTransition className="max-w-lg mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
        <p className="font-display text-xl text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6 font-body">
          {error || 'We could not find this screening. It may have been removed, or the link may be incorrect.'}
        </p>
        <Link
          to={isPatient ? '/history' : '/dashboard'}
          className="btn-outline inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {isPatient ? 'Back to My History' : 'Back to Dashboard'}
        </Link>
      </PageTransition>
    )
  }

  const { symptom_analysis, verification, explanation_report } = data
  const hasSuicidalIdeation = symptom_analysis.dsm5_criteria_met.includes('SUICIDAL_THOUGHTS')

  /* ── Verification helpers ── */
  const evidenceSupported = verification.evidence_validation.evidence_supports_prediction
  const coherencePercent = Math.round(verification.evidence_validation.coherence_score * 100)
  const isAuthentic = !verification.adversarial_check.likely_adversarial
  const authenticityPercent = Math.round(verification.adversarial_check.authenticity_score * 100)
  const trustLevel = verification.confidence_analysis.should_trust_prediction
  const confounders = verification.confidence_analysis.potential_confounders

  return (
    <PageTransition>
      <article className="max-w-[680px] mx-auto px-4 pb-16">
        <StaggerChildren className="space-y-10" staggerDelay={0.07}>

          {/* ── Navigation ── */}
          <StaggerItem>
            <div className="flex items-center justify-between pt-2">
              <Link
                to={isPatient ? '/history' : '/dashboard'}
                className="btn-ghost text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isPatient ? 'My History' : 'Dashboard'}
              </Link>

              {isPatient && screeningId && (
                <button
                  onClick={() => navigate(`/chat/screening/${screeningId}`)}
                  className="btn-primary text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat about these results
                </button>
              )}
            </div>
          </StaggerItem>

          {/* ── Crisis support (warm clay, not alarming) ── */}
          {hasSuicidalIdeation && (
            <StaggerItem>
              <div className="rounded-lg p-5 border border-clay/20" style={{ backgroundColor: 'hsl(20 50% 55% / 0.06)' }}>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'hsl(20 50% 45%)' }} />
                  <div className="flex-1">
                    <p className="font-display text-lg" style={{ color: 'hsl(20 50% 35%)' }}>
                      You are not alone — help is here
                    </p>
                    <p className="text-sm font-body mt-1 leading-relaxed" style={{ color: 'hsl(20 40% 40%)' }}>
                      In Bahrain, call <strong>999</strong> for an ambulance to the Salmaniya Medical Complex psychiatric emergency department. Reaching out takes courage, and it is always the right choice.
                    </p>

                    <div className="grid gap-3 mt-4 sm:grid-cols-2">
                      {TOP_CRISIS_RESOURCES.map(r => (
                        <a
                          key={r.id}
                          href={`tel:${r.phone}`}
                          className="flex items-start gap-2 text-sm group"
                        >
                          <Phone className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: 'hsl(20 50% 45%)' }} />
                          <div>
                            <div className="font-medium group-hover:underline" style={{ color: 'hsl(20 50% 35%)' }}>
                              {r.nameShort}
                            </div>
                            <div className="text-xs font-body" style={{ color: 'hsl(20 40% 50%)' }}>
                              {r.phoneDisplay}{r.available247 ? ' \u00b7 24/7' : ''}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          )}

          {/* ── Severity badge (editorial header) ── */}
          <StaggerItem>
            <SeverityBadge
              level={symptom_analysis.severity_level}
              criteriaCount={symptom_analysis.dsm5_criteria_met.length}
              explanation={symptom_analysis.severity_explanation}
            />
          </StaggerItem>

          {/* ── Divider ── */}
          <StaggerItem>
            <hr className="border-border" />
          </StaggerItem>

          {/* ── Symptom checklist (editorial sections) ── */}
          <StaggerItem>
            <SymptomChecklist
              detections={symptom_analysis.symptoms_detected}
              symptomExplanations={explanation_report.symptom_explanations}
            />
          </StaggerItem>

          {/* ── Sentence-level highlighting ── */}
          {data.text && data.text.length < 5000 && (
            <StaggerItem>
              <hr className="border-border" />
              <SentenceHighlighter
                text={data.text}
                detections={symptom_analysis.symptoms_detected}
              />
            </StaggerItem>
          )}

          {/* ── AI Explanation ── */}
          <StaggerItem>
            <hr className="border-border" />
            <div className="space-y-4">
              <h2 className="font-display text-2xl text-foreground">
                Understanding your screening
              </h2>

              <p className="text-base text-muted-foreground leading-relaxed font-body">
                {explanation_report.summary}
              </p>

              {explanation_report.why_model_thinks_this && (
                <div>
                  <h3 className="font-display text-lg text-foreground mb-1">
                    How the model reached this conclusion
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-body">
                    {explanation_report.why_model_thinks_this}
                  </p>
                </div>
              )}

              {/* Key evidence quotes as pull-quotes */}
              {explanation_report.key_evidence_quotes.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h3 className="font-display text-lg text-foreground">
                    Key evidence
                  </h3>
                  {explanation_report.key_evidence_quotes.map((quote, i) => (
                    <blockquote key={i} className="pull-quote text-base leading-relaxed">
                      {quote}
                    </blockquote>
                  ))}
                </div>
              )}

              {explanation_report.uncertainty_notes && (
                <div>
                  <h3 className="font-display text-lg text-foreground mb-1">
                    What the model is less certain about
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-body">
                    {explanation_report.uncertainty_notes}
                  </p>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* ── Verification — 3 stat cards ── */}
          <StaggerItem>
            <hr className="border-border" />
            <div className="space-y-4">
              <h2 className="font-display text-2xl text-foreground">
                Verification
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                These checks help ensure the analysis is reliable and the input is genuine.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Evidence support */}
                <div className="card-warm p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
                    Evidence Support
                  </p>
                  <p className={`font-display text-2xl ${evidenceSupported ? 'text-primary' : 'text-amber-600'}`}>
                    {evidenceSupported ? 'Supported' : 'Partial'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 font-body mt-1">
                    {coherencePercent}% coherence
                  </p>
                </div>

                {/* Authenticity */}
                <div className="card-warm p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
                    Input Authenticity
                  </p>
                  <p className={`font-display text-2xl ${isAuthentic ? 'text-primary' : 'text-destructive'}`}>
                    {isAuthentic ? 'Authentic' : 'Flagged'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 font-body mt-1">
                    {authenticityPercent}% score
                  </p>
                </div>

                {/* Trust level */}
                <div className="card-warm p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
                    Trust Level
                  </p>
                  <p className={`font-display text-2xl ${
                    trustLevel === 'high' ? 'text-primary' :
                    trustLevel === 'medium' ? 'text-amber-600' : 'text-destructive'
                  }`}>
                    {trustLevel.charAt(0).toUpperCase() + trustLevel.slice(1)}
                  </p>
                  {confounders.length > 0 && (
                    <p className="text-xs text-muted-foreground/60 font-body mt-1">
                      {confounders.length} potential confounder{confounders.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {data.adversarial_warning && (
                <div className="rounded-md p-3 border border-amber-200 bg-amber-50/60">
                  <p className="text-sm text-amber-700 flex items-center gap-2 font-body">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {data.adversarial_warning}
                  </p>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* ── Safety disclaimer (warm amber card) ── */}
          <StaggerItem>
            <div className="rounded-lg p-5 border border-amber-200/60 bg-amber-50/40">
              <p className="font-display text-lg text-amber-800/80 mb-2">
                An important note
              </p>
              <p className="text-sm text-amber-700/70 leading-relaxed font-body">
                {explanation_report.safety_disclaimer || SAFETY_DISCLAIMER}
              </p>

              {explanation_report.resources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200/40">
                  <p className="text-xs text-amber-700/60 uppercase tracking-wider font-body mb-2">
                    Mental Health Resources
                  </p>
                  <ul className="space-y-1.5">
                    {explanation_report.resources.map((r, i) => (
                      <li key={i} className="text-sm text-amber-700/70 font-body leading-relaxed">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </StaggerItem>

          {/* ── Metadata footer ── */}
          <StaggerItem>
            <div className="flex items-center justify-between text-xs text-muted-foreground/40 font-body px-1 pt-4 border-t border-border">
              <span>ID: {data.id.slice(0, 8)}</span>
              <span>
                {formatDate(data.created_at)} {formatTime(data.created_at)}
              </span>
              <span>
                Confidence: {Math.round(data.final_confidence * 100)}%
                {data.confidence_adjusted && ' (adjusted)'}
              </span>
            </div>
          </StaggerItem>

        </StaggerChildren>
      </article>
    </PageTransition>
  )
}
