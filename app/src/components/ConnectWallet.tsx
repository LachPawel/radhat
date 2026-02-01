import { useConnect, useAccount, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-1.5 text-xs font-medium border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Prioritize Injected (browser wallet) or fall back to the first available connector
  const connector = connectors.find((c) => c.type === 'injected') || connectors[0];

  if (!connector) return null;

  return (
    <button
      onClick={() => connect({ connector })}
      disabled={isPending}
      className="px-5 py-2 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-full text-sm font-bold tracking-wide transition-colors"
    >
      {isPending ? 'CONNECTING...' : 'CONNECT WALLET'}
    </button>
  );
}
