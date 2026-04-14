/**
 * Localization helpers for DepScreen (Bahrain).
 *
 * Single source of truth for:
 * - Crisis resources (Bahrain hotlines, hospitals, NGOs)
 * - Date/time formatting (DD/MM/YYYY, AST timezone)
 * - Phone number formatting (+973)
 * - CPR (Civil Personal Record) validation
 */

// ── Country / Region ────────────────────────────────────────────────────────

export const COUNTRY_CODE = 'BH'
export const COUNTRY_NAME = 'Bahrain'
export const PHONE_COUNTRY_CODE = '+973'
export const TIMEZONE = 'Asia/Bahrain' // AST — UTC+3
export const LOCALE_CODE = 'en-GB' // British English → DD/MM/YYYY

// ── Bahrain Crisis Resources ────────────────────────────────────────────────

export interface CrisisResource {
  id: string
  name: string
  nameShort: string
  phone: string
  phoneDisplay: string
  alternatePhone?: string
  description: string
  priority: number
  available247: boolean
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'emergency',
    name: 'National Emergency',
    nameShort: 'Emergency',
    phone: '999',
    phoneDisplay: '999',
    description:
      'Police, ambulance, or fire. Call for life-threatening situations. Toll-free, 24/7.',
    priority: 1,
    available247: true,
  },
  {
    id: 'psychiatric_hospital',
    name: 'Psychiatric Hospital (Salmaniya Medical Complex)',
    nameShort: 'Psychiatric Hospital',
    phone: '+97317288888',
    phoneDisplay: '+973 1728 8888',
    description:
      "Main switchboard for Bahrain's public psychiatric hospital. For mental health emergencies, the ambulance will take you to Salmaniya emergency department.",
    priority: 2,
    available247: true,
  },
  {
    id: 'psychiatric_appointments',
    name: 'Psychiatric Hospital — Appointments & Referrals',
    nameShort: 'Psychiatric Appointments',
    phone: '+97317279311',
    phoneDisplay: '+973 1727 9311',
    description: 'Schedule an appointment with a psychiatrist at Salmaniya.',
    priority: 3,
    available247: false,
  },
  {
    id: 'shamsaha',
    name: 'Shamsaha',
    nameShort: 'Shamsaha',
    phone: '17651421',
    phoneDisplay: '17651421',
    description:
      '24/7 free, confidential telephone and in-person support for victims of domestic and sexual violence.',
    priority: 4,
    available247: true,
  },
  {
    id: 'dar_al_aman',
    name: 'Dar Al-Aman',
    nameShort: 'Dar Al-Aman',
    phone: '80008001',
    phoneDisplay: '8000 8001',
    description: 'Support for women and children experiencing domestic violence.',
    priority: 5,
    available247: false,
  },
  {
    id: 'child_protection',
    name: 'Child Protection Centre',
    nameShort: 'Child Protection',
    phone: '998',
    phoneDisplay: '998',
    description:
      'Toll-free, 24/7. Receives reports of violence, abuse, or danger to children.',
    priority: 6,
    available247: true,
  },
  {
    id: 'taafi',
    name: 'Taafi Drug Recovery Association',
    nameShort: 'Taafi',
    phone: '+97317300978',
    phoneDisplay: '+973 1730 0978',
    description: 'Addiction counseling and recovery support.',
    priority: 7,
    available247: false,
  },
]

/** Resources sorted by priority (emergency first). */
export const CRISIS_RESOURCES_SORTED = [...CRISIS_RESOURCES].sort(
  (a, b) => a.priority - b.priority
)

/** Top 4 resources for the crisis banner on results page. */
export const TOP_CRISIS_RESOURCES = CRISIS_RESOURCES_SORTED.slice(0, 4)

// ── Safety Disclaimer ───────────────────────────────────────────────────────

export const SAFETY_DISCLAIMER =
  'This screening is NOT a medical diagnosis. The results represent statistical ' +
  'patterns detected by an AI model and should not be used as a substitute for ' +
  'professional mental health evaluation. If you or someone you know is ' +
  'experiencing a mental health crisis in Bahrain, call 999 for emergency services ' +
  'or visit the Salmaniya Medical Complex Psychiatric Hospital emergency department.'

export const SHORT_DISCLAIMER =
  'Screening tool only — not a diagnostic instrument. If in crisis, call 999.'

// ── Date / Time Formatting ──────────────────────────────────────────────────

/**
 * Format a date as DD/MM/YYYY.
 * Accepts ISO string, Date, or timestamp number.
 */
export function formatDate(value: string | Date | number | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_CODE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(d)
}

/**
 * Format a date with time: DD/MM/YYYY HH:mm (24-hour).
 */
export function formatDateTime(value: string | Date | number | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_CODE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  }).format(d)
}

/**
 * Format a date with long month name: '12 April 2026'.
 */
export function formatDateLong(value: string | Date | number | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_CODE, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(d)
}

/**
 * Format a time only: HH:mm (24-hour, AST).
 */
export function formatTime(value: string | Date | number | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_CODE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  }).format(d)
}

/**
 * Format as relative time: "2 hours ago", "3 days ago", etc.
 */
export function formatRelative(value: string | Date | number | null | undefined): string {
  if (!value) return ''
  // Backend returns naive UTC datetimes — treat as UTC by appending 'Z' if no TZ info
  const d =
    value instanceof Date
      ? value
      : typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
        ? new Date(value + 'Z')
        : new Date(value)
  if (isNaN(d.getTime())) return ''

  const now = Date.now()
  const diff = now - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(d)
}

// ── Phone Number Formatting ─────────────────────────────────────────────────

/**
 * Normalize a Bahraini phone number to +973XXXXXXXX format.
 * Returns null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/[\s\-()]+/g, '').trim()

  let normalized: string
  if (digits.startsWith('+973')) {
    normalized = digits
  } else if (digits.startsWith('00973')) {
    normalized = '+' + digits.slice(2)
  } else if (digits.startsWith('973')) {
    normalized = '+' + digits
  } else if (/^\d{8}$/.test(digits)) {
    normalized = '+973' + digits
  } else {
    return null
  }

  return /^\+973\d{8}$/.test(normalized) ? normalized : null
}

/**
 * Format a Bahraini phone number for display: '+973 3XXX XXXX'.
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  if (!normalized) return phone
  const digits = normalized.slice(4)
  return `+973 ${digits.slice(0, 4)} ${digits.slice(4)}`
}

/**
 * Validate a Bahraini phone number (+973 + 8 digits, starts with 1/3/663/669).
 */
export function isValidBahrainPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  if (!normalized) return false
  const digits = normalized.slice(4)
  return /^(1\d{7}|3\d{7}|66[39]\d{5})$/.test(digits)
}

// ── CPR (Civil Personal Record) Validation ─────────────────────────────────

/**
 * Validate a Bahrain CPR (9 digits, format YYMMNNNNC).
 * Checks format, valid month, and plausible birth year.
 * Does NOT enforce check digit (minority of older CPRs don't follow the modern algorithm).
 */
export function isValidCPR(cpr: string): boolean {
  if (!cpr) return false
  const digits = cpr.replace(/[\s-]+/g, '').trim()
  if (!/^\d{9}$/.test(digits)) return false

  const yy = parseInt(digits.slice(0, 2), 10)
  const mm = parseInt(digits.slice(2, 4), 10)

  if (mm < 1 || mm > 12) return false

  const currentYY = new Date().getFullYear() % 100
  // Reject implausible near-future years
  if (yy > currentYY && yy < currentYY + 10) return false

  return true
}

/**
 * Format a CPR for display: '850423456' → '8504-2345-6'.
 */
export function formatCPRDisplay(cpr: string): string {
  const digits = cpr.replace(/[\s-]+/g, '').trim()
  if (digits.length !== 9 || !/^\d+$/.test(digits)) return cpr
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
}

/**
 * Extract [year (4-digit), month] from a CPR, inferring century.
 */
export function extractDobFromCPR(cpr: string): [number, number] | null {
  if (!isValidCPR(cpr)) return null
  const digits = cpr.replace(/[\s-]+/g, '').trim()
  const yy = parseInt(digits.slice(0, 2), 10)
  const mm = parseInt(digits.slice(2, 4), 10)

  const currentFull = new Date().getFullYear()
  const currentYY = currentFull % 100
  const century = yy > currentYY ? (Math.floor(currentFull / 100) - 1) * 100 : Math.floor(currentFull / 100) * 100
  return [century + yy, mm]
}

// ── Age Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate age in years from a date of birth.
 */
export function calculateAge(dob: string | Date): number {
  const d = dob instanceof Date ? dob : new Date(dob)
  if (isNaN(d.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--
  }
  return age
}

/**
 * Validate a date of birth — must produce an age between min and max.
 */
export function isValidDOB(dob: string | Date, minAge = 13, maxAge = 120): boolean {
  const age = calculateAge(dob)
  return age >= minAge && age <= maxAge
}
