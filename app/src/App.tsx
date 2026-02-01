import { useEffect, useState, useCallback } from 'react';
import { api, type DepositInfo } from './api';
import { ConnectWallet, DepositsTable, CreateDepositButton, RouteButton } from './components';

const POLL_INTERVAL = 15000; // 15 seconds

function App() {
  const [deposits, setDeposits] = useState<DepositInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDeposits = useCallback(async () => {
    try {
      const response = await api.listDeposits();
      setDeposits(response.deposits);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch deposits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchDeposits();

    const interval = setInterval(fetchDeposits, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDeposits]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">RADHAT</h1>
              <span className="text-sm text-neutral-600">CREATE2 Deposits</span>
            </div>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <CreateDepositButton onSuccess={fetchDeposits} />
          <RouteButton onSuccess={fetchDeposits} />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Deposits ({deposits.length})
          </h2>
          {lastUpdated && (
            <span className="text-xs text-neutral-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Deposits Table */}
        <DepositsTable deposits={deposits} isLoading={isLoading} />

        {/* Info Footer */}
        <div className="mt-8 p-4 border border-neutral-800 rounded-lg">
          <h3 className="font-medium text-neutral-300 mb-2 text-sm">How it works</h3>
          <ol className="list-decimal list-inside text-sm text-neutral-500 space-y-1">
            <li>Connect your wallet and click "Generate Deposit Address"</li>
            <li>Send Sepolia ETH to the generated address</li>
            <li>Click "Route All Funds to Treasury" to deploy proxies and transfer funds</li>
            <li>Watch the status change: pending → funded → deployed → routed</li>
          </ol>
          <p className="mt-3 text-xs text-neutral-700">
            Network: Sepolia Testnet • Auto-refresh every 15 seconds
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
