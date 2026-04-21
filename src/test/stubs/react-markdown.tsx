// Stub for react-markdown. Avoids loading the large ESM dependency graph in
// jsdom test environments, which exhausts the V8 heap during transform.
import React from 'react'

interface ReactMarkdownProps {
  children?: React.ReactNode
  [key: string]: unknown
}

export default function ReactMarkdown({ children }: ReactMarkdownProps) {
  return <div data-testid="markdown">{children}</div>
}
