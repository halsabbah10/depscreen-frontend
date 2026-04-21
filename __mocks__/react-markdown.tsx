// Root-level __mocks__/react-markdown.tsx
// Vitest (like Jest) automatically uses files in __mocks__/ adjacent to
// node_modules when you call vi.mock('react-markdown') in a test.
// This stub prevents the full unified/micromark ESM ecosystem from loading,
// which would OOM the test worker on machines with constrained per-process heap.
import React from 'react'

interface Props {
  children?: React.ReactNode
  [key: string]: unknown
}

export default function ReactMarkdown({ children }: Props) {
  return <div data-testid="markdown">{children}</div>
}
