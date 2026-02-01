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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-20">
          <div className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-400 mb-6">
            CRYPTO PAYMENTS
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tight mb-6 max-w-3xl">
            All in one platform,
            <br />
            built for scale.
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mb-10 leading-relaxed">
            Generate deterministic deposit addresses using CREATE2. Minimal proxies ensure funds
            flow securely to your treasury on Sepolia, reducing gas costs and simplifying
            operations.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 max-w-md">
              <CreateDepositButton onSuccess={fetchDeposits} />
            </div>
            <div className="flex-1 max-w-md">
              <RouteButton onSuccess={fetchDeposits} />
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h3 className="text-white font-semibold mb-2">Generate Address</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Connect your wallet and generate a unique, deterministic deposit address for your
              user.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h3 className="text-white font-semibold mb-2">Receive Funds</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Users send Sepolia ETH to the address. The system automatically detects incoming
              deposits.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h3 className="text-white font-semibold mb-2">Optimized Routing</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Batch process deposits to deploy proxies and forward funds to treasury in one go.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h3 className="text-white font-semibold mb-2">Full Visibility</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Real-time monitoring of all deposit addresses, balances, and deployment status.
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
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

        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-700">
            Network: Sepolia Testnet • Auto-refresh every 15 seconds
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
