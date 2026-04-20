/**
 * Tests for the API client.
 *
 * Scope: token lifecycle + error parsing + auth header injection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setAccessToken,
  clearTokens,
  getAccessToken,
  auth,
} from './client'

describe('Token management', () => {
  beforeEach(() => {
    clearTokens()
  })

  afterEach(() => {
    clearTokens()
  })

  it('setAccessToken stores access in memory', () => {
    setAccessToken('access-abc')
    expect(getAccessToken()).toBe('access-abc')
  })

  it('clearTokens wipes access token', () => {
    setAccessToken('a')
    clearTokens()
    expect(getAccessToken()).toBeNull()
  })

  it('no localStorage usage for tokens', () => {
    setAccessToken('should-not-touch-storage')
    expect(localStorage.getItem('refresh_token')).toBeNull()
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
    setAccessToken('test-access-token')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), { status: 200 })
    )

    await auth.getProfile()

    const [, init] = fetchSpy.mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-access-token')
    expect(headers['Content-Type']).toBe('application/json')
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

describe('auth.register / login store access token on success', () => {
  beforeEach(() => {
    clearTokens()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearTokens()
  })

  it('register writes access token into module state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
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
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('auth calls include credentials for cookie transport', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'tok',
          user: { id: 'u1', email: 'a@b.test', full_name: 'A', role: 'patient' },
        }),
        { status: 200 }
      )
    )

    await auth.login({ email: 'a@b.test', password: 'x' })

    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.credentials).toBe('include')
  })
})
