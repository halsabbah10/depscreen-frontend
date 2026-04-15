/**
 * Global Vitest setup.
 *
 * Runs once before every test file. Wires jest-dom matchers, resets the
 * DOM between tests, and provides lightweight polyfills for APIs jsdom
 * doesn't include.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Reset the DOM + any spies between tests.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// jsdom lacks matchMedia — several UI components (Tailwind-based media
// queries, prefers-reduced-motion checks) call it on mount.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// IntersectionObserver stub (Framer Motion + some UI libs use it).
if (!window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
    root = null
    rootMargin = ''
    thresholds = []
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  })
}

// ResizeObserver stub (used by Radix primitives).
if (!window.ResizeObserver) {
  class MockResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
  })
}

// scrollIntoView — called by ChatPage on new messages.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
