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
│   │   CREATE2   │    │   SQLite    │    │  ethers-rs  │        │
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

- **Smart Contracts**: Solidity 0.8.20, Hardhat, EIP-1167 Minimal Proxy
- **Backend**: Rust, Axum, SQLx, alloy/ethers-rs
- **Frontend**: React/Next.js, TypeScript, TailwindCSS
- **Blockchain**: Ethereum Sepolia Testnet

## Project Structure

```
.
├── contracts/                    # Solidity smart contracts
│   ├── DeterministicProxyDeployer.sol
│   ├── FundRouter.sol
│   ├── FundRouterStorage.sol
│   └── IFundRouter.sol
├── rust-backend/                 # Rust API server
│   ├── src/
│   │   ├── main.rs              # Axum server
│   │   ├── routes.rs            # /deposit, /router endpoints
│   │   ├── create2.rs           # CREATE2 computation
│   │   ├── db.rs                # SQLite storage
│   │   └── bin/
│   │       ├── precompute.rs    # CLI: compute address from salt
│   │       └── deploy_contracts.rs
│   └── Cargo.toml
├── app/                          # React/Next.js frontend
├── scripts/
│   └── deploy.ts                # Hardhat deployment script
├── hardhat.config.ts
└── README.md
```

## Development Journey (Chapters)

This repository is structured as a series of PRs, each representing a chapter in the development story. Each chapter introduces new concepts, challenges, and solutions.

### Chapter 0: The Beginning - Project Scaffold
- Initialize empty repository
- Set up basic folder structure
- Configure package.json and git

### Chapter 1: The Contracts - Solidity Skeletons
- Add Hardhat configuration
- Copy contract skeletons with TODOs from assignment
- Set up TypeScript and dependencies
- Create `.env.example` with required variables

### Chapter 2: The Proxy - Implementing EIP-1167
- Implement `_proxyInitCode()` with minimal proxy bytecode
- Complete `_isAllowedCaller()` and `_isAllowedTreasury()` storage checks
- Add ERC20 transfer logic
- Write unit tests for contracts

### Chapter 3: The Deployment - Sepolia Launch
- Create deployment script following the required flow:
  1. Deploy FundRouterStorage
  2. Set permissions (caller: 0x01, treasury: 0x02)
  3. Deploy FundRouter
  4. Deploy DeterministicProxyDeployer
- Deploy to Sepolia and save addresses to `deployments.json`

### Chapter 4: The Backend - Rust Foundation
- Set up Axum server with CORS
- Implement CREATE2 address computation matching Solidity
- Create SQLite schema for deposit addresses
- Build `/deposit` endpoint for address generation

### Chapter 5: The Router - Fund Routing Logic
- Implement `/router` endpoint
- Add balance checking via RPC
- Deploy proxies for funded addresses
- Route ETH to treasury

### Chapter 6: The Interface - React Dashboard
- Create minimal frontend with deposit table
- Add "Get Next Deposit Address" button
- Add "Route Funds to Treasury" button
- Implement periodic balance polling

### Chapter 7: The Polish - Integration & Documentation
- End-to-end testing on Sepolia
- Add screenshots/GIF of complete flow
- Document all TODO implementations
- Final README with assumptions and run instructions

## API Endpoints

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

- Rust 1.80+
- Node.js 18+
- pnpm
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

## TODOs Implemented

| File | Function | Implementation |
|------|----------|----------------|
| `DeterministicProxyDeployer.sol` | `_proxyInitCode()` | EIP-1167 minimal proxy bytecode |
| `FundRouter.sol` | `_isAllowedCaller()` | staticcall to FundRouterStorage |
| `FundRouter.sol` | `_isAllowedTreasury()` | staticcall to FundRouterStorage |
| `FundRouter.sol` | ERC20 transfer | `IERC20(token).transfer(treasuryAddress, amt)` |

## Assumptions

- ETH-only routing (ERC20 as stretch goal)
- Single treasury address per deployment
- SQLite for simplicity (Postgres-ready schema)
- Proxies deploy lazily on first route, not on fund detection

## Deployed Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| FundRouterStorage | `0x...` |
| FundRouter | `0x...` |
| DeterministicProxyDeployer | `0x...` |

*See `deployments.json` for full details*