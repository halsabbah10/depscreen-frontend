/**
 * Autocomplete — debounced async text input with suggestion dropdown.
 *
 * Used for clinical vocab lookups (RxNorm drug names, ICD-10 diagnoses)
 * via the terminology proxy endpoints. Still allows freeform entry if
 * no suggestion matches — important since no vocabulary has 100% coverage.
 */

import { useEffect, useRef, useState } from 'react'
import type { TerminologySuggestion } from '../../api/client'

interface AutocompleteProps {
  value: string
  onChange: (v: string) => void
  onPick?: (suggestion: TerminologySuggestion) => void
  fetcher: (q: string) => Promise<TerminologySuggestion[]>
  placeholder?: string
  minChars?: number
  debounceMs?: number
  className?: string
  id?: string
  'aria-label'?: string
  disabled?: boolean
}

export function Autocomplete({
  value,
  onChange,
  onPick,
  fetcher,
  placeholder,
  minChars = 2,
  debounceMs = 250,
  className = '',
  id,
  'aria-label': ariaLabel,
  disabled,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<TerminologySuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lastQueryRef = useRef<string>('')

  // Debounced fetch on value change
  useEffect(() => {
    const q = value.trim()
    if (q.length < minChars) {
      setSuggestions([])
      return
    }
    // Don't refetch if the user just picked an identical suggestion
    if (q === lastQueryRef.current) return

    const handle = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await fetcher(q)
        setSuggestions(results)
        setHighlight(0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(handle)
  }, [value, minChars, debounceMs, fetcher])

  // Click-outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const pick = (s: TerminologySuggestion) => {
    lastQueryRef.current = s.label
    onChange(s.label)
    onPick?.(s)
    setOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        autoComplete="off"
      />
      {open && (loading || suggestions.length > 0) && (
        <div
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1 card-warm max-h-64 overflow-y-auto shadow-xl"
        >
          {loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs font-body text-muted-foreground italic">Searching…</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={`${s.value}-${i}`}
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(s)}
                className={`w-full text-left px-3 py-2 text-sm font-body transition-colors border-b border-border last:border-0 ${
                  i === highlight ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="truncate">{s.label}</div>
                {s.value !== s.label && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.value}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
