import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils';
import { DepositsTable } from './DepositsTable';
import type { DepositInfo } from '../api';

const mockDeposits: DepositInfo[] = [
  {
    id: 1,
    user_address: '0x1234567890123456789012345678901234567890',
    deposit_address: '0xabcdef1234567890abcdef1234567890abcdef12',
    salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
    nonce: 1,
    status: 'pending',
    created_at: '2026-02-01T12:00:00Z',
  },
  {
    id: 2,
    user_address: '0x1234567890123456789012345678901234567890',
    deposit_address: '0xfedcba0987654321fedcba0987654321fedcba09',
    salt: '0x0000000000000000000000000000000000000000000000000000000000000002',
    nonce: 2,
    status: 'routed',
    created_at: '2026-02-01T12:05:00Z',
  },
];

describe('DepositsTable', () => {
  it('shows loading state', () => {
    render(<DepositsTable deposits={[]} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no deposits', () => {
    render(<DepositsTable deposits={[]} isLoading={false} />);

    expect(screen.getByText(/No deposits yet/)).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<DepositsTable deposits={mockDeposits} isLoading={false} />);

    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Deposit Address')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Link')).toBeInTheDocument();
  });

  it('renders deposit rows', () => {
    render(<DepositsTable deposits={mockDeposits} isLoading={false} />);

    // Check deposit IDs are rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders status badges for each deposit', () => {
    render(<DepositsTable deposits={mockDeposits} isLoading={false} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Routed')).toBeInTheDocument();
  });

  it('renders Etherscan links', () => {
    render(<DepositsTable deposits={mockDeposits} isLoading={false} />);

    const links = screen.getAllByText('View ↗');
    expect(links).toHaveLength(2);

    // Check first link points to correct address
    expect(links[0]).toHaveAttribute(
      'href',
      'https://sepolia.etherscan.io/address/0xabcdef1234567890abcdef1234567890abcdef12'
    );
  });

  it('truncates addresses correctly', () => {
    render(<DepositsTable deposits={mockDeposits} isLoading={false} />);

    // Should show truncated addresses (8 chars...6 chars)
    expect(screen.getByText('0xabcdef...cdef12')).toBeInTheDocument();
  });
});
