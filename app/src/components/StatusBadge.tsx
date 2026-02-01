import type { DepositStatus } from '../api';

interface StatusBadgeProps {
  status: DepositStatus;
}

const statusConfig: Record<DepositStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  },
  funded: {
    label: 'Funded',
    className: 'bg-neutral-800 text-white border-neutral-600',
  },
  deployed: {
    label: 'Deployed',
    className: 'bg-neutral-700 text-white border-neutral-500',
  },
  routed: {
    label: 'Routed',
    className: 'bg-white text-black border-white',
  },
  failed: {
    label: 'Failed',
    className: 'bg-neutral-900 text-neutral-500 border-neutral-800 line-through',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
