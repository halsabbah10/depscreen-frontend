/**
 * E2E: authentication + route guards.
 *
 * Covers the guards a user bumps into on their first visit:
 * - Unauthenticated access to a protected route → bounced to /login
 * - Login with valid credentials lands on the role home
 * - Invalid credentials show the error toast
 * - Registered patient can sign in twice (session persists across reload)
 */

import { test, expect } from '@playwright/test'
import { registerPatient, registerClinician } from './helpers/factories'

test.describe('Auth guards', () => {
  test('unauthenticated visit to /screening redirects to /login', async ({ page }) => {
    await page.goto('/screening')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Login flow', () => {
  test('patient can register, then log in, then reload and stay logged in', async ({ page, request }) => {
    const user = await registerPatient(request)

    // Log in via the UI (not the token shortcut) so we exercise the real form
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Lands on the patient home
    await expect(page).toHaveURL(/\/(screening|onboarding)/)

    // Reload — session survives via the refresh token
    await page.reload()
    await expect(page).toHaveURL(/\/(screening|onboarding)/)
  })

  test('wrong password shows a visible error', async ({ page, request }) => {
    const user = await registerPatient(request)

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill('definitely-not-the-password')
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Either a toast or inline error surfaces somewhere on the page.
    // Keep the matcher loose so a copy tweak doesn't fail the test.
    await expect(
      page.getByText(/invalid|incorrect|wrong|try again|doesn'?t match/i).first()
    ).toBeVisible({ timeout: 5000 })

    // Still on login
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('RBAC', () => {
  test('clinician cannot land on patient-only /screening', async ({ page, request }) => {
    const clinician = await registerClinician(request)

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(clinician.email)
    await page.getByLabel(/password/i).fill(clinician.password)
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Lands on clinician home
    await expect(page).toHaveURL(/\/dashboard/)

    // Manually navigating to /screening should either redirect back or show a
    // 404/denied page — the exact behavior depends on ProtectedRoute, but in
    // every case the clinician must NOT see the screening form.
    await page.goto('/screening')
    await expect(page.getByRole('textbox', { name: /share|what.*mind/i })).not.toBeVisible()
  })
})
