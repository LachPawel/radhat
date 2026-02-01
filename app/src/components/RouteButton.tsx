import { useState } from 'react';
import { api, type RouteResponse } from '../api';

interface RouteButtonProps {
  onSuccess: () => void;
}

export function RouteButton({ onSuccess }: RouteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoute = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.routeDeposits();
      setResult(response);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to route deposits');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleRoute}
        disabled={isLoading}
        className="px-6 py-3 border border-neutral-600 hover:border-white hover:text-white text-neutral-300 disabled:border-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
      >
        {isLoading ? 'Routing...' : 'Route All Funds to Treasury'}
      </button>

      {error && (
        <div className="p-4 border border-neutral-700 rounded bg-neutral-900">
          <p className="text-neutral-400 text-sm">⚠ {error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 border border-neutral-700 rounded bg-neutral-900 space-y-4">
          <p className="text-white font-medium">Routing complete</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Checked</p>
              <p className="text-2xl font-bold text-neutral-400">{result.checked}</p>
            </div>
            <div>
              <p className="text-neutral-500">Funded</p>
              <p className="text-2xl font-bold text-neutral-300">{result.funded}</p>
            </div>
            <div>
              <p className="text-neutral-500">Deployed</p>
              <p className="text-2xl font-bold text-neutral-200">{result.deployed}</p>
            </div>
            <div>
              <p className="text-neutral-500">Routed</p>
              <p className="text-2xl font-bold text-white">{result.routed}</p>
            </div>
          </div>

          {result.deploy_tx_hash && (
            <p className="text-sm text-neutral-500">
              Deploy TX:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.deploy_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {result.deploy_tx_hash.slice(0, 16)}...
              </a>
            </p>
          )}

          {result.route_tx_hashes.length > 0 && (
            <div className="text-sm text-neutral-500">
              <p>Route TXs:</p>
              <ul className="list-disc list-inside">
                {result.route_tx_hashes.map((tx, i) => (
                  <li key={i}>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      {tx.tx_hash.slice(0, 16)}...
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="text-sm text-neutral-400">
              <p>Errors:</p>
              <ul className="list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
