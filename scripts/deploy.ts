import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for RADHAT contracts
 * 
 * Flow (from assignment):
 * 1. Deploy FundRouterStorage(owner = deployer)
 * 2. setPermissions(deployer, 0x01) - allowed caller
 * 3. setPermissions(TREASURY, 0x02) - allowed treasury
 * 4. Deploy FundRouter(storageAddress)
 * 5. Deploy DeterministicProxyDeployer(routerAddress)
 * 6. Save addresses to deployments.json
 */

interface Deployment {
  network: string;
  chainId: number;
  deployer: string;
  treasury: string;
  contracts: {
    FundRouterStorage: string;
    FundRouter: string;
    DeterministicProxyDeployer: string;
  };
  initCodeHash: string;
  deployedAt: string;
  blockNumber: number;
}

const CALLER_BIT = 0x01;
const TREASURY_BIT = 0x02;

async function main() {
  // Validate environment
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  if (!treasuryAddress || treasuryAddress === "0xYOUR_TREASURY_ADDRESS") {
    throw new Error("TREASURY_ADDRESS not set in .env");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("═".repeat(60));
  console.log("RADHAT Deployment Script");
  console.log("═".repeat(60));
  console.log(`Network:  ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployerAddress))} ETH`);
  console.log("═".repeat(60));

  // 1. Deploy FundRouterStorage
  console.log("\n[1/5] Deploying FundRouterStorage...");
  const StorageFactory = await ethers.getContractFactory("FundRouterStorage");
  const storage = await StorageFactory.deploy(deployerAddress);
  await storage.waitForDeployment();
  const storageAddress = await storage.getAddress();
  console.log(`      ✓ FundRouterStorage: ${storageAddress}`);

  // 2-3. Set permissions (handle same address case)
  console.log("\n[2/5] Setting permissions...");
  if (deployerAddress.toLowerCase() === treasuryAddress.toLowerCase()) {
    // Same address needs both bits: 0x01 | 0x02 = 0x03
    const tx = await storage.setPermissions(deployerAddress, CALLER_BIT | TREASURY_BIT);
    await tx.wait();
    console.log(`      ✓ ${deployerAddress} => 0x03 (caller + treasury)`);
  } else {
    // Different addresses: set separately
    const tx1 = await storage.setPermissions(deployerAddress, CALLER_BIT);
    await tx1.wait();
    console.log(`      ✓ ${deployerAddress} => 0x01 (caller)`);
    
    const tx2 = await storage.setPermissions(treasuryAddress, TREASURY_BIT);
    await tx2.wait();
    console.log(`      ✓ ${treasuryAddress} => 0x02 (treasury)`);
  }

  // 4. Deploy FundRouter
  console.log("\n[4/5] Deploying FundRouter...");
  const RouterFactory = await ethers.getContractFactory("FundRouter");
  const router = await RouterFactory.deploy(storageAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`      ✓ FundRouter: ${routerAddress}`);

  // 5. Deploy DeterministicProxyDeployer
  console.log("\n[5/5] Deploying DeterministicProxyDeployer...");
  const DeployerFactory = await ethers.getContractFactory("DeterministicProxyDeployer");
  const proxyDeployer = await DeployerFactory.deploy(routerAddress);
  await proxyDeployer.waitForDeployment();
  const proxyDeployerAddress = await proxyDeployer.getAddress();
  console.log(`      ✓ DeterministicProxyDeployer: ${proxyDeployerAddress}`);

  // Get init code hash for Rust backend
  const initCodeHash = await proxyDeployer.getInitCodeHash();
  console.log(`\n      Init Code Hash: ${initCodeHash}`);

  // Get current block number
  const blockNumber = await ethers.provider.getBlockNumber();

  // Build deployment object
  const deployment: Deployment = {
    network: network.name,
    chainId: network.config.chainId || 0,
    deployer: deployerAddress,
    treasury: treasuryAddress,
    contracts: {
      FundRouterStorage: storageAddress,
      FundRouter: routerAddress,
      DeterministicProxyDeployer: proxyDeployerAddress,
    },
    initCodeHash: initCodeHash,
    deployedAt: new Date().toISOString(),
    blockNumber: blockNumber,
  };

  // Save to deployments.json
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  
  // Load existing deployments or create new object
  let allDeployments: Record<string, Deployment> = {};
  if (fs.existsSync(deploymentsPath)) {
    allDeployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  }
  
  // Add/update this network's deployment
  allDeployments[network.name] = deployment;
  
  // Write back
  fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
  console.log(`\n✓ Saved to deployments.json`);

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("Deployment Complete!");
  console.log("═".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`  FundRouterStorage:          ${storageAddress}`);
  console.log(`  FundRouter:                 ${routerAddress}`);
  console.log(`  DeterministicProxyDeployer: ${proxyDeployerAddress}`);
  console.log("\nPermissions:");
  console.log(`  Caller (0x01):   ${deployerAddress}`);
  console.log(`  Treasury (0x02): ${treasuryAddress}`);
  console.log("\nFor Rust Backend:");
  console.log(`  DEPLOYER_ADDRESS=${proxyDeployerAddress}`);
  console.log(`  ROUTER_ADDRESS=${routerAddress}`);
  console.log(`  INIT_CODE_HASH=${initCodeHash}`);
  console.log("═".repeat(60));

  // Verify deployment by checking permissions
  console.log("\nVerifying deployment...");
  const isCallerAllowed = await storage.isAllowedCaller(deployerAddress);
  const isTreasuryAllowed = await storage.isAllowedTreasury(treasuryAddress);
  const routerStorage = await router.STORAGE();
  const deployerRouter = await proxyDeployer.FUND_ROUTER_ADDRESS();

  console.log(`  ✓ Deployer is allowed caller: ${isCallerAllowed}`);
  console.log(`  ✓ Treasury is allowed treasury: ${isTreasuryAllowed}`);
  console.log(`  ✓ Router points to storage: ${routerStorage === storageAddress}`);
  console.log(`  ✓ ProxyDeployer points to router: ${deployerRouter === routerAddress}`);

  if (!isCallerAllowed || !isTreasuryAllowed) {
    throw new Error("Permission verification failed!");
  }

  console.log("\n🎉 All verifications passed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
