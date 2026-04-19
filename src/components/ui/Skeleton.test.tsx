import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton, SkeletonCard, SkeletonText, SkeletonStat } from './Skeleton'

describe('Skeleton', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    expect(container.firstChild).toHaveClass('h-4', 'w-32')
  })

  it('applies skeleton base class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('skeleton')
  })
})

describe('SkeletonCard', () => {
  it('renders a card shape with aria-hidden', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('contains multiple skeleton bars', () => {
    const { container } = render(<SkeletonCard />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })
})

describe('SkeletonText', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('renders custom line count', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(5)
  })

  it('last line is shorter', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const skeletons = container.querySelectorAll('.skeleton')
    const last = skeletons[skeletons.length - 1]
    expect(last).toHaveClass('w-3/5')
  })
})

describe('SkeletonStat', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<SkeletonStat />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
