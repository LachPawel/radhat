<div align="center">
  <h1>RADHAT</h1>
  <p>
    <strong>Deterministic CREATE2 Deposit Proxy System on Sepolia</strong>
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

- **Smart Contracts**: Solidity 0.8.28, Hardhat 3, Viem, EIP-1167 Minimal Proxy
- **Backend**: Rust, Axum, SQLx, alloy
- **Frontend**: React/Next.js, TypeScript, TailwindCSS
- **Blockchain**: Ethereum Sepolia Testnet

## Project Structure

```
.
├── contracts/                    # Solidity smart contracts (Chapter 1)
├── rust-backend/                 # Rust API server (Chapter 4)
├── app/                          # React/Next.js frontend (Chapter 6)
├── scripts/                      # Deployment scripts (Chapter 3)
├── test/                         # Contract tests (Chapter 2)
├── hardhat.config.ts             # Hardhat 3 configuration
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies & scripts
└── .env.example                  # Environment template
```

## Development Journey (Chapters)

This repository is structured as a series of PRs, each representing a chapter in the development story. Each chapter introduces new concepts, challenges, and solutions.

### Chapter 0: The Beginning - Project Scaffold ✅
- [x] Initialize repository with pnpm
- [x] Set up folder structure (`contracts/`, `rust-backend/`, `app/`, `scripts/`, `test/`)
- [x] Configure Hardhat 3 with Viem and Solidity 0.8.28
- [x] Create `.env.example` with required variables
- [x] Add TypeScript and ESM support

### Chapter 1: The Contracts - Solidity Skeletons
- [ ] Add contract skeletons with TODOs from assignment
- [ ] Verify contracts compile with Hardhat 3

### Chapter 2: The Proxy - Implementing EIP-1167
- [ ] Implement `_proxyInitCode()` with minimal proxy bytecode
- [ ] Complete `_isAllowedCaller()` and `_isAllowedTreasury()` storage checks
- [ ] Add ERC20 transfer logic
- [ ] Write unit tests for contracts

### Chapter 3: The Deployment - Sepolia Launch
- [ ] Create deployment script following the required flow
- [ ] Deploy to Sepolia and save addresses to `deployments.json`

### Chapter 4: The Backend - Rust Foundation
- [ ] Set up Axum server with CORS
- [ ] Implement CREATE2 address computation matching Solidity
- [ ] Create SQLite schema for deposit addresses
- [ ] Build `/deposit` endpoint for address generation

### Chapter 5: The Router - Fund Routing Logic
- [ ] Implement `/router` endpoint
- [ ] Add balance checking via RPC
- [ ] Deploy proxies for funded addresses
- [ ] Route ETH to treasury

### Chapter 6: The Interface - React Dashboard
- [ ] Create minimal frontend with deposit table
- [ ] Add "Get Next Deposit Address" button
- [ ] Add "Route Funds to Treasury" button
- [ ] Implement periodic balance polling

### Chapter 7: The Polish - Integration & Documentation
- [ ] End-to-end testing on Sepolia
- [ ] Add screenshots/GIF of complete flow
- [ ] Document all TODO implementations
- [ ] Final README with assumptions and run instructions

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
  "routed": 3,
  "tx_hashes": ["0x...", "0x..."]
}
```

## Getting Started

### Prerequisites

- Node.js 22+ (required for Hardhat 3)
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

# Compile contracts
pnpm compile

# Deploy to Sepolia
pnpm deploy:sepolia
```

### Running

```bash
# Terminal 1: Rust backend
pnpm rust:run

# Terminal 2: Frontend
pnpm frontend
```

### Testing Flow

1. Call `POST /deposit` → receive deposit address
2. Send 0.001 ETH to address on Sepolia
3. Watch status change to "Funded"
4. Call `POST /router` → verify treasury receives ETH

## TODOs to Implement

> *Will be completed in Chapter 2*

| File | Function | Status |
|------|----------|--------|
| `DeterministicProxyDeployer.sol` | `_proxyInitCode()` | ⏳ Pending |
| `FundRouter.sol` | `_isAllowedCaller()` | ⏳ Pending |
| `FundRouter.sol` | `_isAllowedTreasury()` | ⏳ Pending |
| `FundRouter.sol` | ERC20 transfer | ⏳ Pending |

## Assumptions

- ETH-only routing (ERC20 as stretch goal)
- Single treasury address per deployment
- SQLite for simplicity (Postgres-ready schema)
- Proxies deploy lazily on first route, not on fund detection

## Deployed Addresses (Sepolia)

> *Will be populated after Chapter 3*

| Contract | Address |
|----------|---------|
| FundRouterStorage | `0x...` |
| FundRouter | `0x...` |
| DeterministicProxyDeployer | `0x...` |

*See `deployments.json` for full details*