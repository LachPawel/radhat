import type { DepositStatus } from '../api';

interface StatusBadgeProps {
  status: DepositStatus;
}

const statusConfig: Record<DepositStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  funded: {
    label: 'Funded',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  deployed: {
    label: 'Deployed',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  routed: {
    label: 'Routed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
