/**
 * E2E: patient journey.
 *
 * The canonical path a first-time patient walks:
 *  1. Register
 *  2. (Optionally) skip onboarding
 *  3. Submit a screening
 *  4. See the results page
 *
 * If the real LLM is live, the results page renders fully. If the LLM
 * key isn't configured, the backend still persists the screening and
 * the results page renders with the fallback explanation — either way
 * we land on `/results/...` and the "Back to Screening" link is visible.
 */

import { test, expect } from '@playwright/test'
import { registerPatient, signIn } from './helpers/factories'

test.describe('Patient screening journey', () => {
  // Screenings take ~20-40s on the real LLM. Give this suite breathing room.
  test.setTimeout(90_000)

  test('patient submits a screening and reaches the results page', async ({ page, request }) => {
    const user = await registerPatient(request)
    await signIn(page, user)

    // Navigate to screening (may redirect through onboarding — handle both)
    await page.goto('/screening')
    if (/\/onboarding/.test(page.url())) {
      // Skip onboarding via the "Continue" or "Skip" affordance if present.
      // If neither exists, the test still proceeds via direct nav below.
      const skipBtn = page.getByRole('button', { name: /skip|continue to/i }).first()
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click()
      }
    }

    // Ensure we're on the screening form
    await page.goto('/screening')

    const textarea = page.getByRole('textbox').first()
    await expect(textarea).toBeVisible()

    const sample = [
      "I've been feeling low for weeks now.",
      "Sleep is hard — I'm up at 3am most nights.",
      "Things I used to enjoy just don't land anymore.",
    ].join(' ')
    await textarea.fill(sample)

    await page.getByRole('button', { name: /submit|analyze|screen|begin/i }).click()

    // Wait for the pipeline — the results page has a unique URL shape
    await page.waitForURL(/\/results\//, { timeout: 80_000 })

    // Results page should show severity + disclaimer + crisis resources
    await expect(page.getByText(/screening|severity|result/i).first()).toBeVisible()
    await expect(page.getByText(/999/)).toBeVisible()
  })
})
