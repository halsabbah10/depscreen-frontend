# DepScreen — Frontend

React client for the DepScreen depression-screening platform. Deployed to Cloudflare Pages; the backend FastAPI service is in a sibling repo and lives on HuggingFace Spaces.

Product overview + architecture: see the [backend README](https://github.com/halsabbah10/depscreen-backend#readme). This README covers the frontend only.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Routing | React Router v6 |
| State | React Context (auth, toast) — no Redux / Zustand |
| Styling | Tailwind CSS 3 + `class-variance-authority` + `tailwind-merge` |
| Motion | Framer Motion (page transitions, breathing indicators) |
| Forms | Controlled components + inline validation — no form library |
| UI primitives | Radix (`dialog`, `alert-dialog`, `tabs`, `progress`, `slot`) |
| Icons | Lucide React |
| Markdown | `react-markdown` + `remark-gfm` (assistant chat responses) |
| Image crop | `react-easy-crop` (avatar upload) |
| HTTP | Native `fetch` through a thin `src/api/client.ts` wrapper |
| Error monitoring | Sentry React SDK (source-mapped; session replay on errors) |
| Test runner | Vitest + Testing Library (jsdom) |
| E2E | Playwright (Chromium) |

---

## Design direction — "Clinical Sanctuary"

The app is built to feel like a warm, thoughtful medical journal — not a tech demo.

- **Typography:** Instrument Serif for display, Figtree for body, Cormorant Garamond for clinical headlines.
- **Palette:** warm cream (`hsl 35 25% 97%`) base, teal primary (`hsl 175 45% 32%`), clay accent (`hsl 20 50% 55%`). Low-cortisol by construction.
- **Motion:** every loading state breathes at the clinically-validated **4–7–8 rhythm** (inhale 4 s, hold 7 s, exhale 8 s — Dr. Andrew Weil's anxiety-reduction technique). `prefers-reduced-motion` replaces animations with a static indicator.
- **Detail:** subtle Islamic geometric pattern overlay at 2 % opacity, paper-grain noise, `Asia/Bahrain` timezone everywhere.

The design system lives in `src/components/ui/` (~30 primitives). Pages compose from these — no native `<select>`, no stock spinner.

---

## Features the user sees

### Patient
- Login / onboarding wizard (demographics → CPR → phone → medications → allergies → emergency contacts)
- Free-text screening or Reddit / X username ingestion
- Results page with sentence-level evidence as editorial pull-quotes
- Chat — standalone or linked to a screening, streamed responses, crisis keyword detection
- Appointments, care plan, messages (with the clinician), notifications
- Profile: avatar (Instagram-style crop + zoom), medical history, emergency contacts
- Screening schedule (weekly / bi-weekly / monthly)

### Clinician
- Dashboard: patient triage, severity distribution, flagged cases
- Patient detail: screenings, trends, care plan, appointments, direct messages
- Send ad-hoc notifications, schedule appointments, build care plans from templates

See [`CHANGELOG.md`](./CHANGELOG.md) for the feature evolution.

---

## Local development

### Prerequisites
- Node.js 20+ (tested on 22 in CI)
- A DepScreen backend reachable at `:8000` — clone [halsabbah10/depscreen-backend](https://github.com/halsabbah10/depscreen-backend) and `python -m uvicorn main:app --reload`

### Setup + run

```bash
npm install
npm run dev          # http://localhost:3000, proxies /api and /health to :8000
```

Vite's proxy config (`vite.config.ts`) forwards `/api/*` and `/health/*` to `http://localhost:8000`, so no CORS hassle in dev.

### Environment variables

| Var | Purpose |
|---|---|
| `VITE_API_URL` | Production backend URL (unused in dev — proxy covers it). Set in Cloudflare Pages. |
| `VITE_SENTRY_DSN` | Sentry DSN. Empty = Sentry no-ops. |
| `VITE_SENTRY_ENVIRONMENT` | `development` / `preview` / `production`. |

Never use `NEXT_PUBLIC_*`-style names — this is Vite, not Next. Only `VITE_*` vars are exposed to the client bundle.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:3000` with HMR + API proxy |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run preview` | Serve `dist/` locally (sanity-check the production bundle) |
| `npm run typecheck` | `tsc --noEmit` — no emit, just type errors |
| `npm run lint` | ESLint across `.ts` / `.tsx` — `--max-warnings 0` in CI |
| `npm test` | Vitest unit + component tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run e2e` | Playwright (Chromium) against a locally-running backend |
| `npm run e2e:ui` | Playwright UI mode (interactive) |
| `npm run e2e:headed` | Watch the browser do the test |
| `npm run e2e:debug` | Playwright inspector |

---

## Testing

Two layers, each with its own place:

- **Unit (Vitest):** `src/**/*.test.ts` — localization helpers (DD/MM/YYYY, +973, CPR, crisis resources) and the API client (tokens, auth headers, errors). **49 tests.**
- **E2E (Playwright):** `e2e/*.spec.ts` — 4 golden paths (auth guards, patient journey, clinician notify, chat CRUD). Real backend required on `:8000`.

Full walkthrough: [`TESTING.md`](./TESTING.md) · [`e2e/README.md`](./e2e/README.md).

CI runs Vitest on every PR. Playwright is manual until a Postgres + pgvector CI runner is wired up.

---

## Project structure

```
frontend/
├── src/
│   ├── App.tsx                 # Route table (lazy-loaded pages)
│   ├── main.tsx                # Bootstrap + Sentry init + font imports
│   ├── api/
│   │   ├── client.ts           # fetch wrapper, token lifecycle, 60+ methods
│   │   └── client.test.ts
│   ├── contexts/
│   │   └── AuthContext.tsx     # Token refresh, user profile, logout
│   ├── components/
│   │   ├── Layout.tsx          # Persistent shell: nav + safety banner + main
│   │   ├── ProtectedRoute.tsx  # Role-based guard
│   │   └── ui/                 # Design system primitives (~30)
│   ├── pages/                  # One file per route; all lazy-loaded
│   ├── lib/
│   │   ├── localization.ts     # Bahrain helpers (DD/MM/YYYY, CPR, +973)
│   │   └── localization.test.ts
│   ├── types/api.ts            # Matches backend Pydantic schemas
│   ├── sentry.ts               # Sentry init (no-op when DSN unset)
│   └── test/setup.ts           # jsdom polyfills + Testing Library matchers
├── e2e/                        # Playwright specs + helpers + README
├── public/                     # Static assets served as-is
├── vite.config.ts              # Dev proxy + manualChunks for prod
├── functions/                   # Cloudflare Pages Functions (API proxy)
├── tailwind.config.js
├── tsconfig.json               # src-only; e2e has its own tsconfig
└── package.json
```

---

## Deployment (Cloudflare Pages)

The frontend is deployed to Cloudflare Pages with the following setup:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **API proxy:** `functions/api/[[path]].ts` and `functions/health/[[path]].ts` forward `/api/*` and `/health/*` to the HuggingFace Spaces backend
- **Security headers:** `public/_headers` defines strict CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, frame-deny, `Permissions-Policy`
- **Asset caching:** `/assets/*` cached with `max-age=31536000, immutable`

`git push` triggers an automatic Cloudflare Pages deploy. Preview URLs for every branch; production builds on pushes to `main`.

Cloudflare environment variables (dashboard, never in the repo): `VITE_API_URL`, `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`.

---

## Performance notes

Current production bundle shape:

| Chunk | Size (gzipped) |
|---|---|
| Main (`index-*.js`) | ~45 KB |
| React + Router | ~53 KB |
| Markdown (`react-markdown` + `remark-gfm`) | ~47 KB (loaded only on Chat + Results) |
| Motion (Framer Motion) | ~42 KB |
| Icons (Lucide subset) | ~4 KB |

Every page under `src/pages/` is `React.lazy`-imported so a patient never downloads the clinician chunks and vice-versa. Fonts are `@fontsource` subsets — 60 font files total (was 318 before the April trim).

---

## Not for clinical use

This is a capstone research prototype. Screening aid, not a diagnostic tool. Bahrain crisis numbers (999 national emergency, Shamsaha 17651421 24/7) are surfaced throughout.
