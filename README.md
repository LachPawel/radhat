<div align="center">
  <h1>RADHAT</h1>
  <p>
    <strong>Deterministic CREATE2 Deposit Proxy System</strong>
  </p>
</div>

---

## Overview

RADHAT is a crypto payment infrastructure system that generates deterministic deposit addresses using CREATE2 opcodes. It enables businesses to create unique deposit addresses for each customer, monitor incoming payments, and automatically route funds to a treasury.

## Planned Features

- **Deterministic Addresses**: Pre-compute deposit addresses before deployment using CREATE2
- **Minimal Proxy Pattern**: Gas-efficient EIP-1167 proxies that forward ETH to the FundRouter
- **Permission System**: Allowlist-based access control for callers and treasury addresses
- **Rust Backend**: High-performance API for address generation and fund routing
- **Real-time Monitoring**: Track deposit status and balances across all generated addresses

## Getting Started

```bash
git clone https://github.com/LachPawel/radhat.git
cd radhat
pnpm install
```

## Development Roadmap

- [ ] Project scaffold & initial setup
- [ ] Smart contracts (FundRouter, DeterministicProxyDeployer)
- [ ] Rust backend API
- [ ] Frontend dashboard
- [ ] Sepolia deployment & testing

## License

MIT