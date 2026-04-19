import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No patients" />)
    expect(screen.getByText('No patients')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here yet." />)
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('omits description paragraph when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders action slot', () => {
    render(<EmptyState title="Empty" action={<button>Add one</button>} />)
    expect(screen.getByRole('button', { name: 'Add one' })).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">🔍</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="my-custom" />)
    expect(container.firstChild).toHaveClass('my-custom')
  })
})
