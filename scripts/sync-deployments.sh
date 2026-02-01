#!/bin/bash
# Sync contract addresses from deployments.json to rust-backend/.env
#
# Usage: ./scripts/sync-deployments.sh [network]
# Default network: sepolia

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENTS_FILE="$PROJECT_ROOT/deployments.json"
RUST_ENV_FILE="$PROJECT_ROOT/rust-backend/.env"
RUST_ENV_EXAMPLE="$PROJECT_ROOT/rust-backend/.env.example"

NETWORK="${1:-sepolia}"

echo "📦 Syncing deployment addresses from $NETWORK..."

# Check if deployments.json exists
if [ ! -f "$DEPLOYMENTS_FILE" ]; then
    echo "❌ Error: deployments.json not found at $DEPLOYMENTS_FILE"
    echo "   Run 'pnpm deploy:sepolia' first."
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    echo "   Install with: brew install jq"
    exit 1
fi

# Check if network exists in deployments
if ! jq -e ".$NETWORK" "$DEPLOYMENTS_FILE" > /dev/null 2>&1; then
    echo "❌ Error: Network '$NETWORK' not found in deployments.json"
    echo "   Available networks: $(jq -r 'keys | join(", ")' "$DEPLOYMENTS_FILE")"
    exit 1
fi

# Extract values
DEPLOYER_ADDRESS=$(jq -r ".$NETWORK.contracts.DeterministicProxyDeployer" "$DEPLOYMENTS_FILE")
ROUTER_ADDRESS=$(jq -r ".$NETWORK.contracts.FundRouter" "$DEPLOYMENTS_FILE")
INIT_CODE_HASH=$(jq -r ".$NETWORK.initCodeHash" "$DEPLOYMENTS_FILE")

# Create .env from example if it doesn't exist
if [ ! -f "$RUST_ENV_FILE" ]; then
    if [ -f "$RUST_ENV_EXAMPLE" ]; then
        cp "$RUST_ENV_EXAMPLE" "$RUST_ENV_FILE"
        echo "✅ Created rust-backend/.env from .env.example"
    else
        echo "❌ Error: .env.example not found"
        exit 1
    fi
fi

# Update values in .env using sed (macOS compatible)
update_env_var() {
    local key=$1
    local value=$2
    local file=$3
    
    if grep -q "^${key}=" "$file"; then
        # macOS sed requires -i '' for in-place editing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        echo "${key}=${value}" >> "$file"
    fi
}

update_env_var "DEPLOYER_ADDRESS" "$DEPLOYER_ADDRESS" "$RUST_ENV_FILE"
update_env_var "ROUTER_ADDRESS" "$ROUTER_ADDRESS" "$RUST_ENV_FILE"
update_env_var "INIT_CODE_HASH" "$INIT_CODE_HASH" "$RUST_ENV_FILE"

echo ""
echo "✅ Updated rust-backend/.env with $NETWORK addresses:"
echo "   DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS"
echo "   ROUTER_ADDRESS=$ROUTER_ADDRESS"
echo "   INIT_CODE_HASH=$INIT_CODE_HASH"
echo ""
echo "📝 Remember to also set RPC_URL in rust-backend/.env"
