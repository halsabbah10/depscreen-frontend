# E2E Tests (Playwright)

These tests exercise the full stack — real backend + real frontend + real database.

## Prerequisites

1. **Backend running on `:8000`** in a mode that accepts registrations (dev is fine).
   The tests register fresh users via `POST /api/auth/register` on every run, so
   you don't need to seed anything manually.
2. **Frontend not running** — `playwright.config.ts` boots it itself via `npm run dev`.
   If you already have `npm run dev` running on `:3000` Playwright will reuse it.

## Running

```bash
# One-shot
npm run e2e

# Interactive (opens Playwright UI)
npm run e2e:ui

# Headed (see the browser)
npm run e2e:headed
```

Against a different backend (e.g. a Supabase preview):

```bash
E2E_BACKEND_URL=https://my-preview.hf.space npm run e2e
```

## Design notes

- **No DB seeding.** Every test registers fresh users via the public API and cleans up after itself (soft-delete on the backend). This matches the path a real user walks.
- **Serial execution.** Workers set to 1 in the config — parallel runs fight over conversation-uniqueness / email-uniqueness invariants. If your laptop feels slow, just let it run single-file.
- **No LLM mocking at this layer.** Chat and screening exercise the real LLM. If the backend is configured with a real OpenRouter key, the tests will hit it. If it's not, the tests gracefully skip or assert on the fallback path.
- **Screenshots + video on failure.** Check `test-results/` after a run.

## Not in CI yet

These tests are manual for the capstone demo. Wiring them into GitHub
Actions needs:
1. A Postgres + pgvector service container
2. A way to boot the Python backend without the real ML model (env flag)
3. Mocked OpenRouter credentials

That's in the deployment phase — see `TESTING.md` at the repo root.
