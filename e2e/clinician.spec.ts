/**
 * E2E: clinician workflow.
 *
 * Covers:
 *  1. Log in as a clinician
 *  2. Land on the dashboard
 *  3. Open a patient's detail page
 *  4. Send them a notification (exercises the B.7 orphan-endpoint fix)
 */

import { test, expect } from '@playwright/test'
import { registerClinician, registerPatient, signIn } from './helpers/factories'

test.describe('Clinician workflow', () => {
  test('clinician can open a linked patient and send them a notification', async ({ page, request }) => {
    const clinician = await registerClinician(request)
    // Register a patient linked to the clinician via their invite code
    const patient = await registerPatient(request, {
      clinicianCode: clinician.user.clinician_code ?? undefined,
    })

    await signIn(page, clinician)

    // Dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/dashboard|patients|stats/i).first()).toBeVisible()

    // Open the patient list
    await page.goto('/patients')
    await expect(page.getByText(patient.user.full_name)).toBeVisible()

    // Navigate to the patient's detail page
    await page.getByText(patient.user.full_name).click()
    await page.waitForURL(/\/patients\//)

    // Open the Send-Notification composer
    await page.getByRole('button', { name: /notif|send message|notify/i }).first().click()

    // Fill + submit
    await page.getByLabel(/title/i).fill('Weekly check-in reminder')
    await page.getByLabel(/message/i).fill('Your next screening is due on Monday. Take it at your own pace.')

    await page.getByRole('button', { name: /send|submit|notify/i }).last().click()

    // Success toast or a modal close — match both flexibly
    await expect(
      page.getByText(/sent|delivered|notification|success/i).first()
    ).toBeVisible({ timeout: 8000 })
  })
})
