import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary-600')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-100')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-secondary-300')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-secondary-100')

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-primary-600')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="xs">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-7')

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8')

    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-12')

    rerender(<Button size="xl">Extra Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-14')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
    expect(screen.getByRole('button')).toHaveTextContent('Loading')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with icons', () => {
    const TestIcon = () => <span data-testid="icon">🔍</span>
    
    render(<Button leftIcon={<TestIcon />}>With Left Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    
    render(<Button rightIcon={<TestIcon />}>With Right Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('renders as full width', () => {
    render(<Button fullWidth>Full Width</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})