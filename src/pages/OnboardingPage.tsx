/**
 * OnboardingPage — Multi-step welcome wizard for new patients.
 *
 * Steps: Welcome → Demographics → Contact → Medical → Emergency Contacts → Complete
 *
 * Each step saves immediately to the backend. Patient can quit and resume.
 * Tone: warm, unhurried, non-judgmental. "Take your time."
 */

import { useState, useEffect, useRef } from 'react'
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
  { id: 'emergency', title: 'Emergency Contact', description: 'Someone who knows you, just in case' },
  { id: 'social', title: 'Social Media', description: 'Optional — public posts help screening' },
  { id: 'documents', title: 'Documents', description: 'Upload existing records (optional)' },
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
  const [redditUsername, setRedditUsername] = useState('')
  const [twitterUsername, setTwitterUsername] = useState('')
  const [uploadedDocs, setUploadedDocs] = useState<{ title: string; doc_type: string }[]>([])
  const [docUploading, setDocUploading] = useState(false)

  // Pre-fill from existing user data (resume partially completed onboarding)
  // Pre-fill form state from existing user data so returning users see what
  // they've already saved. We populate every field so the form reflects the
  // real state — no silent skip-ahead without visible filled data.
  useEffect(() => {
    if (!user) return
    if (user.date_of_birth) setDateOfBirth(user.date_of_birth)
    if (user.gender) setGender(user.gender)
    if (user.nationality) setNationality(user.nationality)
    if (user.cpr_number) setCprNumber(user.cpr_number)
    if (user.phone) setPhone(user.phone.replace(/^\+973/, ''))
    if (user.blood_type) setBloodType(user.blood_type)
    if (user.reddit_username) setRedditUsername(user.reddit_username)
    if (user.twitter_username) setTwitterUsername(user.twitter_username)
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
      case 1: return dateOfBirth && gender && nationality
      case 2: return phone && cprNumber && cprNumber.length === 9
      case 3: return true // medical is optional
      case 4: return contactName && contactPhone
      case 5: return true // social is optional
      case 6: return true // documents is optional
      case 7: return true // complete
      default: return true
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setDocUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10 MB. Please upload a smaller file.`)
          continue
        }

        const nameL = file.name.toLowerCase()
        let docType = 'journal_entry'
        if (nameL.includes('phq')) docType = 'phq9'
        else if (nameL.includes('gad')) docType = 'gad7'
        else if (nameL.includes('med')) docType = 'medication_list'
        else if (nameL.includes('diag')) docType = 'previous_diagnosis'

        const title = file.name.replace(/\.[^/.]+$/, '')
        const isPdf = nameL.endsWith('.pdf') || file.type === 'application/pdf'
        const isText = nameL.endsWith('.txt') || file.type.startsWith('text/')

        try {
          if (isPdf || isText) {
            // Server parses PDFs via pdfplumber (with OCR fallback for scans)
            // and decodes .txt as UTF-8. Multipart upload handles both.
            await patientApi.uploadDocumentFile(file, title, docType)
          } else {
            // Legacy path for other text-like content: try to read client-side
            const content = await file.text()
            if (content.length < 10) {
              toast.error(`${file.name} appears empty.`)
              continue
            }
            await patientApi.uploadDocument(title, docType, content.slice(0, 100000))
          }
          setUploadedDocs(prev => [...prev, { title: file.name, doc_type: docType }])
        } catch (err: unknown) {
          const detail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
          toast.error(detail || `Could not upload ${file.name}.`)
        }
      }
      toast.success('Documents saved. They will help personalize your chat.')
    } finally {
      setDocUploading(false)
      e.target.value = '' // reset input so same file can be re-selected
    }
  }

  const handleNext = async () => {
    if (step === 7) {
      // Final step — mark onboarding complete. Navigate unconditionally so the
      // user isn't stuck even if the non-critical completion POST fails (the
      // backend auto-completes onboarding when required profile fields are set).
      setSaving(true)
      try {
        await patientApi.completeOnboarding()
      } catch (err: unknown) {
        const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        // Show as warning, not error — they've already provided their info
        toast(errorDetail || 'Onboarding flag will sync shortly.', { icon: 'ℹ️' })
      } finally {
        try {
          await refreshUser()
        } catch {
          /* ignore refresh failures */
        }
        toast.success('Thank you for trusting us with this. Your first screening is ready whenever you feel comfortable.')
        setSaving(false)
        navigate('/screening')
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

    // Step 5 — Social media
    if (step === 5 && (redditUsername || twitterUsername)) {
      setSaving(true)
      try {
        await patientApi.updateProfile({
          reddit_username: redditUsername || undefined,
          twitter_username: twitterUsername || undefined,
        } as ProfileUpdate)
      } catch (err: unknown) {
        const errorDetail = err instanceof Object && 'detail' in err ? (err as { detail: string }).detail : null
        toast.error(errorDetail || 'Could not save social handles.')
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
                  <DobInput value={dateOfBirth} onChange={setDateOfBirth} />
                  <p className="text-xs text-muted-foreground mt-1.5 font-body">DD / MM / YYYY</p>
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
                  <label className="block text-sm font-medium mb-2 font-body">Nationality</label>
                  <select
                    className="input py-3"
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                  >
                    <option value="">Select your nationality</option>
                    {NATIONALITIES.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-medium mb-2 font-body">CPR Number</label>
                  <input
                    type="text"
                    className="input py-3 font-mono tracking-wider"
                    placeholder="YYMMNNNNC"
                    maxLength={9}
                    value={cprNumber}
                    onChange={e => setCprNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Your 9-digit Civil Personal Record number — required for clinical records.
                  </p>
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

            {/* Social Media */}
            {step === 5 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">Social Media (optional)</h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  With your permission, we can look at your public posts to understand how you've been
                  expressing yourself. Nothing private is touched, and you can turn this off any time —
                  or skip entirely if it's not for you.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Reddit username</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-3 bg-muted border border-border border-r-0 rounded-l-md text-sm text-muted-foreground font-body">u/</span>
                    <input
                      type="text"
                      className="input py-3 rounded-l-none"
                      placeholder="username"
                      value={redditUsername}
                      onChange={e => setRedditUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">X/Twitter username</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-3 bg-muted border border-border border-r-0 rounded-l-md text-sm text-muted-foreground font-body">@</span>
                    <input
                      type="text"
                      className="input py-3 rounded-l-none"
                      placeholder="handle"
                      value={twitterUsername}
                      onChange={e => setTwitterUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  You can add or remove these anytime from your profile. We never post on your behalf.
                </p>
              </div>
            )}

            {/* Documents */}
            {step === 6 && (
              <div className="card-warm p-6 space-y-5">
                <h2 className="font-display text-2xl text-foreground font-light">Existing Records (optional)</h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Upload prior PHQ-9 or GAD-7 results, medication lists, journal entries, or previous
                  diagnoses. Your assistant will reference these to give more personalized guidance.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2 font-body">Upload files (PDF, .txt, .md, .csv)</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.csv,application/pdf,text/plain"
                    onChange={handleFileUpload}
                    disabled={docUploading}
                    className="block w-full text-sm text-muted-foreground font-body
                      file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                      file:text-sm file:font-medium file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/15 file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2 font-body">
                    Text-based files only. Max 2MB each. PDF support coming soon — for now, paste PDF contents into a .txt file.
                  </p>
                </div>
                {uploadedDocs.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-body mb-2">
                      Uploaded ({uploadedDocs.length})
                    </p>
                    <ul className="space-y-1">
                      {uploadedDocs.map((d, i) => (
                        <li key={i} className="text-sm font-body text-foreground flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate">{d.title}</span>
                          <span className="text-xs text-muted-foreground">({d.doc_type})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {docUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <BreathingDot />
                    Uploading...
                  </div>
                )}
              </div>
            )}

            {/* Complete */}
            {step === 7 && (
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
          {step > 0 && step < 7 ? (
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
            ) : step === 7 ? (
              'Begin First Screening'
            ) : step === 0 ? (
              <>Let's begin <ChevronRight className="w-4 h-4" /></>
            ) : step === 3 || step === 5 || step === 6 ? (
              <>Skip or Continue <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Skip onboarding */}
        {step < 7 && (
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

// ── DD / MM / YYYY date input ────────────────────────────────────────────────
// Emits ISO "YYYY-MM-DD" via onChange when all three parts are valid.
interface DobInputProps {
  value: string // ISO YYYY-MM-DD or empty
  onChange: (iso: string) => void
}

function DobInput({ value, onChange }: DobInputProps) {
  // Parse incoming ISO into parts
  const [dd, mm, yyyy] = (() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ['', '', '']
    const [y, m, d] = value.split('-')
    return [d, m, y]
  })()

  const [day, setDay] = useState(dd)
  const [month, setMonth] = useState(mm)
  const [year, setYear] = useState(yyyy)

  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDay(dd); setMonth(mm); setYear(yyyy)
  }, [value, dd, mm, yyyy])

  const emit = (d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const dNum = parseInt(d, 10)
      const mNum = parseInt(m, 10)
      const yNum = parseInt(y, 10)
      if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12 && yNum >= 1900 && yNum <= new Date().getFullYear()) {
        onChange(`${y}-${m}-${d}`)
        return
      }
    }
    onChange('')
  }

  const handleDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    setDay(v)
    // Auto-advance: if user types 4-9 as first digit, it can only mean 04-09
    // (days 40-99 are invalid). Pad and advance.
    if (v.length === 1 && parseInt(v, 10) >= 4) {
      const padded = '0' + v
      setDay(padded)
      monthRef.current?.focus()
      emit(padded, month, year)
      return
    }
    if (v.length === 2) monthRef.current?.focus()
    emit(v, month, year)
  }
  const handleMonth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    setMonth(v)
    // Auto-advance: if user types 2-9 as first digit, it can only mean 02-09
    // (months 20-99 are invalid). Pad and advance.
    if (v.length === 1 && parseInt(v, 10) >= 2) {
      const padded = '0' + v
      setMonth(padded)
      yearRef.current?.focus()
      emit(day, padded, year)
      return
    }
    if (v.length === 2) yearRef.current?.focus()
    emit(day, v, year)
  }
  const handleYear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
    setYear(v)
    emit(day, month, v)
  }

  // Auto-pad single-digit day/month on blur for ambiguous entries (1, 2, 3 for day; 1 for month).
  const handleDayBlur = () => {
    if (day.length === 1) {
      const padded = '0' + day
      setDay(padded)
      emit(padded, month, year)
    }
  }
  const handleMonthBlur = () => {
    if (month.length === 1) {
      const padded = '0' + month
      setMonth(padded)
      emit(day, padded, year)
    }
  }

  const handleBackspace = (e: React.KeyboardEvent<HTMLInputElement>, current: 'day' | 'month' | 'year') => {
    if (e.key === 'Backspace' && (e.currentTarget.value === '')) {
      if (current === 'month') dayRef.current?.focus()
      else if (current === 'year') monthRef.current?.focus()
    }
  }

  return (
    <div className="flex items-center gap-2 font-body">
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        className="input py-3 text-center tracking-wider w-16"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={handleDay}
        onBlur={handleDayBlur}
        aria-label="Day"
      />
      <span className="text-muted-foreground">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        className="input py-3 text-center tracking-wider w-16"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={handleMonth}
        onBlur={handleMonthBlur}
        onKeyDown={e => handleBackspace(e, 'month')}
        aria-label="Month"
      />
      <span className="text-muted-foreground">/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        className="input py-3 text-center tracking-wider w-24"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={handleYear}
        onKeyDown={e => handleBackspace(e, 'year')}
        aria-label="Year"
      />
    </div>
  )
}

// ── Nationality list — alphabetized, Bahrain first as default local context ──
const NATIONALITIES = [
  'Bahraini', 'Emirati', 'Saudi', 'Kuwaiti', 'Qatari', 'Omani', 'Yemeni',
  'Egyptian', 'Jordanian', 'Lebanese', 'Palestinian', 'Syrian', 'Iraqi', 'Moroccan', 'Tunisian', 'Algerian', 'Sudanese', 'Libyan',
  'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Filipino', 'Indonesian', 'Nepali',
  'British', 'American', 'Canadian', 'Australian', 'Irish',
  'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Greek', 'Russian', 'Ukrainian',
  'Turkish', 'Iranian',
  'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Malaysian', 'Singaporean',
  'South African', 'Nigerian', 'Kenyan', 'Ethiopian', 'Ghanaian',
  'Brazilian', 'Argentinian', 'Mexican', 'Colombian', 'Chilean',
  'Other',
]
