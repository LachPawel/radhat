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
        className="w-full px-6 py-4 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-full font-bold text-sm tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:shadow-none"
      >
        {isLoading ? 'GENERATING...' : 'GENERATE DEPOSIT ADDRESS'}
      </button>

      {!isConnected && (
        <p className="text-sm text-neutral-500">
          Connect your wallet to generate a deposit address
        </p>
      )}

      {error && (
        <div className="p-4 border border-neutral-700 rounded bg-neutral-900">
          <p className="text-neutral-400 text-sm">⚠ {error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 border border-neutral-700 rounded bg-neutral-900 space-y-2">
          <p className="text-white font-medium">✓ Deposit address created</p>
          <div className="space-y-1 text-sm">
            <p className="text-neutral-300">
              <span className="text-neutral-500">Address:</span>{' '}
              <code className="text-white font-mono">{result.deposit_address}</code>
            </p>
            <p className="text-neutral-500">{result.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
