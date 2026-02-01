<div align="center">
  <h1>RADHAT</h1>
  <p>
    <strong>Deterministic CREATE2 Deposit Proxy System on Sepolia</strong>
  </p>
  <p>
    <a href="https://github.com/LachPawel/radhat/actions/workflows/ci.yml">
      <img src="https://github.com/LachPawel/radhat/actions/workflows/ci.yml/badge.svg" alt="CI" />
    </a>
  </p>
  <p>
    <a href="#architecture">Architecture</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#development-journey">Development Journey</a>
    ·
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## Overview

RADHAT is a crypto payment infrastructure system that generates deterministic deposit addresses using CREATE2 opcodes. It enables businesses to create unique deposit addresses for each customer, monitor incoming payments, and automatically route funds to a treasury.

This project demonstrates the core mechanics behind payment processors like Radom, Coinbase Commerce, and BTCPay Server - where every customer gets a unique address, but funds flow to a single destination.

## Key Features

- **Deterministic Addresses**: Pre-compute deposit addresses before deployment using CREATE2
- **Minimal Proxy Pattern**: Gas-efficient EIP-1167 proxies that forward ETH to the FundRouter
- **Permission System**: Allowlist-based access control for callers and treasury addresses
- **Rust Backend**: High-performance API for address generation and fund routing
- **Real-time Monitoring**: Track deposit status and balances across all generated addresses

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│              Table: Address | Status | Balance | Actions         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Rust Backend (Axum)                         │
│                  POST /deposit    POST /router                   │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   CREATE2   │    │   SQLite    │    │   alloy     │        │
│   │  Compute    │    │   Storage   │    │    RPC      │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sepolia Blockchain                            │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐│
│  │   Customer   │──▶│    Proxy     │──▶│     FundRouter       ││
│  │  sends ETH   │   │  (EIP-1167)  │   │                      ││
│  └──────────────┘   └──────────────┘   │  ┌────────────────┐  ││
│                                        │  │ FundRouter     │  ││
│                            ┌───────────│  │ Storage        │  ││
│                            │           │  │ (permissions)  │  ││
│                            ▼           │  └────────────────┘  ││
│                     ┌──────────────┐   └──────────────────────┘│
│                     │   Treasury   │                            │
│                     └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Generate**: Backend computes deterministic address using CREATE2 formula
2. **Share**: Customer receives unique deposit address
3. **Deposit**: Customer sends ETH to the address
4. **Monitor**: System detects incoming funds
5. **Deploy**: Minimal proxy is deployed at the pre-computed address
6. **Route**: Proxy forwards ETH through FundRouter to treasury

### CREATE2 Formula

```
address = keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code))[12..]
```

This allows computing the address **before** deployment - the address is deterministic based on the deployer, salt, and bytecode.

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20, Hardhat 2, ethers.js, EIP-1167 Minimal Proxy
- **Backend**: Rust, Axum, SQLx, alloy (deployed on Railway)
- **Frontend**: React, Vite, TypeScript, TailwindCSS, wagmi (deployed on Netlify)
- **Blockchain**: Ethereum Sepolia Testnet

## Project Structure

```
.
├── contracts/
│   ├── IFundRouter.sol              # Interface for fund routing
│   ├── FundRouterStorage.sol        # Permission storage (bitmask)
│   ├── FundRouter.sol               # Main router with permission checks
│   ├── DeterministicProxyDeployer.sol # CREATE2 proxy deployer
│   └── test/
│       └── MockERC20.sol            # Test token (OpenZeppelin)
├── test/
│   ├── FundRouterStorage.test.ts    # 30 permission tests
│   ├── FundRouter.test.ts           # 15 routing tests
│   └── DeterministicProxyDeployer.test.ts # 16 proxy tests
├── rust-backend/                    # Rust API server (Chapter 4)
├── app/                             # React/Next.js frontend (Chapter 6)
├── scripts/                         # Deployment scripts (Chapter 3)
├── hardhat.config.ts                # Hardhat 2 configuration
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies & scripts
└── .env.example                     # Environment template
```

## Development Journey (Chapters)

This repository is structured as a series of PRs, each representing a chapter in the development story. Each chapter introduces new concepts, challenges, and solutions.

### Chapter 0: The Beginning - Project Scaffold ✅
- [x] Initialize repository with pnpm
- [x] Set up folder structure (`contracts/`, `rust-backend/`, `app/`, `scripts/`, `test/`)
- [x] Configure Hardhat 2 with ethers.js and Solidity 0.8.20
- [x] Create `.env.example` with required variables
- [x] Add TypeScript support

### Chapter 1: The Contracts - Solidity Skeletons ✅
- [x] Add `IFundRouter.sol` - interface for `transferFunds()`
- [x] Add `FundRouterStorage.sol` - permission bitmask storage (ready)
- [x] Add `FundRouter.sol` - main router with 3 TODOs
- [x] Add `DeterministicProxyDeployer.sol` - CREATE2 deployer with 1 TODO
- [x] Verify contracts compile with Hardhat 2
- [x] Add unit tests for `FundRouterStorage` (30 tests passing)

### Chapter 2: The Proxy - Implementing EIP-1167 ✅
- [x] Implement `_proxyInitCode()` with custom CALL-based forwarding proxy (38-byte runtime)
- [x] Implement combined `_checkPermissions()` using `isAllowedCallerAndTreasury()` for gas efficiency
- [x] Add ERC20 transfer logic with proper error handling
- [x] Add unit tests for `FundRouter` (15 tests)
- [x] Add unit tests for `DeterministicProxyDeployer` (16 tests)
- [x] Full E2E test: deposit → forward → route to treasury

### Chapter 3: The Deployment - Sepolia Launch ✅
- [x] Create deployment script following the required flow
- [x] Deploy to Sepolia and save addresses to `deployments.json`
- [x] Add verification step to confirm permissions are set correctly

### Chapter 4: The Backend - Rust Foundation ✅
- [x] Set up Axum server with CORS
- [x] Implement CREATE2 address computation matching Solidity (6 tests)
- [x] Create SQLite schema for deposit addresses with nonce tracking
- [x] Build `/deposit` endpoint for address generation
- [x] Add `/health` endpoint for Railway deployment
- [x] Add `sync-deployments.sh` script to sync contract addresses

### Chapter 5: The Router - Fund Routing Logic ✅
- [x] Implement `/router` endpoint with full workflow
- [x] Add balance checking via RPC (Alloy)
- [x] Deploy proxies for funded addresses (`deployMultiple()`)
- [x] Route ETH to treasury (`transferFunds()`)
- [x] Track status: pending → funded → deployed → routed (or failed)

### Chapter 6: The Interface - React Dashboard ✅
- [x] Create Vite + React + TypeScript frontend with TailwindCSS
- [x] Add wallet connect with wagmi (MetaMask, WalletConnect)
- [x] Create minimal frontend with deposit table
- [x] Add "Generate Deposit Address" button (uses connected wallet)
- [x] Add "Route Funds to Treasury" button
- [x] Implement periodic balance polling (15s auto-refresh)
- [x] Configure ESLint, Prettier, TypeScript strict mode
- [x] Add Netlify deployment configuration

### Chapter 7: The Polish - Integration & Documentation ✅
- [x] Set up git hooks with husky + lint-staged
- [x] Redesign UI with minimalistic black/white/gray theme
- [x] Create RADHAT favicon (R logo on black background)
- [x] Clean up folder structure (remove .gitkeep files)
- [x] Add root package.json scripts for linting/testing
- [x] Update all component tests (24 passing)

## API Endpoints (Planned)

> *These endpoints will be implemented in Chapters 4-5*

### POST /deposit

Generate next deterministic deposit address.

**Request:**
```json
{ "user": "0xUserAddress" }
```

**Response:**
```json
{
  "deposit_address": "0xABC...",
  "salt": "0x123...",
  "note": "Send Sepolia ETH to this address."
}
```

### POST /router

Route all funded deposit addresses to treasury.

**Response:**
```json
{
  "checked": 12,
  "funded": 5,
  "deployed": 5,
  "routed": 3,
  "deploy_tx_hash": "0x...",
  "route_tx_hashes": [
    {
      "proxy_address": "0x...",
      "tx_hash": "0x...",
      "amount_wei": "1000000000000000"
    }
  ],
  "errors": []
}
```

**Status Flow:**
```
pending → funded → deployed → routed
                           ↘ failed
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust 1.80+ (for backend, Chapter 4+)
- Sepolia RPC URL (Infura/Alchemy)
- Funded Sepolia wallet

### Setup

```bash
# Clone and install
git clone https://github.com/LachPawel/radhat.git
cd radhat
pnpm install

# Configure environment
cp .env.example .env
cp rust-backend/.env.example rust-backend/.env
# Edit both files with your keys

# Sync contract addresses to rust-backend/.env
./scripts/sync-deployments.sh sepolia

# Compile contracts
pnpm compile

# Deploy to Sepolia (if needed)
pnpm deploy:sepolia
```

### Running

```bash
# Terminal 1: Rust backend
cd rust-backend
cargo run

# Terminal 2: Frontend (Chapter 6)
pnpm frontend
```

### Private Key Security

⚠️ The `PRIVATE_KEY` environment variable is used for signing transactions in Chapter 5+.

**For development/testing:**
- Use a dedicated testnet wallet with only Sepolia ETH
- Never reuse keys from mainnet or other important wallets

**For production:**
- Use a hardware wallet integration
- Use AWS KMS, GCP KMS, or HashiCorp Vault
- Consider a transaction signing service (e.g., Fireblocks, Fordefi)

### Running

```bash
# Terminal 1: Rust backend
pnpm rust:run

# Terminal 2: Frontend
pnpm frontend
```

### Testing Flow

1. Start the backend: `cd rust-backend && cargo run`
2. Call `POST /deposit` → receive deposit address
3. Send 0.001 ETH to address on Sepolia
4. Call `POST /router` → proxies deploy, funds route to treasury
5. Check status changes: pending → funded → deployed → routed

## TODOs Implemented

> *Completed in Chapter 2*

| File | Function | Implementation |
|------|----------|----------------|
| `DeterministicProxyDeployer.sol` | `_proxyInitCode()` | Custom CALL-based proxy (38-byte runtime) that forwards ETH to FundRouter |
| `FundRouter.sol` | `_checkPermissions()` | Combined `staticcall` to `isAllowedCallerAndTreasury()` for gas efficiency |
| `FundRouter.sol` | ERC20 transfer | `IERC20(token).transfer(treasuryAddress, amt)` with `ERC20TransferFailed` error |

## Assumptions

- ETH and ERC20 routing supported
- Single treasury address per deployment
- SQLite for simplicity (Postgres-ready schema)
- Proxies deploy lazily on first route, not on fund detection
- CALL-based proxy (not DELEGATECALL) so ETH lands in FundRouter

## Deployed Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| FundRouterStorage | [`0x66C686Bc2DD44078f44B5E78b5106cFE16fC35f2`](https://sepolia.etherscan.io/address/0x66C686Bc2DD44078f44B5E78b5106cFE16fC35f2) |
| FundRouter | [`0x7238CA877BbAcC8C273C701636A2041F6569f266`](https://sepolia.etherscan.io/address/0x7238CA877BbAcC8C273C701636A2041F6569f266) |
| DeterministicProxyDeployer | [`0x2b05DAf67cc41957f60F74Ff7D3c4aB54840Fc8D`](https://sepolia.etherscan.io/address/0x2b05DAf67cc41957f60F74Ff7D3c4aB54840Fc8D) |

**Init Code Hash**: `0x53610d10df2dbe6319490ceeb6b7252926cc1e0cea27682301027672215b2db1`

*See `deployments.json` for full details*

## Live API

The Rust backend is deployed on Railway:

🌐 **https://radhat-production.up.railway.app**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check & version info |
| `/deposit` | POST | Generate next deposit address |
| `/deposits` | GET | List all deposits |
| `/deposits/{address}` | GET | Get specific deposit details |
| `/router` | POST | Deploy proxies & route funds to treasury |

**Example:**
```bash
# Health check
curl https://radhat-production.up.railway.app/health

# Create deposit address
curl -X POST https://radhat-production.up.railway.app/deposit \
  -H "Content-Type: application/json" \
  -d '{"user": "0xYourAddress"}'

# List deposits
curl https://radhat-production.up.railway.app/deposits

# Route funds
curl -X POST https://radhat-production.up.railway.app/router
```