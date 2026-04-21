/**
 * ScreeningPage — page-level component tests.
 *
 * Scope: rendering and tab-switching. No real API calls.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreeningPage } from './ScreeningPage'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  ingest: {
    getCheckInPrompts: vi.fn().mockResolvedValue({
      prompts: [
        {
          id: 'p1',
          question: 'How have you been feeling lately?',
          follow_up: 'Take your time.',
          dsm5_criterion: 'DEPRESSED_MOOD',
        },
        {
          id: 'p2',
          question: 'How has your sleep been?',
          follow_up: null,
          dsm5_criterion: 'SLEEP_ISSUES',
        },
        {
          id: 'p3',
          question: 'Have you had trouble focusing?',
          follow_up: null,
          dsm5_criterion: 'COGNITIVE_ISSUES',
        },
      ],
    }),
    submitCheckIn: vi.fn(),
    analyzeReddit: vi.fn(),
    analyzeX: vi.fn(),
    uploadBulk: vi.fn(),
  },
  screening: {
    getById: vi.fn(),
    getHistory: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }),
    submit: vi.fn(),
    deleteScreening: vi.fn(),
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
    useNavigate: vi.fn(() => vi.fn()),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ScreeningPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScreeningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the method-selection heading', () => {
    renderPage()
    expect(screen.getByText('How would you like to begin?')).toBeInTheDocument()
  })

  it('shows all three screening method cards', () => {
    renderPage()
    expect(screen.getByText('Guided Check-in')).toBeInTheDocument()
    expect(screen.getByText('Social Media Analysis')).toBeInTheDocument()
    expect(screen.getByText('Upload Text Data')).toBeInTheDocument()
  })

  it('navigates into the social media view when that card is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Social Media Analysis'))
    await waitFor(() => {
      expect(screen.getByText('Choose a platform')).toBeInTheDocument()
    })
  })

  it('navigates into the bulk upload view when that card is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Upload Text Data'))
    await waitFor(() => {
      expect(screen.getByText('Upload Text Data', { selector: 'h1' })).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText('Paste or type your text here...')).toBeInTheDocument()
  })

  it('loads prompts and renders the check-in view when Guided Check-in is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Guided Check-in'))
    // Prompts load asynchronously; wait for the first question to appear
    await waitFor(() => {
      expect(screen.getByText('Guided Check-in', { selector: 'h1' })).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('How have you been feeling lately?')).toBeInTheDocument()
    })
  })
})
