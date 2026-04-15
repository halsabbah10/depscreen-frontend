/**
 * Playwright configuration.
 *
 * E2E tests run against a locally-booted frontend + backend stack. We
 * don't spin up the backend inside this config (it needs Python + its
 * own venv + the ML model path) — start it yourself with `uvicorn
 * main:app --reload` on port 8000 before running `npm run e2e`.
 *
 * The frontend is started automatically via `webServer` below.
 */

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,     // tests share a real DB; serialize to avoid cross-test pollution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,               // DB state means we need serial execution
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Shrink the default 30s action timeout — most UI interactions in
    // DepScreen are sub-second. Long waits usually mean the test is
    // wrong, not that the app is slow.
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot the frontend automatically. The backend is your responsibility
  // (see e2e/README.md). Playwright waits until this URL is reachable.
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
      },
})
