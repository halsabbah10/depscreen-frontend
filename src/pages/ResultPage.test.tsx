/**
 * ResultPage — page-level component tests.
 *
 * Scope: loading state, data rendering, disclaimer text, crisis banner.
 * No real API calls — all mocked.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScreeningResponse } from '../types/api'
import { ResultPage } from './ResultPage'

// ── Shared mock data ──────────────────────────────────────────────────────────

const MOCK_SCREENING: ScreeningResponse = {
  id: 'screening-abc-123',
  created_at: '2026-04-20T12:00:00Z',
  text: 'I have been feeling very sad and unable to enjoy things I used to love.',
  symptom_analysis: {
    symptoms_detected: [],
    unique_symptom_count: 5,
    total_sentences_analyzed: 3,
    severity_level: 'moderate',
    severity_explanation: 'Several patterns were detected.',
    dsm5_criteria_met: ['DEPRESSED_MOOD', 'ANHEDONIA', 'FATIGUE', 'SLEEP_ISSUES', 'COGNITIVE_ISSUES'],
  },
  evidence: {
    sentence_evidence: [],
    top_evidence_sentences: [],
  },
  verification: {
    evidence_validation: {
      evidence_supports_prediction: true,
      coherence_score: 0.82,
      alternative_interpretation: null,
      flagged_for_review: false,
      per_symptom_verdicts: [],
    },
    confidence_analysis: {
      should_trust_prediction: 'high',
      reasoning: 'Strong language signals.',
      potential_confounders: [],
      recommended_threshold_adjustment: null,
    },
    adversarial_check: {
      likely_adversarial: false,
      adversarial_type: null,
      authenticity_score: 0.95,
      warning: null,
    },
  },
  final_prediction: 'moderate',
  final_confidence: 0.81,
  confidence_adjusted: false,
  explanation_report: {
    summary: 'Your screening detected several patterns.',
    risk_level: 'moderate',
    symptom_explanations: {},
    why_model_thinks_this: 'Language analysis revealed markers of low mood.',
    key_evidence_quotes: [],
    uncertainty_notes: '',
    safety_disclaimer: 'This tool is a research prototype. It is not a diagnostic instrument.',
    resources: [],
  },
  flagged_for_review: false,
  adversarial_warning: null,
}

const MOCK_SCREENING_SEVERE: ScreeningResponse = {
  ...MOCK_SCREENING,
  id: 'screening-severe-999',
  symptom_analysis: {
    ...MOCK_SCREENING.symptom_analysis,
    severity_level: 'severe',
    dsm5_criteria_met: [
      'DEPRESSED_MOOD',
      'ANHEDONIA',
      'FATIGUE',
      'SLEEP_ISSUES',
      'COGNITIVE_ISSUES',
      'SUICIDAL_THOUGHTS',
      'WORTHLESSNESS',
      'APPETITE_CHANGE',
      'PSYCHOMOTOR',
    ],
    unique_symptom_count: 9,
  },
}

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockGetById = vi.fn()

vi.mock('../api/client', () => ({
  screening: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getHistory: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
    downloadPdf: vi.fn(),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'u1',
      email: 'test@test.local',
      full_name: 'Test User',
      role: 'patient',
      onboarding_completed: true,
    },
    isAuthenticated: true,
    isLoading: false,
    isPatient: true,
    isClinician: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ screeningId: 'screening-abc-123' })),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ResultPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the loading state (BreathingCircle) while data is being fetched', () => {
    // Never resolves during this test
    mockGetById.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a severity indicator after data loads', async () => {
    mockGetById.mockResolvedValue(MOCK_SCREENING)
    renderPage()
    // SeverityBadge renders the criteria count as a large number
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('shows disclaimer text containing "research prototype"', async () => {
    mockGetById.mockResolvedValue(MOCK_SCREENING)
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/research prototype/i),
      ).toBeInTheDocument()
    })
  })

  it('renders crisis support section when SUICIDAL_THOUGHTS criterion is present', async () => {
    mockGetById.mockResolvedValue(MOCK_SCREENING_SEVERE)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/you are not alone/i)).toBeInTheDocument()
    })
  })

  it('does NOT render crisis support section for non-severe results', async () => {
    mockGetById.mockResolvedValue(MOCK_SCREENING)
    renderPage()
    await waitFor(() => {
      // Severity indicator is visible — page has loaded
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.queryByText(/you are not alone/i)).not.toBeInTheDocument()
  })
})
