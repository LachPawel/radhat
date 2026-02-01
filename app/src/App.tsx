import { useEffect, useState, useCallback } from 'react';
import { api, type DepositInfo } from './api';
import { ConnectWallet, DepositsTable, CreateDepositButton, RouteButton } from './components';
import MinimalLayout from './components/ui/MinimalHero';

const POLL_INTERVAL = 15000; // 15 seconds

export default function App() {
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
    <MinimalLayout
      headerRight={<ConnectWallet />}
      heroContent={
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur px-3 py-1 text-xs font-medium text-neutral-400 mb-6">
            CREATE2 INFRASTRUCTURE
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tight mb-8">
            Deterministic deposits,
            <br />
            optimized for gas.
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate infinite unique deposit addresses off-chain. Deploy minimal proxies only when
            funds arrive, and batch route everything to your treasury in a single transaction.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 max-w-md mx-auto w-full">
            <div className="flex-1">
              <CreateDepositButton onSuccess={fetchDeposits} />
            </div>
            <div className="flex-1">
              <RouteButton onSuccess={fetchDeposits} />
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* Feature Cards - now in grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 -mt-10 relative z-20">
          <div className="p-6 rounded-2xl bg-neutral-900/50 backdrop-blur border border-neutral-800 hover:border-neutral-700 transition-colors">
            <h3 className="text-white font-semibold mb-2">Off-Chain Generation</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Compute deterministic addresses instantly using CREATE2. No gas costs until the
              address is actually used.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900/50 backdrop-blur border border-neutral-800 hover:border-neutral-700 transition-colors">
            <h3 className="text-white font-semibold mb-2">Non-Custodial Flow</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Funds flow through EIP-1167 minimal proxies directly to your treasury. No intermediate
              hot wallets.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900/50 backdrop-blur border border-neutral-800 hover:border-neutral-700 transition-colors">
            <h3 className="text-white font-semibold mb-2">Batch Routing</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Consolidate funds from thousands of deposit addresses into a secure cold storage with
              optimized calldata.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900/50 backdrop-blur border border-neutral-800 hover:border-neutral-700 transition-colors">
            <h3 className="text-white font-semibold mb-2">Real-time Indexing</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Track pending, funded, and routed states for every user address automatically via the
              Rust backend.
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

        <div className="mt-8 text-center pb-20">
          <p className="text-xs text-neutral-700">
            Network: Sepolia Testnet • Auto-refresh every 15 seconds
          </p>
        </div>
      </div>
    </MinimalLayout>
  );
}
