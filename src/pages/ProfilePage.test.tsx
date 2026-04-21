/**
 * ProfilePage — page-level component tests.
 *
 * Scope: user info display, tab navigation (medical / contacts / settings),
 * day-of-week dropdown default. No real API calls.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfilePage } from './ProfilePage'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  patient: {
    updateProfile: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMedications: vi.fn().mockResolvedValue([]),
    getAllergies: vi.fn().mockResolvedValue([]),
    getDiagnoses: vi.fn().mockResolvedValue([]),
    getEmergencyContacts: vi.fn().mockResolvedValue([]),
    addMedication: vi.fn(),
    deleteMedication: vi.fn(),
    addAllergy: vi.fn(),
    deleteAllergy: vi.fn(),
    addEmergencyContact: vi.fn(),
    removeEmergencyContact: vi.fn(),
    exportData: vi.fn(),
    downloadExportPdf: vi.fn(),
    deactivateAccount: vi.fn(),
    uploadProfilePicture: vi.fn(),
    deleteProfilePicture: vi.fn(),
    getScreeningSchedule: vi.fn().mockResolvedValue(null),
    createScreeningSchedule: vi.fn(),
    deleteScreeningSchedule: vi.fn(),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'u1',
      email: 'test@test.local',
      full_name: 'Test User',
      role: 'patient',
      clinician_code: null,
      profile_picture_url: null,
      date_of_birth: null,
      gender: null,
      nationality: null,
      cpr_number: null,
      phone: null,
      blood_type: null,
      onboarding_completed: true,
      created_at: '2026-01-01T00:00:00Z',
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
      <ProfilePage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the user's full name in the profile card", () => {
    renderPage()
    // The card renders the name as a paragraph element
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it("renders the user's email in the profile card", () => {
    renderPage()
    expect(screen.getByText('test@test.local')).toBeInTheDocument()
  })

  it('shows the Medications section after switching to the Medical tab', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /medical/i }))
    await waitFor(() => {
      expect(screen.getByText('Medications')).toBeInTheDocument()
    })
  })

  it('shows the Emergency Contacts section after switching to the Contacts tab', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /contacts/i }))
    await waitFor(() => {
      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument()
    })
  })

  it('shows the day-of-week dropdown in Settings with Monday as the first option (index 0)', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    // The ScreeningScheduleCard loads asynchronously (getScreeningSchedule resolves null)
    await waitFor(() => {
      expect(screen.getByText('Recurring check-ins')).toBeInTheDocument()
    })
    // The ScreeningScheduleCard renders a <select> containing the day names.
    // The select has no aria-label or htmlFor — locate it by the label text
    // sibling and then query the combobox (select) role within that section.
    // dayNames = ['Monday', ..., 'Sunday'], so index 0 is Monday with value="0".
    const selects = screen.getAllByRole<HTMLSelectElement>('combobox')
    // The day-of-week select is the one whose first option is "Monday"
    const daySelect = selects.find(s => s.options[0]?.text === 'Monday')
    expect(daySelect).toBeDefined()
    expect(daySelect!.options[0].value).toBe('0')
    expect(daySelect!.options[0].text).toBe('Monday')
  })
})
