# Frontend Testing

Two layers, split by what they're good at:

| Layer | Tool | Scope | When |
|---|---|---|---|
| Unit | Vitest + jsdom | Utils, API client, contexts | Every PR |
| E2E | Playwright (Chromium) | Real user journeys | Manually, before demo |

## Unit (Vitest)

```bash
npm test           # one-shot
npm run test:watch # interactive
npm run test:coverage
```

**What's covered:**
- `src/lib/localization.test.ts` — DD/MM/YYYY dates, +973 phone, CPR validation, crisis resources (30 tests)
- `src/api/client.test.ts` — token lifecycle, auth header injection, error parsing (10 tests)

**What's not:** page-level smoke tests. Those live in Playwright — they
actually exercise the stack end-to-end, whereas shallow page tests
would just validate that React renders mocked data.

CI runs these on every PR via `.github/workflows/ci.yml`.

## E2E (Playwright)

See [`e2e/README.md`](./e2e/README.md) for the full walkthrough.

**TL;DR:**
1. Start the backend on `:8000` yourself (`uvicorn main:app --reload`).
2. `npm run e2e` (Playwright boots the frontend automatically).

**What's covered** (4 golden paths):
- `auth.spec.ts` — route guards, login happy/error, RBAC
- `patient-journey.spec.ts` — register → screening → results page
- `clinician.spec.ts` — login → dashboard → patient detail → send notification
- `chat.spec.ts` — create / rename / archive conversation

Not wired into CI yet — needs a backend service container + pgvector +
mocked LLM. Manual for capstone demo.

## Running both at once

Just run them sequentially:

```bash
npm test && npm run e2e
```
