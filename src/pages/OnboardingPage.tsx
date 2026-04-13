/**
 * OnboardingPage — Multi-step welcome wizard for new patients.
 *
 * Steps: Welcome → Demographics → Contact → Medical → Emergency Contacts → Complete
 *
 * Each step saves immediately to the backend. Patient can quit and resume.
 * Tone: warm, unhurried, non-judgmental. "Take your time."
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Heart, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { patient as patientApi } from '../api/client'
import type { ProfileUpdate } from '../types/api'
import { useAuth } from '../contexts/AuthContext'
import { BreathingDot, ProgressDots } from '../components/ui/BreathingCircle'

interface Step {
  id: string
  title: string
  description: string
}

const STEPS: Step[] = [
  { id: 'welcome', title: 'Welcome', description: 'A brief introduction' },
  { id: 'demographics', title: 'About You', description: 'Basic personal information' },
  { id: 'contact', title: 'Contact', description: 'How to reach you' },
  { id: 'medical', title: 'Medical', description: 'Health background' },
  { id: 'emergency', title: 'Emergency Contact', description: 'Someone we can reach in a crisis' },
  { id: 'complete', title: 'All Set', description: 'You are ready' },
]

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Form state — pre-filled from existing user data if available
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  const [cprNumber, setCprNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRelation, setContactRelation] = useState('parent')

  // Pre-fill from existing user data (resume partially completed onboarding)
  useEffect(() => {
    if (user) {
      if (user.date_of_birth) setDateOfBirth(user.date_of_birth)
      if (user.gender) setGender(user.gender)
      if (user.cpr_number) setCprNumber(user.cpr_number)
    }
    // Also check onboarding status to skip ahead
    patientApi.getOnboardingStatus().then(status => {
      if (status.demographics_complete && status.contact_complete) {
        setStep(3) // Skip to medical
      } else if (status.demographics_complete) {
        setStep(2) // Skip to contact
      }
    }).catch(() => {}) // Silently fail — start from beginning
  }, [user])

  const completedSteps = new Set<number>()
  // Mark steps as complete based on filled data
  if (dateOfBirth && gender) completedSteps.add(1)
  if (phone) completedSteps.add(2)
  if (bloodType || cprNumber) completedSteps.add(3)
  if (contactName && contactPhone) completedSteps.add(4)

  const canProceed = () => {
    switch (step) {
      case 0: return true // welcome
      case 1: return dateOfBirth && gender
      case 2: return phone
      case 3: return true // medical is optional
      case 4: return contactName && contactPhone
      case 5: return true // complete
      default: return true
    }
  }

  const handleNext = async () => {
    if (step === 5) {
      // Final step — mark onboarding complete
      setSaving(true)
      try {
        await patientApi.completeOnboarding()
        await refreshUser()
        toast.success('Welcome to DepScreen. You are ready for your first screening.')
        navigate('/screening')
      } catch (err: unknown) {
        const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(errorDetail || 'Could not complete onboarding. You can try again later.')
      } finally {
        setSaving(false)
      }
      return
    }

    // Save current step data
    if (step >= 1 && step <= 3) {
      setSaving(true)
      try {
        const data: Record<string, string | boolean | undefined> = {}
        if (dateOfBirth) data.date_of_birth = dateOfBirth
        if (gender) data.gender = gender
        if (nationality) data.nationality = nationality
        if (cprNumber) data.cpr_number = cprNumber
        if (phone) data.phone = phone
        if (bloodType) data.blood_type = bloodType
        await patientApi.updateProfile(data as ProfileUpdate)
      } catch (err: unknown) {
        const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(errorDetail || 'Could not save. You can continue and try again later.')
      } finally {
        setSaving(false)
      }
    }

    if (step === 4 && contactName && contactPhone) {
      setSaving(true)
      try {
        await patientApi.addEmergencyContact({
          contact_name: contactName,
          phone: contactPhone,
          relation: contactRelation,
          is_primary: true,
        })
      } catch (err: unknown) {
        const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(errorDetail || 'Could not save contact. You can add it later from your profile.')
      } finally {
        setSaving(false)
      }
    }

    setStep(s => s + 1)
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-screen bg-background geo-pattern flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-10">
          <ProgressDots
            total={STEPS.length}
            current={step}
            completed={Array.from(completedSteps)}
          />
          <p className="text-xs text-muted-foreground text-center mt-3 font-body">
            Step {step + 1} of {STEPS.length} — {currentStep.description}
          </p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Welcome */}
            {step === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-display text-3xl text-foreground mb-4 font-light" style={{ letterSpacing: '0.02em' }}>
                  Welcome to DepScreen
                </h1>
                <p className="text-muted-foreground font-body leading-relaxed max-w-sm mx-auto mb-2">
                  Before your first screening, we would like to know a little about you.
                  This helps us provide more personalized support.
                </p>
                <p className="text-sm text-muted-foreground/70 font-body">
                  Take your time. You can pause and return whenever you need.
                </p>
              </div>
            )}

            {/* Demographics */}
            {step === 1 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">About You</h2>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Date of Birth</label>
                  <input type="date" className="input py-3" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                    ].map(g => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`py-2.5 rounded-lg border text-sm font-body transition-all duration-200 ${
                          gender === g.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">
                    Nationality <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input type="text" className="input py-3" placeholder="e.g. Bahraini" value={nationality} onChange={e => setNationality(e.target.value)} />
                </div>
              </div>
            )}

            {/* Contact */}
            {step === 2 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">Contact Information</h2>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Phone Number</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-3 bg-muted border border-border border-r-0 rounded-l-md text-sm text-muted-foreground font-body">
                      +973
                    </span>
                    <input
                      type="tel"
                      className="input py-3 rounded-l-none"
                      placeholder="3XXX XXXX"
                      maxLength={8}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">
                    CPR Number <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input py-3 font-mono tracking-wider"
                    placeholder="YYMMNNNNC"
                    maxLength={9}
                    value={cprNumber}
                    onChange={e => setCprNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground mt-1 font-body">Your 9-digit Civil Personal Record number.</p>
                </div>
              </div>
            )}

            {/* Medical */}
            {step === 3 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">Medical Background</h2>
                <p className="text-sm text-muted-foreground font-body">
                  This is optional but helps your clinician provide better care. You can always add more details later from your profile.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Blood Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBloodType(bt)}
                        className={`py-2 rounded-lg border text-sm font-body transition-all duration-200 ${
                          bloodType === bt
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  You can add medications, allergies, and diagnoses from your profile after onboarding.
                </p>
              </div>
            )}

            {/* Emergency Contact */}
            {step === 4 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">Emergency Contact</h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Someone we can reach if you are in crisis. This information is kept confidential and only used in emergencies.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Contact Name</label>
                  <input type="text" className="input py-3" placeholder="Their full name" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Contact Phone</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-3 bg-muted border border-border border-r-0 rounded-l-md text-sm text-muted-foreground font-body">+973</span>
                    <input
                      type="tel"
                      className="input py-3 rounded-l-none"
                      placeholder="3XXX XXXX"
                      maxLength={8}
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Relationship</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['parent', 'spouse', 'sibling', 'friend', 'therapist', 'other'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setContactRelation(r)}
                        className={`py-2 rounded-lg border text-sm font-body capitalize transition-all duration-200 ${
                          contactRelation === r
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Complete */}
            {step === 5 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="font-display text-3xl text-foreground mb-4 font-light" style={{ letterSpacing: '0.02em' }}>
                  You are all set
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed max-w-sm mx-auto">
                  Thank you for sharing. Everything is saved and confidential.
                  You are ready for your first screening whenever you feel comfortable.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 && step < 5 ? (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="btn-primary text-sm"
          >
            {saving ? (
              <><BreathingDot /> Saving...</>
            ) : step === 5 ? (
              'Begin First Screening'
            ) : step === 0 ? (
              <>Let's begin <ChevronRight className="w-4 h-4" /></>
            ) : step === 3 ? (
              <>Skip or Continue <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Skip onboarding */}
        {step < 5 && (
          <p className="text-center mt-6">
            <button
              onClick={() => navigate('/screening')}
              className="text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
            >
              Skip for now — you can complete this later from your profile
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
