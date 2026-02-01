import { useState } from 'react';
import { useAccount } from 'wagmi';
import { api, type CreateDepositResponse } from '../api';

interface CreateDepositButtonProps {
  onSuccess: () => void;
}

export function CreateDepositButton({ onSuccess }: CreateDepositButtonProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateDepositResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.createDeposit({ user: address });
      setResult(response);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deposit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCreate}
        disabled={!isConnected || isLoading}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate Deposit Address'}
      </button>

      {!isConnected && (
        <p className="text-sm text-gray-400">Connect your wallet to generate a deposit address</p>
      )}

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg space-y-2">
          <p className="text-green-400 font-medium">✓ Deposit address created!</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">
              <span className="text-gray-500">Address:</span>{' '}
              <code className="text-purple-400">{result.deposit_address}</code>
            </p>
            <p className="text-gray-400">{result.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
