import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders pending status', () => {
    render(<StatusBadge status="pending" />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders funded status', () => {
    render(<StatusBadge status="funded" />);

    expect(screen.getByText('Funded')).toBeInTheDocument();
  });

  it('renders deployed status', () => {
    render(<StatusBadge status="deployed" />);

    expect(screen.getByText('Deployed')).toBeInTheDocument();
  });

  it('renders routed status', () => {
    render(<StatusBadge status="routed" />);

    expect(screen.getByText('Routed')).toBeInTheDocument();
  });

  it('renders failed status', () => {
    render(<StatusBadge status="failed" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('applies correct styling for pending status', () => {
    render(<StatusBadge status="pending" />);

    const badge = screen.getByText('Pending');
    expect(badge).toHaveClass('text-neutral-400');
  });

  it('applies correct styling for routed status (inverted)', () => {
    render(<StatusBadge status="routed" />);

    const badge = screen.getByText('Routed');
    expect(badge).toHaveClass('bg-white', 'text-black');
  });

  it('applies correct styling for failed status', () => {
    render(<StatusBadge status="failed" />);

    const badge = screen.getByText('Failed');
    expect(badge).toHaveClass('text-neutral-500', 'line-through');
  });
});
