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
} from '../types/api'

const API_BASE = '/api'

// ── Token Management ─────────────────────────────────────────────────────────

let accessToken: string | null = null
let refreshToken: string | null = null

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('refresh_token')
}

export function getAccessToken(): string | null {
  return accessToken
}

export function loadStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
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

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  return handleResponse<T>(response)
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

async function patch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const response = await fetch(`${API_BASE}${path}${query}`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  return handleResponse<T>(response)
}

async function del<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse<T>(response)
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export const auth = {
  async register(data: RegisterRequest): Promise<TokenResponse> {
    const result = await post<TokenResponse>('/auth/register', data)
    setTokens(result.access_token, result.refresh_token)
    return result
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const result = await post<TokenResponse>('/auth/login', data)
    setTokens(result.access_token, result.refresh_token)
    return result
  },

  async refresh(): Promise<TokenResponse> {
    const stored = refreshToken || loadStoredRefreshToken()
    if (!stored) throw new APIError('No refresh token', 401)
    const result = await post<TokenResponse>('/auth/refresh', { refresh_token: stored })
    setTokens(result.access_token, result.refresh_token)
    return result
  },

  async getProfile(): Promise<UserProfile> {
    return get<UserProfile>('/auth/me')
  },

  async linkToClinician(code: string): Promise<{ status: string; clinician_name: string }> {
    return post(`/auth/link?clinician_code=${encodeURIComponent(code)}`)
  },

  logout() {
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
    return put(`/dashboard/screenings/${screeningId}/notes?notes=${encodeURIComponent(notes)}`)
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

  async updateAppointmentStatus(id: string, status: string): Promise<void> {
    return patch(`/dashboard/appointments/${id}`, { status })
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

  async getCarePlanTemplates(): Promise<any[]> {
    return get<any[]>('/dashboard/care-plans/templates')
  },

  // Diagnoses
  async addPatientDiagnosis(patientId: string, data: DiagnosisCreate): Promise<DiagnosisResponse> {
    return post<DiagnosisResponse>(`/dashboard/patients/${patientId}/diagnoses`, data)
  },

  async updateDiagnosis(id: string, data: { status: string }): Promise<void> {
    return put(`/dashboard/diagnoses/${id}`, data)
  },

  // Notifications
  async notifyPatient(patientId: string, data: { title: string; message: string; notification_type: string; link?: string }): Promise<void> {
    return post(`/dashboard/patients/${patientId}/notifications`, data)
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

  async unlinkClinician(): Promise<{ status: string }> {
    return post('/patient/unlink-clinician')
  },

  async deactivateAccount(): Promise<{ status: string }> {
    return del('/patient/account')
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
    return post('/patient/notifications/read-all')
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
    return get<OnboardingProgress>('/patient/onboarding')
  },

  async completeOnboarding(): Promise<{ status: string }> {
    return post('/patient/onboarding/complete')
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
      body: formData,
    })
    return handleResponse(response)
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
