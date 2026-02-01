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
        className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {isLoading ? 'Routing...' : 'Route All Funds to Treasury'}
      </button>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg space-y-2">
          <p className="text-blue-400 font-medium">Routing complete!</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Checked</p>
              <p className="text-xl font-bold text-gray-200">{result.checked}</p>
            </div>
            <div>
              <p className="text-gray-500">Funded</p>
              <p className="text-xl font-bold text-blue-400">{result.funded}</p>
            </div>
            <div>
              <p className="text-gray-500">Deployed</p>
              <p className="text-xl font-bold text-purple-400">{result.deployed}</p>
            </div>
            <div>
              <p className="text-gray-500">Routed</p>
              <p className="text-xl font-bold text-green-400">{result.routed}</p>
            </div>
          </div>

          {result.deploy_tx_hash && (
            <p className="text-sm text-gray-400">
              Deploy TX:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.deploy_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {result.deploy_tx_hash.slice(0, 16)}...
              </a>
            </p>
          )}

          {result.route_tx_hashes.length > 0 && (
            <div className="text-sm text-gray-400">
              <p>Route TXs:</p>
              <ul className="list-disc list-inside">
                {result.route_tx_hashes.map((tx, i) => (
                  <li key={i}>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {tx.tx_hash.slice(0, 16)}...
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="text-sm text-red-400">
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
