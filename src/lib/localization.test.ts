/**
 * Tests for lib/localization — Bahrain-specific utility functions.
 *
 * These helpers run on every rendered date, phone input, and CPR input.
 * A regression silently ships a broken-looking UI to every patient, so
 * guard each branch directly.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  TOP_CRISIS_RESOURCES,
  CRISIS_RESOURCES_SORTED,
  formatDate,
  formatDateTime,
  formatDateLong,
  formatTime,
  formatRelative,
  normalizePhone,
  formatPhoneDisplay,
  isValidBahrainPhone,
  isValidCPR,
  formatCPRDisplay,
  extractDobFromCPR,
  calculateAge,
  isValidDOB,
} from './localization'

describe('Crisis resources — Bahrain', () => {
  it('emergency (999) is the top-priority resource', () => {
    expect(TOP_CRISIS_RESOURCES[0].phone).toBe('999')
    expect(TOP_CRISIS_RESOURCES[0].available247).toBe(true)
  })

  it('is sorted by priority ascending', () => {
    const priorities = CRISIS_RESOURCES_SORTED.map(r => r.priority)
    const sorted = [...priorities].sort((a, b) => a - b)
    expect(priorities).toEqual(sorted)
  })

  it('includes Shamsaha 24/7 line', () => {
    const s = CRISIS_RESOURCES_SORTED.find(r => r.id === 'shamsaha')
    expect(s).toBeDefined()
    expect(s?.phone).toBe('17651421')
    expect(s?.available247).toBe(true)
  })

  it('does NOT include US-centric numbers', () => {
    const allPhones = CRISIS_RESOURCES_SORTED.map(r => r.phone).join(' ')
    expect(allPhones).not.toContain('988')
    expect(allPhones).not.toContain('911')
  })
})

describe('Date formatting', () => {
  // All dates are formatted in Asia/Bahrain (UTC+3). Use a UTC reference
  // that doesn't shift across that boundary to keep assertions stable.
  const ref = new Date('2026-04-15T12:00:00Z')  // 15:00 Bahrain → same calendar day everywhere

  it('formatDate returns DD/MM/YYYY', () => {
    expect(formatDate(ref)).toBe('15/04/2026')
  })

  it('formatDate accepts ISO string', () => {
    expect(formatDate('2026-01-05T12:00:00Z')).toBe('05/01/2026')
  })

  it('formatDate returns empty string on null / invalid', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formatDateTime returns DD/MM/YYYY HH:mm (24h)', () => {
    // Intl uses a locale-specific separator (", " on en-GB). The contract
    // is: contains the date AND the 24-hour time.
    // 12:00 UTC = 15:00 Bahrain.
    const out = formatDateTime(ref)
    expect(out).toContain('15/04/2026')
    expect(out).toContain('15:00')
  })

  it('formatDateLong uses full month name', () => {
    expect(formatDateLong(ref)).toBe('15 April 2026')
  })

  it('formatTime returns HH:mm only', () => {
    expect(formatTime(ref)).toBe('15:00')  // 12:00 UTC in Asia/Bahrain
  })
})

describe('formatRelative', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('"just now" for < 1 minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'))
    expect(formatRelative('2026-04-15T11:59:30Z')).toBe('just now')
  })

  it('minutes ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'))
    expect(formatRelative('2026-04-15T11:55:00Z')).toBe('5 minutes ago')
  })

  it('hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'))
    expect(formatRelative('2026-04-15T09:00:00Z')).toBe('3 hours ago')
  })

  it('falls back to DD/MM/YYYY after 7 days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'))
    const old = '2026-04-01T12:00:00Z'
    expect(formatRelative(old)).toBe('01/04/2026')
  })

  it('treats naive backend timestamps as UTC (no Z) — not local', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'))
    // Without appending Z, 'new Date("2026-04-15T11:55:00")' in most
    // locales would be 8h off. The fn should handle this.
    const out = formatRelative('2026-04-15T11:55:00')
    expect(out).toBe('5 minutes ago')
  })
})

describe('Phone — Bahrain +973', () => {
  it.each([
    ['+97332223333', '+97332223333'],
    ['32223333', '+97332223333'],
    ['00973 3222 3333', '+97332223333'],
    ['+973 3222 3333', '+97332223333'],
    ['973-3222-3333', '+97332223333'],
  ])('normalizePhone(%s) → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each([
    '+14155551234',  // US number
    'not-a-phone',
    '12345',
    '',
  ])('normalizePhone rejects %s', (bad) => {
    expect(normalizePhone(bad)).toBeNull()
  })

  it('formatPhoneDisplay adds spacing', () => {
    expect(formatPhoneDisplay('+97332223333')).toBe('+973 3222 3333')
  })

  it('formatPhoneDisplay returns input unchanged when invalid', () => {
    expect(formatPhoneDisplay('garbage')).toBe('garbage')
  })

  it('isValidBahrainPhone rejects numbers not matching mobile/landline prefixes', () => {
    expect(isValidBahrainPhone('+97399999999')).toBe(false)  // starts with 9
    expect(isValidBahrainPhone('+97332223333')).toBe(true)   // mobile (3-prefix)
    expect(isValidBahrainPhone('+97317279311')).toBe(true)   // landline (1-prefix)
  })
})

describe('CPR — Bahrain National ID', () => {
  it('accepts plausible 9-digit CPR', () => {
    expect(isValidCPR('850423456')).toBe(true)
  })

  it('accepts display format with separators', () => {
    expect(isValidCPR('8504-2345-6')).toBe(true)
    expect(isValidCPR('8504 2345 6')).toBe(true)
  })

  it('rejects wrong length', () => {
    expect(isValidCPR('12345')).toBe(false)
    expect(isValidCPR('1234567890')).toBe(false)
  })

  it('rejects non-digits', () => {
    expect(isValidCPR('85A423456')).toBe(false)
  })

  it('rejects invalid months (13+)', () => {
    expect(isValidCPR('851323456')).toBe(false)
  })

  it('rejects implausible near-future years', () => {
    const futureYY = ((new Date().getFullYear() + 3) % 100).toString().padStart(2, '0')
    const cpr = `${futureYY}04` + '23456'
    expect(isValidCPR(cpr)).toBe(false)
  })

  it('formatCPRDisplay: "850423456" → "8504-2345-6"', () => {
    expect(formatCPRDisplay('850423456')).toBe('8504-2345-6')
  })

  it('extractDobFromCPR returns year + month', () => {
    const out = extractDobFromCPR('850423456')
    expect(out).not.toBeNull()
    const [year, month] = out!
    expect(year).toBe(1985)
    expect(month).toBe(4)
  })
})

describe('Age', () => {
  it('calculateAge returns integer years', () => {
    // 30 years ago today — between 29 and 31 is acceptable depending on day
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 30)
    const age = calculateAge(dob)
    expect([29, 30]).toContain(age)
  })

  it('calculateAge handles invalid input', () => {
    expect(calculateAge('not-a-date')).toBe(0)
  })

  it('isValidDOB rejects under 13', () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 10)
    expect(isValidDOB(dob)).toBe(false)
  })

  it('isValidDOB rejects over 120', () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 130)
    expect(isValidDOB(dob)).toBe(false)
  })

  it('isValidDOB accepts 25-year-old', () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 25)
    expect(isValidDOB(dob)).toBe(true)
  })
})
