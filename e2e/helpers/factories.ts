/**
 * Test data factories — register real users via the backend API.
 *
 * Why the API route instead of seeding the DB directly? The API is the
 * contract every real user hits. Seeding via SQL bypasses password
 * hashing, audit logs, and our own validation — which means tests can
 * pass while the actual registration path is broken.
 *
 * Each call generates a unique email so parallel runs don't collide.
 */

import type { APIRequestContext } from '@playwright/test'

const BACKEND = process.env.E2E_BACKEND_URL || 'http://localhost:8000'

export interface TestUser {
  email: string
  password: string
  full_name: string
  role: 'patient' | 'clinician'
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
    clinician_code?: string | null
    onboarding_completed?: boolean
  }
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`
}

export async function registerPatient(
  request: APIRequestContext,
  opts: { clinicianCode?: string } = {}
): Promise<TestUser> {
  const email = uniqueEmail('patient')
  const password = 'E2EPassword123'
  const full_name = 'E2E Patient'

  const resp = await request.post(`${BACKEND}/api/auth/register`, {
    data: {
      email,
      password,
      full_name,
      role: 'patient',
      clinician_code: opts.clinicianCode,
    },
  })

  if (!resp.ok()) {
    throw new Error(`Patient registration failed: ${resp.status()} ${await resp.text()}`)
  }

  const body = await resp.json()
  return {
    email,
    password,
    full_name,
    role: 'patient',
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    user: body.user,
  }
}

export async function registerClinician(request: APIRequestContext): Promise<TestUser> {
  const email = uniqueEmail('doctor')
  const password = 'E2EPassword123'
  const full_name = 'Dr. E2E'

  const resp = await request.post(`${BACKEND}/api/auth/register`, {
    data: { email, password, full_name, role: 'clinician' },
  })

  if (!resp.ok()) {
    throw new Error(`Clinician registration failed: ${resp.status()} ${await resp.text()}`)
  }

  const body = await resp.json()
  return {
    email,
    password,
    full_name,
    role: 'clinician',
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    user: body.user,
  }
}

/**
 * Drop the tokens into localStorage + memory the way AuthContext does,
 * so the UI picks up an already-logged-in session without clicking
 * through the login form.
 */
export async function signIn(page: import('@playwright/test').Page, user: TestUser) {
  await page.goto('/')
  await page.evaluate((tokens) => {
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }, user)
  // Trigger the refresh path on next nav so AuthContext hydrates.
  await page.goto('/')
}
