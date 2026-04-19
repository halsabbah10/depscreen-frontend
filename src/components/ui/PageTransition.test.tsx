import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageTransition, StaggerChildren, StaggerItem } from './PageTransition'

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <p>Hello world</p>
      </PageTransition>,
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PageTransition className="my-page">
        <p>Content</p>
      </PageTransition>,
    )
    expect(container.firstChild).toHaveClass('my-page')
  })
})

describe('StaggerChildren + StaggerItem', () => {
  it('renders staggered items', () => {
    render(
      <StaggerChildren>
        <StaggerItem><p>Item 1</p></StaggerItem>
        <StaggerItem><p>Item 2</p></StaggerItem>
        <StaggerItem><p>Item 3</p></StaggerItem>
      </StaggerChildren>,
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })
})
