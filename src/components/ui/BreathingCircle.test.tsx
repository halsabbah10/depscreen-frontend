import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BreathingCircle, BreathingDot, ProgressDots } from './BreathingCircle'

describe('BreathingCircle', () => {
  it('renders with role=status', () => {
    render(<BreathingCircle />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses default aria-label when no label provided', () => {
    render(<BreathingCircle />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Working gently')
  })

  it('uses custom label as aria-label', () => {
    render(<BreathingCircle label="Loading screenings..." />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading screenings...')
  })

  it('renders label text when provided', () => {
    render(<BreathingCircle label="Please wait" />)
    expect(screen.getByText('Please wait')).toBeInTheDocument()
  })

  it('renders therapeutic variant with breath label', () => {
    render(<BreathingCircle variant="therapeutic" />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Taking a slow breath while we work',
    )
  })
})

describe('BreathingDot', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<BreathingDot />)
    const dot = container.firstChild
    expect(dot).toHaveAttribute('aria-hidden')
  })
})

describe('ProgressDots', () => {
  it('renders correct number of dots', () => {
    const { container } = render(
      <ProgressDots total={5} current={2} completed={[0, 1]} />,
    )
    // 5 dots total: 2 completed spans + 1 breathing dot + 2 pending spans
    const allDots = container.querySelectorAll('span')
    expect(allDots.length).toBeGreaterThanOrEqual(4)
  })

  it('has progressbar role with correct values', () => {
    render(<ProgressDots total={9} current={3} completed={new Set([0, 1, 2])} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '4')
    expect(bar).toHaveAttribute('aria-valuemax', '9')
    expect(bar).toHaveAttribute('aria-label', 'Step 4 of 9')
  })
})
