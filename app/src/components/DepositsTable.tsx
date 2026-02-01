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
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading deposits...</div>
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No deposits yet. Generate your first deposit address!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Deposit Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Etherscan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {deposits.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{deposit.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm text-purple-400 bg-gray-900 px-2 py-1 rounded">
                    {truncateAddress(deposit.deposit_address)}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm text-gray-400">
                    {truncateAddress(deposit.user_address)}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={deposit.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {formatDate(deposit.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={`https://sepolia.etherscan.io/address/${deposit.deposit_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
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
