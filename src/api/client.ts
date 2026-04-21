/**
 * DepScreen API Client
 *
 * Handles all HTTP communication with the backend.
 * Automatically attaches JWT tokens and handles token refresh.
 */

import type {
  TokenResponse, LoginRequest, RegisterRequest, UserProfile,
  ScreeningResponse, ScreeningHistoryResponse,
  ChatMessage, ChatHistoryResponse,
  DashboardStats, PatientSummary,
  CheckInPrompt, RedditScreeningResult,
  PatientDocument, EmergencyContact, SymptomTrend,
  MedicationCreate, MedicationResponse,
  AllergyCreate, AllergyResponse,
  DiagnosisCreate, DiagnosisResponse,
  ScreeningScheduleCreate, ScreeningScheduleResponse,
  AppointmentCreate, AppointmentResponse,
  ConversationCreate, ConversationResponse,
  NotificationResponse,
  CarePlanCreate, CarePlanResponse,
  ProfileUpdate, OnboardingProgress,
  DirectMessageResponse, DirectMessageThread,
} from '../types/api'

const API_BASE = '/api'

// ── Token Management ─────────────────────────────────────────────────────────

let accessToken: string | null = null

export function setAccessToken(access: string) {
  accessToken = access
}

export function clearTokens() {
  accessToken = null
}

export function getAccessToken(): string | null {
  return accessToken
}

// ── HTTP Helpers ─────────────────────────────────────────────────────────────

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new APIError(
      error.detail || `Request failed (${response.status})`,
      response.status,
      error.detail
    )
  }
  return response.json()
}

// ── Retry wrapper for transient server errors ───────────────────────────────

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(input, init)

    // Success or client error — return immediately
    if (response.ok || response.status < 500) return response

    // For non-GET, only retry gateway errors (502/503/504)
    if (method !== 'GET' && ![502, 503, 504].includes(response.status)) {
      return response
    }

    // Last attempt — return the error response
    if (attempt === maxRetries) return response

    // Exponential backoff before retry
    await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
  }

  // Unreachable, but satisfies TypeScript
  throw new Error('fetchWithRetry: unreachable')
}

// ── HTTP Helpers (use fetchWithRetry for automatic backoff on 5xx) ───────────

async function get<T>(path: string): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE}${path}`, { headers: authHeaders() })
  return handleResponse<T>(response)
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

async function patch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const response = await fetchWithRetry(`${API_BASE}${path}${query}`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  return handleResponse<T>(response)
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

async function del<T>(path: string): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse<T>(response)
}

/** Fetch an authenticated endpoint and trigger a browser file download. */
export async function downloadAsFile(path: string, fallbackFilename: string): Promise<void> {
  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  const response = await fetch(`${API_BASE}${path}`, { headers })
  if (!response.ok) {
    let detail = `Download failed (${response.status})`
    try {
      const j = await response.json()
      if (j?.detail) detail = j.detail
    } catch {
      // ignore
    }
    throw new APIError(detail, response.status, detail)
  }
  // Prefer server-provided filename from Content-Disposition when available
  let filename = fallbackFilename
  const cd = response.headers.get('Content-Disposition')
  if (cd) {
    const match = cd.match(/filename="?([^";]+)"?/i)
    if (match?.[1]) filename = match[1]
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export const auth = {
  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const result = await handleResponse<TokenResponse>(response)
    setAccessToken(result.access_token)
    return result
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const result = await handleResponse<TokenResponse>(response)
    setAccessToken(result.access_token)
    return result
  },

  async refresh(): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    const result = await handleResponse<TokenResponse>(response)
    setAccessToken(result.access_token)
    return result
  },

  async getProfile(): Promise<UserProfile> {
    return get<UserProfile>('/auth/me')
  },

  async linkToClinician(code: string): Promise<{ status: string; clinician_name: string }> {
    return post('/auth/link', { clinician_code: code })
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
      })
    } catch { /* best-effort */ }
    clearTokens()
  },
}

// ── Screening API ────────────────────────────────────────────────────────────

export const screening = {
  async submit(text: string): Promise<ScreeningResponse> {
    return post<ScreeningResponse>('/analyze', { text })
  },

  async getById(id: string): Promise<ScreeningResponse> {
    return get<ScreeningResponse>(`/history/${id}`)
  },

  async getHistory(page = 1, pageSize = 20): Promise<ScreeningHistoryResponse> {
    return get<ScreeningHistoryResponse>(`/history?page=${page}&page_size=${pageSize}`)
  },

  async deleteScreening(id: string): Promise<void> {
    await del(`/history/${id}`)
  },

  /** Download a single screening report as a PDF. */
  async downloadPdf(id: string): Promise<void> {
    return downloadAsFile(`/history/${id}/pdf`, `screening-${id.slice(0, 8)}.pdf`)
  },
}

// ── Ingestion API ────────────────────────────────────────────────────────────

export const ingest = {
  async getCheckInPrompts(): Promise<{ prompts: CheckInPrompt[] }> {
    return get('/ingest/checkin/prompts')
  },

  async submitCheckIn(responses: Record<string, string>): Promise<ScreeningResponse> {
    return post<ScreeningResponse>('/ingest/checkin', { responses })
  },

  async analyzeReddit(username: string, mentalHealthOnly = true, maxPosts = 50): Promise<RedditScreeningResult> {
    return post<RedditScreeningResult>('/ingest/reddit', {
      username, mental_health_only: mentalHealthOnly, max_posts: maxPosts,
    })
  },

  async analyzeX(username: string, mentalHealthFilter = true, maxPosts = 50): Promise<RedditScreeningResult> {
    return post<RedditScreeningResult>('/ingest/x', {
      username, mental_health_filter: mentalHealthFilter, max_posts: maxPosts,
    })
  },

  async uploadBulk(content: string, format = 'auto'): Promise<unknown> {
    return post('/ingest/bulk', { content, format })
  },
}

// ── Chat API ─────────────────────────────────────────────────────────────────

export const chat = {
  // Screening-linked chat
  async sendMessage(screeningId: string, message: string): Promise<ChatMessage> {
    return post<ChatMessage>(`/chat/screening/${screeningId}`, { message })
  },

  async getHistory(screeningId: string): Promise<ChatHistoryResponse> {
    return get<ChatHistoryResponse>(`/chat/screening/${screeningId}`)
  },

  async sendScreeningMessage(screeningId: string, message: string): Promise<ChatMessage> {
    return post<ChatMessage>(`/chat/screening/${screeningId}`, { message })
  },

  async getScreeningChatHistory(screeningId: string): Promise<ChatHistoryResponse> {
    return get<ChatHistoryResponse>(`/chat/screening/${screeningId}`)
  },

  // Standalone conversations
  async getConversations(): Promise<ConversationResponse[]> {
    return get<ConversationResponse[]>('/chat/conversations')
  },

  async createConversation(data?: ConversationCreate): Promise<ConversationResponse> {
    return post<ConversationResponse>('/chat/conversations', data)
  },

  async sendConversationMessage(conversationId: string, message: string): Promise<ChatMessage> {
    return post<ChatMessage>(`/chat/conversations/${conversationId}/message`, { message })
  },

  async getConversationMessages(conversationId: string): Promise<ChatHistoryResponse> {
    return get<ChatHistoryResponse>(`/chat/conversations/${conversationId}/messages`)
  },

  async archiveConversation(conversationId: string): Promise<void> {
    return del(`/chat/conversations/${conversationId}`)
  },

  async renameConversation(conversationId: string, title: string): Promise<{ status: string; title: string }> {
    return patchJson(`/chat/conversations/${conversationId}`, { title })
  },

  async autoTitleConversation(conversationId: string): Promise<{ status: string; title: string }> {
    return post(`/chat/conversations/${conversationId}/auto-title`, {})
  },

  // Streaming — yields chunks via callback as they arrive from the LLM
  async streamScreeningMessage(
    screeningId: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    return streamSSE(`/api/chat/screening/${screeningId}/stream`, { message }, onChunk)
  },

  async streamConversationMessage(
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    return streamSSE(`/api/chat/conversations/${conversationId}/message/stream`, { message }, onChunk)
  },
}

// ── SSE Streaming Helper ─────────────────────────────────────────────────────

async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new APIError(`Stream failed: ${response.status}`, response.status, text)
  }

  if (!response.body) {
    throw new APIError('Stream has no body', 0)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    const value = result.value
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE: messages are separated by "\n\n" and start with "data: "
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || '' // keep incomplete message for next iteration

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      if (data === '[HEARTBEAT]') continue
      // Unescape newlines that were escaped server-side
      const unescaped = data.replace(/\\n/g, '\n')
      onChunk(unescaped)
    }
  }
}

// ── Dashboard API (Clinician) ────────────────────────────────────────────────

export const dashboard = {
  async getStats(): Promise<DashboardStats> {
    return get<DashboardStats>('/dashboard/stats')
  },

  async getPatients(): Promise<PatientSummary[]> {
    return get<PatientSummary[]>('/dashboard/patients')
  },

  async getPatientScreenings(patientId: string, page = 1, pageSize = 20): Promise<ScreeningHistoryResponse> {
    return get<ScreeningHistoryResponse>(`/dashboard/patients/${patientId}/screenings?page=${page}&page_size=${pageSize}`)
  },

  async getPatientFullProfile(patientId: string): Promise<import('../types/api').PatientFullProfile> {
    return get<import('../types/api').PatientFullProfile>(`/dashboard/patients/${patientId}/full-profile`)
  },

  async getPatientTrends(patientId: string, days = 90): Promise<SymptomTrend> {
    return get<SymptomTrend>(`/dashboard/patients/${patientId}/trends?days=${days}`)
  },

  async getAllScreenings(page = 1, pageSize = 20, severity?: string, flaggedOnly = false): Promise<ScreeningHistoryResponse> {
    let path = `/dashboard/screenings?page=${page}&page_size=${pageSize}`
    if (severity) path += `&severity=${severity}`
    if (flaggedOnly) path += '&flagged_only=true'
    return get<ScreeningHistoryResponse>(path)
  },

  async getScreeningDetail(screeningId: string): Promise<unknown> {
    return get(`/dashboard/screenings/${screeningId}`)
  },

  async updateNotes(screeningId: string, notes: string): Promise<{ status: string }> {
    return put(`/dashboard/screenings/${screeningId}/notes`, { notes })
  },

  async updateTriage(screeningId: string, status: string): Promise<{ status: string }> {
    return patch(`/dashboard/screenings/${screeningId}/triage`, { status })
  },

  async uploadPatientDocument(patientId: string, title: string, docType: string, content: string): Promise<unknown> {
    const params = new URLSearchParams({ title, doc_type: docType, content })
    return post(`/dashboard/patients/${patientId}/documents?${params}`)
  },

  async getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
    return get<PatientDocument[]>(`/dashboard/patients/${patientId}/documents`)
  },

  // Appointments
  async getAppointments(status?: string): Promise<AppointmentResponse[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return get<AppointmentResponse[]>(`/dashboard/appointments${query}`)
  },

  async createAppointment(data: AppointmentCreate): Promise<AppointmentResponse> {
    return post<AppointmentResponse>('/dashboard/appointments', data)
  },

  async updateAppointmentStatus(id: string, status: string): Promise<AppointmentResponse> {
    return patchJson<AppointmentResponse>(`/dashboard/appointments/${id}/status`, { status })
  },

  async deleteAppointment(id: string): Promise<void> {
    return del(`/dashboard/appointments/${id}`)
  },

  // Care Plans
  async getPatientCarePlans(patientId: string): Promise<CarePlanResponse[]> {
    return get<CarePlanResponse[]>(`/dashboard/patients/${patientId}/care-plans`)
  },

  async createCarePlan(data: CarePlanCreate): Promise<CarePlanResponse> {
    return post<CarePlanResponse>('/dashboard/care-plans', data)
  },

  async updateCarePlan(id: string, data: Partial<CarePlanCreate>): Promise<CarePlanResponse> {
    return put<CarePlanResponse>(`/dashboard/care-plans/${id}`, data)
  },

  async getCarePlanTemplates(): Promise<Record<string, unknown>[]> {
    return get<Record<string, unknown>[]>('/dashboard/care-plan-templates')
  },

  // Diagnoses
  async getPatientDiagnoses(patientId: string): Promise<DiagnosisResponse[]> {
    return get<DiagnosisResponse[]>(`/dashboard/patients/${patientId}/diagnoses`)
  },

  async addPatientDiagnosis(patientId: string, data: DiagnosisCreate): Promise<DiagnosisResponse> {
    return post<DiagnosisResponse>(`/dashboard/patients/${patientId}/diagnoses`, data)
  },

  async updateDiagnosis(id: string, data: { status: string }): Promise<void> {
    return put(`/dashboard/diagnoses/${id}`, data)
  },

  async deletePatientDiagnosis(id: string): Promise<void> {
    return del(`/dashboard/diagnoses/${id}`)
  },

  // Medications (clinician-side)
  async getPatientMedications(patientId: string): Promise<MedicationResponse[]> {
    return get<MedicationResponse[]>(`/dashboard/patients/${patientId}/medications`)
  },

  async addPatientMedication(patientId: string, data: MedicationCreate): Promise<MedicationResponse> {
    return post<MedicationResponse>(`/dashboard/patients/${patientId}/medications`, data)
  },

  async updatePatientMedication(medicationId: string, data: MedicationCreate): Promise<MedicationResponse> {
    return put<MedicationResponse>(`/dashboard/medications/${medicationId}`, data)
  },

  async deactivatePatientMedication(medicationId: string): Promise<void> {
    return del(`/dashboard/medications/${medicationId}`)
  },

  // Screening schedule (clinician-side)
  async getPatientScreeningSchedule(patientId: string): Promise<ScreeningScheduleResponse | null> {
    return get<ScreeningScheduleResponse | null>(`/dashboard/patients/${patientId}/screening-schedule`)
  },

  async assignPatientScreeningSchedule(patientId: string, data: ScreeningScheduleCreate): Promise<ScreeningScheduleResponse> {
    return post<ScreeningScheduleResponse>(`/dashboard/patients/${patientId}/screening-schedule`, data)
  },

  async deactivatePatientScreeningSchedule(patientId: string): Promise<void> {
    return del(`/dashboard/patients/${patientId}/screening-schedule`)
  },

  // Direct messaging (clinician side)
  async getPatientMessages(patientId: string): Promise<DirectMessageThread> {
    return get<DirectMessageThread>(`/dashboard/patients/${patientId}/messages`)
  },

  async sendPatientMessage(patientId: string, content: string): Promise<DirectMessageResponse> {
    return post<DirectMessageResponse>(`/dashboard/patients/${patientId}/messages`, { content })
  },

  // Notifications
  async notifyPatient(patientId: string, data: { title: string; message: string; notification_type: string; link?: string }): Promise<void> {
    return post(`/dashboard/patients/${patientId}/notify`, data)
  },

  /** Clinician-side PDF clinical summary download. */
  async downloadPatientSummaryPdf(patientId: string): Promise<void> {
    return downloadAsFile(`/dashboard/patients/${patientId}/summary.pdf`, 'patient-summary.pdf')
  },
}

// ── Patient Self-Service API ─────────────────────────────────────────────────

export const patient = {
  async updateProfile(data: ProfileUpdate): Promise<{ status: string }> {
    return put('/patient/profile', data)
  },

  async uploadDocument(title: string, docType: string, content: string): Promise<{ status: string; document_id: string }> {
    return post('/patient/documents', { title, doc_type: docType, content })
  },

  /** Upload a PDF or .txt file directly — server parses PDF via pdfplumber
   * (+ OCR fallback for scans) before ingesting into the RAG corpus. */
  async uploadDocumentFile(
    file: File,
    title: string,
    docType: string,
  ): Promise<{ status: string; document_id: string; extracted_chars: number; source: string }> {
    const form = new FormData()
    form.append('file', file)
    const params = new URLSearchParams({ title, doc_type: docType })
    const headers: Record<string, string> = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    const response = await fetch(`${API_BASE}/patient/documents/upload?${params}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    })
    return handleResponse(response)
  },

  async getDocuments(): Promise<PatientDocument[]> {
    return get<PatientDocument[]>('/patient/documents')
  },

  async getTrends(days = 90): Promise<SymptomTrend> {
    return get<SymptomTrend>(`/patient/trends?days=${days}`)
  },

  async addEmergencyContact(data: { contact_name: string; phone: string; relation: string; is_primary?: boolean }): Promise<{ status: string; contact_id: string }> {
    return post('/patient/emergency-contacts', data)
  },

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    return get<EmergencyContact[]>('/patient/emergency-contacts')
  },

  async removeEmergencyContact(contactId: string): Promise<void> {
    await del(`/patient/emergency-contacts/${contactId}`)
  },

  async exportData(): Promise<unknown> {
    return get('/patient/export')
  },

  /** Download the patient's full record as a printable PDF. */
  async downloadExportPdf(): Promise<void> {
    return downloadAsFile('/patient/export/pdf', 'depscreen-my-record.pdf')
  },

  async unlinkClinician(): Promise<{ status: string }> {
    return post('/patient/unlink-clinician')
  },

  async deactivateAccount(): Promise<{ status: string }> {
    return del('/patient/account')
  },

  // Patient-facing appointments & care plan
  async getMyAppointments(status?: string): Promise<AppointmentResponse[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return get<AppointmentResponse[]>(`/patient/appointments${query}`)
  },

  async getMyCarePlan(): Promise<CarePlanResponse | null> {
    return get<CarePlanResponse | null>('/patient/care-plan')
  },

  // Notifications
  async getNotifications(all?: boolean): Promise<NotificationResponse[]> {
    const query = all ? '?all=true' : ''
    return get<NotificationResponse[]>(`/patient/notifications${query}`)
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return get<{ unread_count: number }>('/patient/notifications/unread-count')
  },

  async markNotificationRead(id: string): Promise<void> {
    return patch(`/patient/notifications/${id}/read`)
  },

  async markAllNotificationsRead(): Promise<void> {
    return patch('/patient/notifications/read-all')
  },

  // Clinician direct messages
  async getClinicianMessages(): Promise<DirectMessageThread | null> {
    return get<DirectMessageThread | null>('/patient/clinician-messages')
  },

  async sendMessageToClinician(content: string): Promise<DirectMessageResponse> {
    return post<DirectMessageResponse>('/patient/clinician-messages', { content })
  },

  // Medications
  async getMedications(all?: boolean): Promise<MedicationResponse[]> {
    const query = all ? '?all=true' : ''
    return get<MedicationResponse[]>(`/patient/medications${query}`)
  },

  async addMedication(data: MedicationCreate): Promise<MedicationResponse> {
    return post<MedicationResponse>('/patient/medications', data)
  },

  async updateMedication(id: string, data: Partial<MedicationCreate>): Promise<MedicationResponse> {
    return put<MedicationResponse>(`/patient/medications/${id}`, data)
  },

  async deleteMedication(id: string): Promise<void> {
    return del(`/patient/medications/${id}`)
  },

  // Allergies
  async getAllergies(): Promise<AllergyResponse[]> {
    return get<AllergyResponse[]>('/patient/allergies')
  },

  async addAllergy(data: AllergyCreate): Promise<AllergyResponse> {
    return post<AllergyResponse>('/patient/allergies', data)
  },

  async updateAllergy(id: string, data: AllergyCreate): Promise<AllergyResponse> {
    return put<AllergyResponse>(`/patient/allergies/${id}`, data)
  },

  async deleteAllergy(id: string): Promise<void> {
    return del(`/patient/allergies/${id}`)
  },

  // Diagnoses
  async getDiagnoses(): Promise<DiagnosisResponse[]> {
    return get<DiagnosisResponse[]>('/patient/diagnoses')
  },

  // Screening Schedule
  async getScreeningSchedule(): Promise<ScreeningScheduleResponse | null> {
    return get<ScreeningScheduleResponse | null>('/patient/screening-schedule')
  },

  async createScreeningSchedule(data: ScreeningScheduleCreate): Promise<ScreeningScheduleResponse> {
    return post<ScreeningScheduleResponse>('/patient/screening-schedule', data)
  },

  async deleteScreeningSchedule(id: string): Promise<void> {
    return del(`/patient/screening-schedule/${id}`)
  },

  // Onboarding
  async getOnboardingStatus(): Promise<OnboardingProgress> {
    return get<OnboardingProgress>('/patient/onboarding-status')
  },

  async completeOnboarding(): Promise<{ status: string }> {
    return post('/patient/onboarding-complete')
  },

  // Profile Picture
  async uploadProfilePicture(file: File): Promise<{ status: string; url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const headers: Record<string, string> = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    const response = await fetch(`${API_BASE}/patient/profile/picture`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })
    return handleResponse(response)
  },

  async deleteProfilePicture(): Promise<{ status: string }> {
    return del('/patient/profile/picture')
  },
}

// ── Terminology (RxNorm, ICD-10) ──────────────────────────────────────────────

export interface TerminologySuggestion {
  value: string
  label: string
}

export const terminology = {
  async rxnorm(q: string, limit = 8): Promise<TerminologySuggestion[]> {
    if (q.trim().length < 2) return []
    const r = await get<{ suggestions: TerminologySuggestion[] }>(
      `/terminology/rxnorm?q=${encodeURIComponent(q)}&limit=${limit}`,
    )
    return r.suggestions
  },

  async icd10(q: string, limit = 8): Promise<TerminologySuggestion[]> {
    if (q.trim().length < 2) return []
    const r = await get<{ suggestions: TerminologySuggestion[] }>(
      `/terminology/icd10?q=${encodeURIComponent(q)}&limit=${limit}`,
    )
    return r.suggestions
  },
}

// ── Health ────────────────────────────────────────────────────────────────────

export const health = {
  async check(): Promise<{ status: string; symptom_model_loaded: boolean }> {
    const response = await fetch('/health')
    return handleResponse(response)
  },
}

export { APIError }
