/**
 * Sentry initialization — frontend.
 *
 * Imported at the top of main.tsx, before any component renders, so
 * initialization-time errors are captured too.
 *
 * Behaves as a no-op when VITE_SENTRY_DSN is not defined (local dev
 * without a Sentry account, CI builds, forks).
 *
 * Policy for our mental-health context:
 *  - sendDefaultPii: false — no IPs, no user agents tied to identities
 *  - Session Replay: disabled entirely. Replay would record patient
 *    screening text and chat messages, which we never want leaving the
 *    user's browser.
 *  - tracesSampleRate: 0 — performance data costs quota with no useful
 *    signal at our scale.
 *  - beforeSend filter strips sensitive payload keys as a safety net.
 */

import * as Sentry from '@sentry/react'

const SENSITIVE_FIELD_RE = /password|token|secret|authorization|cookie|cpr|ssn|api[-_]?key|dsn/i

// Recursively redact sensitive values before anything leaves the browser.
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub)
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_FIELD_RE.test(k)) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = scrub(v)
      }
    }
    return out
  }
  return value
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    // Expected in local dev; log once so it's visible in console if needed.
    if (import.meta.env.DEV) {
      console.info('[sentry] disabled — VITE_SENTRY_DSN not set')
    }
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'production' from Vite build, 'development' from dev server
    release: import.meta.env.VITE_APP_VERSION || undefined,

    // Critical for a mental-health app — no implicit PII
    sendDefaultPii: false,

    // Disable expensive features we don't use
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Defense-in-depth scrubber for anything that slips through
    beforeSend(event) {
      // Drop events from browsers that clearly aren't users (noisy bots)
      const ua = event.request?.headers?.['User-Agent'] || ''
      if (/\b(bot|crawler|spider|scraper)\b/i.test(ua)) return null

      // Scrub request bodies, extra context, tags, etc.
      if (event.request) event.request = scrub(event.request) as typeof event.request
      if (event.extra) event.extra = scrub(event.extra) as typeof event.extra
      if (event.tags) event.tags = scrub(event.tags) as typeof event.tags

      return event
    },

    beforeBreadcrumb(breadcrumb) {
      // Suppress clipboard and UI breadcrumbs that might echo patient text
      if (breadcrumb.category === 'ui.input' || breadcrumb.category === 'clipboard') {
        return null
      }
      return breadcrumb
    },
  })
}
