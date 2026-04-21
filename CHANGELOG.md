# Changelog

All notable changes to the DepScreen frontend. Dates in DD/MM/YYYY (Asia/Bahrain).

## [Unreleased] — 2026-04-16

### A11y
- Personal Information form on `ProfilePage` — every input now has an associated `<label htmlFor>`, and the gender / blood-type button groups are proper `role="radiogroup"` with `aria-checked` on each option. Emergency-contact add-form wrapped in `role="group"` with `aria-label`; each input has an `aria-label` since the form uses placeholders as visual labels.

### Tests
- **Vitest unit suite** (49 tests) — localization helpers (DD/MM/YYYY, +973 phone, CPR, crisis resources) and the API client (token lifecycle, auth headers, error parsing).
- **Playwright E2E** (4 specs) — auth guards, patient screening journey, clinician notify-patient flow, standalone chat CRUD.
- Vitest wired into `.github/workflows/ci.yml`. Playwright stays manual until a Postgres+pgvector CI runner exists.

### Docs
- `TESTING.md` added. `e2e/README.md` explains the serial-run design and local-backend expectation.

## [2026-04-15] — Layout + perf polish

### Fixed
- Pages no longer scroll as a unit under a sticky header. Outer shell is `h-screen overflow-hidden`; safety banner + nav + footer are `shrink-0`; `<main>` is the only scroll region. Short pages don't scroll at all; long pages scroll internally without the top banner sliding away. ChatPage dropped fragile `calc(100vh - Xrem)` for `flex-1 min-h-0`.

### Added
- **Send-Notification composer** on `PatientDetailPage` — closes an orphaned backend endpoint that never had a UI. Full dialog semantics (`role="dialog"`, `aria-modal`, Escape, focus trap, body scroll lock), title + message + type + link-preset inputs.
- **Instagram-style avatar crop + zoom** modal on profile picture upload.

### Performance
- **Route-level code splitting** via `React.lazy()`. Login + 404 stay eager; every other page is a lazy chunk. Main bundle **94 KB gzip → 45 KB gzip (-52%)**. Suspense fallback is the signature `BreathingCircle`.
- **Font payload trim** — removed unused IBM Plex Sans Arabic + Cormorant italic weights. Kept 4 Cormorant + 5 Figtree weights. Font files dropped **318 → 60**.
- **i18next removed** — infrastructure was shipped but never activated (Arabic deferred); dropping it saved another 8 KB gzip on the main bundle.

## [2026-04-15] — Phase H: Enterprise hardening

- **Sentry** error monitoring on the client — source-mapped stacks, session replay on errors.
- **Security headers** — strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame-deny (via Cloudflare Pages `_headers`).
- **Dependency audit** in CI (`npm audit --omit=dev --audit-level=high`).

## [2026-04-15] — Phase G: A11y + mobile

- Modal dialogs use proper `role="dialog"` + `aria-modal`, focus trap, Escape-to-close, and body scroll lock.
- Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` with arrow-key navigation.
- Touch targets meet the 44×44 px iOS guideline on header nav and notification actions.
- Responsive layout verified at 375 px (mobile), 768 px (tablet), 1280 px (desktop).

## [2026-04-15] — Phase F: Motion + copy polish

- Signature **BreathingCircle** redesign with pulse + therapeutic variants (inhale 4 s, hold 7 s, exhale 8 s — Weil's 4-7-8 rhythm, clinically validated for anxiety reduction).
- First-paint breath during auth bootstrap so loading itself becomes regulating.
- `prefers-reduced-motion` disables animations; breathing becomes a static pulse with screen-reader-only label.
- Warm 404 page with a return-home affordance.
- Inline form validation with subtle shake + coloured underline instead of modal popups.
- Button loading states with an inline BreathingDot, not a spinner.

## [2026-04-14] — Phase D: PDF exports

- Download buttons for screening-result PDFs, patient-data PDFs, and clinician clinical-summary PDFs.
- `downloadBlob()` helper that attaches the current JWT and triggers a proper `Content-Disposition` save.

## [2026-04-14] — Phase C: Smart form inputs

- RxNorm drug-name autocomplete on the medication form.
- ICD-10 code lookup on the diagnosis form.
- PDF upload with client-side size/type check, server-side parsing via `pdfplumber`.

## [2026-04-14] — Phase B: Clinician UIs

- Clinician dashboard with patient triage, severity distribution, flagged cases.
- Patient detail page with screenings, trends, care plan, appointments, messages.
- Direct patient ↔ clinician messaging thread.
- System-wide tone pass — every string now matches the Clinical Sanctuary voice (non-clinical, warm, second-person).

## [2026-04-14] — Phase A: Clinical Sanctuary design system

- Complete visual rebuild. Warm cream (`hsl 35 25% 97%`) palette, teal primary, clay accent.
- **Instrument Serif** display / **Figtree** body / **Cormorant Garamond** headlines.
- Islamic geometric pattern overlay at 2% opacity, paper-grain noise texture.
- Framer Motion page transitions (500 ms fade + 8 px Y-translate) with `prefers-reduced-motion` fallback.
- ~30 shared `components/ui/*` primitives — no native `<select>`, no stock spinner.

## [2026-04-13] — Phase Initial: Bahrain localization

- Crisis resources rewritten for Bahrain (999, 998, Salmaniya, Shamsaha). All US-centric numbers stripped out.
- **+973 phone** input with auto-format and mobile / landline classification.
- **CPR number** input with `YYMM-NNNN-C` mask, client-side validation, derived DOB display.
- **DD/MM/YYYY** dates everywhere via `Intl.DateTimeFormat('en-GB', ..., { timeZone: 'Asia/Bahrain' })`.
