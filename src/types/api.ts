// ── DepScreen API Types ──────────────────────────────────────────────────────
// Must match backend/app/schemas/analysis.py exactly

// ── Symptom Detection ────────────────────────────────────────────────────────

export interface SymptomDetection {
  symptom: string
  symptom_label: string
  status: number
  confidence: number
  sentence_text: string
  sentence_id: string | null
}

export interface PostSymptomSummary {
  symptoms_detected: SymptomDetection[]
  unique_symptom_count: number
  total_sentences_analyzed: number
  severity_level: 'none' | 'mild' | 'moderate' | 'severe'
  severity_explanation: string
  dsm5_criteria_met: string[]
}

// ── Verification ─────────────────────────────────────────────────────────────

export interface EvidenceValidation {
  evidence_supports_prediction: boolean
  coherence_score: number
  alternative_interpretation: string | null
  flagged_for_review: boolean
}

export interface ConfidenceAnalysis {
  should_trust_prediction: 'high' | 'medium' | 'low'
  reasoning: string
  potential_confounders: string[]
  recommended_threshold_adjustment: number | null
}

export interface AdversarialCheck {
  likely_adversarial: boolean
  adversarial_type: string | null
  authenticity_score: number
  warning: string | null
}

export interface VerificationReport {
  evidence_validation: EvidenceValidation
  confidence_analysis: ConfidenceAnalysis
  adversarial_check: AdversarialCheck
}

// ── Explanation ──────────────────────────────────────────────────────────────

export interface ExplanationReport {
  summary: string
  risk_level: 'none' | 'mild' | 'moderate' | 'severe'
  symptom_explanations: Record<string, string>
  why_model_thinks_this: string
  key_evidence_quotes: string[]
  uncertainty_notes: string
  safety_disclaimer: string
  resources: string[]
}

// ── Evidence ─────────────────────────────────────────────────────────────────

export interface Evidence {
  sentence_evidence: SymptomDetection[]
  top_evidence_sentences: string[]
}

// ── Screening ────────────────────────────────────────────────────────────────

export interface ScreeningResponse {
  id: string
  created_at: string
  text: string
  symptom_analysis: PostSymptomSummary
  evidence: Evidence
  verification: VerificationReport
  final_prediction: string
  final_confidence: number
  confidence_adjusted: boolean
  explanation_report: ExplanationReport
  flagged_for_review: boolean
  adversarial_warning: string | null
}

export interface ScreeningListItem {
  id: string
  created_at: string
  text_preview: string
  final_prediction: string
  final_confidence: number
  symptom_count: number
  severity_level: string
  flagged_for_review: boolean
}

export interface ScreeningHistoryResponse {
  items: ScreeningListItem[]
  total: number
  page: number
  page_size: number
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'patient' | 'clinician' | 'admin'
  clinician_code: string | null
  profile_picture_url: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  cpr_number: string | null
  phone: string | null
  blood_type: string | null
  timezone: string | null
  language_preference: string | null
  reddit_username: string | null
  twitter_username: string | null
  onboarding_completed: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserProfile
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role: 'patient' | 'clinician'
  clinician_code?: string
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatHistoryResponse {
  screening_id: string
  messages: ChatMessage[]
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_patients: number
  total_screenings: number
  flagged_count: number
  severity_distribution: Record<string, number>
  screenings_this_week: number
}

export interface PatientSummary {
  id: string
  full_name: string
  email: string
  last_screening_date: string | null
  last_severity: string | null
  last_symptom_count: number | null
  total_screenings: number
}

// ── Ingestion ────────────────────────────────────────────────────────────────

export interface CheckInPrompt {
  id: string
  dsm5_criterion: string
  question: string
  follow_up: string | null
}

export interface RedditScreeningResult {
  screening_id: string
  platform: string
  username: string
  posts_fetched: number
  posts_screened: number
  aggregate_severity: string
  aggregate_symptom_count: number
  flagged_for_review: boolean
  per_post_results: Array<{
    subreddit?: string
    title?: string
    text_preview?: string
    date?: string
    symptoms: SymptomDetection[]
    symptom_count: number
    severity: string
  }>
  subreddits_analyzed?: string[]
}

// ── Patient Self-Service ─────────────────────────────────────────────────────

export interface PatientDocument {
  id: string
  doc_type: string
  title: string
  created_at: string
  content_preview: string
}

export interface EmergencyContact {
  id: string
  contact_name: string
  phone: string
  relation: string
  is_primary: boolean
}

export interface SymptomTrend {
  days_analyzed: number
  total_screenings: number
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data'
  all_symptoms_observed: string[]
  timeline: Array<{
    screening_id: string
    date: string
    source: string
    severity_level: string
    symptom_count: number
    symptoms_detected: string[]
    flagged_for_review: boolean
  }>
}

// ── Medications ──────────────────────────────────────────────────────────────

export interface MedicationCreate {
  name: string
  dosage?: string
  frequency?: string
  start_date?: string
  end_date?: string
  prescribed_by?: string
  notes?: string
}

export interface MedicationResponse {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  start_date: string | null
  end_date: string | null
  prescribed_by: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

// ── Allergies ────────────────────────────────────────────────────────────────

export interface AllergyCreate {
  allergen: string
  allergy_type?: string
  severity?: string
  reaction?: string
  diagnosed_date?: string
  notes?: string
}

export interface AllergyResponse {
  id: string
  allergen: string
  allergy_type: string | null
  severity: string | null
  reaction: string | null
  diagnosed_date: string | null
  notes: string | null
  created_at: string
}

// ── Diagnoses ────────────────────────────────────────────────────────────────

export interface DiagnosisCreate {
  condition: string
  icd10_code?: string
  diagnosed_date?: string
  status?: string
  diagnosed_by?: string
  notes?: string
}

export interface DiagnosisResponse {
  id: string
  condition: string
  icd10_code: string | null
  diagnosed_date: string | null
  status: string
  diagnosed_by: string | null
  notes: string | null
  created_at: string
}

// ── Screening Schedule ───────────────────────────────────────────────────────

export interface ScreeningScheduleCreate {
  frequency: string
  custom_days?: number
  day_of_week?: number
  preferred_time?: string
}

export interface ScreeningScheduleResponse {
  id: string
  frequency: string
  custom_days: number | null
  day_of_week: number | null
  preferred_time: string | null
  next_due_at: string | null
  last_completed_at: string | null
  is_active: boolean
  assigned_by?: string | null
  assigned_by_name?: string | null
  created_at: string
}

// ── Appointments ─────────────────────────────────────────────────────────────

export interface AppointmentCreate {
  patient_id: string
  scheduled_at: string
  duration_minutes?: number
  appointment_type?: string
  notes?: string
  location?: string
}

export interface AppointmentResponse {
  id: string
  patient_id?: string
  patient_name?: string
  clinician_id: string
  clinician_name?: string
  scheduled_at: string
  duration_minutes: number
  appointment_type: string
  status: string
  notes: string | null
  location: string | null
  created_at?: string
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface NotificationResponse {
  id: string
  notification_type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

// ── Care Plans ───────────────────────────────────────────────────────────────

export interface PatientFullProfile {
  id: string
  email: string
  full_name: string
  demographics: {
    date_of_birth: string | null
    age: number | null
    gender: string | null
    nationality: string | null
    language_preference: string | null
    timezone: string | null
  }
  medical_identifiers: {
    cpr_number: string | null
    medical_record_number: string | null
    blood_type: string | null
  }
  contact: {
    phone: string | null
    reddit_username: string | null
    twitter_username: string | null
  }
  onboarding_completed: boolean
  profile_picture_url: string | null
  created_at: string | null
  last_login_at: string | null
  medications: Array<{
    id: string
    name: string
    dosage: string | null
    frequency: string | null
    start_date: string | null
    end_date: string | null
    is_active: boolean
    prescribed_by: string | null
    notes: string | null
  }>
  allergies: Array<{
    id: string
    allergen: string
    severity: string | null
    allergy_type: string | null
    reaction: string | null
    diagnosed_date: string | null
    notes: string | null
  }>
  diagnoses: Array<{
    id: string
    condition: string
    icd10_code: string | null
    status: string | null
    diagnosed_date: string | null
    diagnosed_by: string | null
    notes: string | null
  }>
  emergency_contacts: Array<{
    id: string
    contact_name: string
    phone: string
    relation: string | null
    is_primary: boolean
  }>
  screening_schedule: {
    id: string
    frequency: string
    day_of_week: number | null
    preferred_time: string | null
    next_due_at: string | null
    last_completed_at: string | null
  } | null
  stats: {
    total_screenings: number
    total_documents: number
    upcoming_appointments: number
    active_care_plans: number
    last_severity: string | null
    last_screening_date: string | null
  }
}

export interface CarePlanCreate {
  patient_id: string
  title: string
  description?: string
  template_name?: string
  goals?: Array<{ text: string; target_date?: string; status?: string }>
  interventions?: Array<{ name: string; frequency?: string; instructions?: string }>
  review_date?: string
}

export interface CarePlanResponse {
  id: string
  patient_id?: string
  patient_name?: string
  clinician_id: string
  clinician_name?: string
  title: string
  description: string | null
  template_name: string | null
  goals: Array<Record<string, unknown>>
  interventions: Array<Record<string, unknown>>
  review_date: string | null
  status: string
  created_at: string
  updated_at: string
}

// ── Conversations ────────────────────────────────────────────────────────────

export interface ConversationCreate {
  title?: string
  context_type?: string
  linked_screening_id?: string
  linked_clinician_id?: string
}

export interface ConversationResponse {
  id: string
  title: string
  context_type: string
  linked_screening_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  message_count: number
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileUpdate {
  full_name?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  cpr_number?: string
  blood_type?: string
  language_preference?: string
  timezone?: string
  email_notifications?: boolean
  reddit_username?: string
  twitter_username?: string
  onboarding_completed?: boolean
  new_password?: string
}

export interface OnboardingProgress {
  demographics_complete: boolean
  contact_complete: boolean
  medical_history_complete: boolean
  medications_complete: boolean
  allergies_complete: boolean
  emergency_contacts_complete: boolean
  consent_accepted: boolean
}

// ── Symptom Metadata ─────────────────────────────────────────────────────────

// Clinical Sanctuary light-theme symptom colors
export const SYMPTOM_COLORS: Record<string, string> = {
  DEPRESSED_MOOD:    'bg-blue-50 border-blue-200 text-blue-700',
  ANHEDONIA:         'bg-purple-50 border-purple-200 text-purple-700',
  APPETITE_CHANGE:   'bg-orange-50 border-orange-200 text-orange-700',
  SLEEP_ISSUES:      'bg-indigo-50 border-indigo-200 text-indigo-700',
  PSYCHOMOTOR:       'bg-pink-50 border-pink-200 text-pink-700',
  FATIGUE:           'bg-amber-50 border-amber-200 text-amber-700',
  WORTHLESSNESS:     'bg-red-50 border-red-200 text-red-700',
  COGNITIVE_ISSUES:  'bg-cyan-50 border-cyan-200 text-cyan-700',
  SUICIDAL_THOUGHTS: 'bg-rose-50 border-rose-200 text-rose-700',
  SPECIAL_CASE:      'bg-gray-50 border-gray-200 text-gray-700',
}

export const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  none:     { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  mild:     { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  severe:   { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

export const DSM5_CRITERIA = [
  'DEPRESSED_MOOD', 'ANHEDONIA', 'APPETITE_CHANGE', 'SLEEP_ISSUES',
  'PSYCHOMOTOR', 'FATIGUE', 'WORTHLESSNESS', 'COGNITIVE_ISSUES',
  'SUICIDAL_THOUGHTS',
] as const

// ── Direct messaging (patient ↔ clinician) ──────────────────────────────────

export interface DirectMessageCreate {
  content: string
}

export interface DirectMessageResponse {
  id: string
  role: string
  sender_name: string | null
  content: string
  created_at: string
}

export interface DirectMessageThread {
  conversation_id: string
  patient_id: string
  patient_name: string
  clinician_id: string | null
  clinician_name: string | null
  messages: DirectMessageResponse[]
  unread_count: number
}
