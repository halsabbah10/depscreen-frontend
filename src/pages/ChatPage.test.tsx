/**
 * ChatPage — page-level component tests.
 *
 * Scope: message input, new conversation button, streaming loading state.
 * No real API calls — all mocked.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatPage } from './ChatPage'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  chat: {
    getConversations: vi.fn().mockResolvedValue([]),
    getConversationMessages: vi.fn().mockResolvedValue({ messages: [] }),
    getScreeningChatHistory: vi.fn().mockResolvedValue({ messages: [] }),
    createConversation: vi.fn(),
    sendConversationMessage: vi.fn(),
    archiveConversation: vi.fn(),
    renameConversation: vi.fn(),
    autoTitleConversation: vi.fn(),
    streamScreeningMessage: vi.fn(),
    streamConversationMessage: vi.fn(),
  },
  screening: {
    getById: vi.fn().mockResolvedValue(null),
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
      profile_picture_url: null,
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


// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(path = '/chat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ChatPage />
    </MemoryRouter>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the message input textarea', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument()
    })
  })

  it('renders the "New conversation" button in the sidebar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new conversation/i })).toBeInTheDocument()
    })
  })

  it('renders the DepScreen Assistant header', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('DepScreen Assistant')).toBeInTheDocument()
    })
  })

  it('shows empty-state prompt text when there are no messages', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/chat about anything/i)).toBeInTheDocument()
    })
  })

  it('renders suggestion chips when the conversation is empty', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('What does my severity level mean?')).toBeInTheDocument()
    })
  })
})
