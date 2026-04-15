/**
 * Tests for the API client.
 *
 * Scope: token lifecycle + error parsing + auth header injection. The
 * per-endpoint method list isn't tested — those are thin wrappers
 * around fetch and are covered by Playwright's round-trips.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setTokens,
  clearTokens,
  getAccessToken,
  loadStoredRefreshToken,
  auth,
} from './client'

describe('Token management', () => {
  beforeEach(() => {
    clearTokens()
    localStorage.clear()
  })

  afterEach(() => {
    clearTokens()
    localStorage.clear()
  })

  it('setTokens stores access in memory and refresh in localStorage', () => {
    setTokens('access-abc', 'refresh-xyz')
    expect(getAccessToken()).toBe('access-abc')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz')
  })

  it('clearTokens wipes both', () => {
    setTokens('a', 'b')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('loadStoredRefreshToken reads from localStorage', () => {
    localStorage.setItem('refresh_token', 'persisted')
    expect(loadStoredRefreshToken()).toBe('persisted')
  })

  it('loadStoredRefreshToken returns null when nothing stored', () => {
    expect(loadStoredRefreshToken()).toBeNull()
  })
})

describe('Auth header injection', () => {
  beforeEach(() => {
    clearTokens()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearTokens()
  })

  it('attaches Authorization: Bearer when a token is set', async () => {
    setTokens('test-access-token', 'test-refresh-token')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), { status: 200 })
    )

    await auth.getProfile()

    const [, init] = fetchSpy.mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-access-token')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('omits Authorization when no token is set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'new', refresh_token: 'new' }), {
        status: 200,
      })
    )

    await auth.login({ email: 'a@b.test', password: 'x' }).catch(() => {})

    const [, init] = fetchSpy.mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})

describe('Error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws APIError with detail from JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
        status: 401,
      })
    )

    await expect(
      auth.login({ email: 'bad@test.local', password: 'wrong' })
    ).rejects.toMatchObject({
      name: 'APIError',
      status: 401,
      message: 'Invalid credentials',
    })
  })

  it('throws with generic message when body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Gateway timeout</html>', { status: 504 })
    )

    await expect(
      auth.login({ email: 'a@test.local', password: 'x' })
    ).rejects.toMatchObject({
      name: 'APIError',
      status: 504,
    })
  })
})

describe('auth.register / login store tokens on success', () => {
  beforeEach(() => {
    clearTokens()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearTokens()
    localStorage.clear()
  })

  it('register writes returned tokens into module state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          user: { id: 'u1', email: 'a@b.test', full_name: 'A', role: 'patient' },
        }),
        { status: 200 }
      )
    )

    const result = await auth.register({
      email: 'new@test.local',
      password: 'password123',
      full_name: 'New User',
      role: 'patient',
    })

    expect(result.access_token).toBe('new-access')
    expect(getAccessToken()).toBe('new-access')
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
  })
})
