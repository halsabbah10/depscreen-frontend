/**
 * E2E: standalone chat.
 *
 * Exercises conversation CRUD from the UI without relying on a real LLM
 * reply — we create a conversation, rename it, and archive it. Message
 * sending + streaming is left to manual smoke testing since it depends
 * on a paid LLM key at demo time.
 */

import { test, expect } from '@playwright/test'
import { registerPatient, signIn } from './helpers/factories'

test.describe('Standalone chat', () => {
  test('patient can create, rename, and archive a conversation', async ({ page, request }) => {
    const user = await registerPatient(request)
    await signIn(page, user)

    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/)

    // Start a new conversation via the "+ New conversation" affordance
    await page.getByRole('button', { name: /new conversation/i }).click()

    // A new conversation row should appear in the sidebar. The initial
    // title is "New Conversation" until the first message lands.
    await expect(page.getByText(/new conversation/i).first()).toBeVisible()

    // Rename it via the pencil icon in the sidebar row
    await page
      .getByRole('button', { name: /rename/i })
      .first()
      .click()

    const renameInput = page.locator('input[type="text"]').first()
    await renameInput.fill('A quieter week')
    await renameInput.press('Enter')

    await expect(page.getByText('A quieter week')).toBeVisible()

    // Archive (delete icon). Accept the confirm dialog.
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: /delete/i }).first().click()

    // The conversation should no longer appear in the list
    await expect(page.getByText('A quieter week')).not.toBeVisible({ timeout: 5000 })
  })
})
