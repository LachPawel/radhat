import type { DepositInfo } from '../api';
import { StatusBadge } from './StatusBadge';

interface DepositsTableProps {
  deposits: DepositInfo[];
  isLoading: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function DepositsTable({ deposits, isLoading }: DepositsTableProps) {
  if (isLoading) {
    return (
      <div className="border border-neutral-800 rounded-lg p-12 text-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-lg p-12 text-center">
        <p className="text-neutral-500">No deposits yet</p>
        <p className="text-neutral-600 text-sm mt-1">Generate your first deposit address</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Deposit Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Link
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {deposits.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-neutral-900/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-400 font-mono">
                  {deposit.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="text-sm text-white font-mono">
                    {truncateAddress(deposit.deposit_address)}
                  </code>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="text-sm text-neutral-500 font-mono">
                    {truncateAddress(deposit.user_address)}
                  </code>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={deposit.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                  {formatDate(deposit.created_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a
                    href={`https://sepolia.etherscan.io/address/${deposit.deposit_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    View ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
