import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DeterministicProxyDeployer,
  FundRouter,
  FundRouterStorage,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("DeterministicProxyDeployer", function () {
  let storage: FundRouterStorage;
  let router: FundRouter;
  let deployer: DeterministicProxyDeployer;
  let owner: HardhatEthersSigner;
  let caller: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const CALLER_BIT = 0x01;
  const TREASURY_BIT = 0x02;

  beforeEach(async function () {
    [owner, caller, treasury, user] = await ethers.getSigners();

    // Deploy full stack: Storage -> Router -> Deployer
    const StorageFactory = await ethers.getContractFactory("FundRouterStorage");
    storage = await StorageFactory.deploy(owner.address);

    const RouterFactory = await ethers.getContractFactory("FundRouter");
    router = await RouterFactory.deploy(await storage.getAddress());

    const DeployerFactory = await ethers.getContractFactory("DeterministicProxyDeployer");
    deployer = await DeployerFactory.deploy(await router.getAddress());

    // Set permissions
    await storage.setPermissions(caller.address, CALLER_BIT);
    await storage.setPermissions(treasury.address, TREASURY_BIT);
  });

  describe("Deployment", function () {
    it("should set the correct fund router address", async function () {
      expect(await deployer.FUND_ROUTER_ADDRESS()).to.equal(await router.getAddress());
    });

    it("should revert if fund router is zero address", async function () {
      const DeployerFactory = await ethers.getContractFactory("DeterministicProxyDeployer");
      await expect(DeployerFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("router=0");
    });
  });

  describe("Address Calculation", function () {
    it("should calculate deterministic addresses", async function () {
      const salts = [
        ethers.id("salt1"),
        ethers.id("salt2"),
        ethers.id("salt3"),
      ];

      const addresses = await deployer.connect(user).calculateDestinationAddresses(salts);

      expect(addresses.length).to.equal(3);
      // All addresses should be unique
      expect(new Set(addresses).size).to.equal(3);
      // All should be valid addresses
      addresses.forEach((addr) => {
        expect(ethers.isAddress(addr)).to.be.true;
      });
    });

    it("should return same address for same salt and caller", async function () {
      const salt = ethers.id("test-salt");

      const addr1 = await deployer.connect(user).calculateDestinationAddresses([salt]);
      const addr2 = await deployer.connect(user).calculateDestinationAddresses([salt]);

      expect(addr1[0]).to.equal(addr2[0]);
    });

    it("should return different addresses for different callers", async function () {
      const salt = ethers.id("same-salt");

      const addrUser = await deployer.connect(user).calculateDestinationAddresses([salt]);
      const addrCaller = await deployer.connect(caller).calculateDestinationAddresses([salt]);

      expect(addrUser[0]).to.not.equal(addrCaller[0]);
    });

    it("should return different addresses for different salts", async function () {
      const salt1 = ethers.id("salt-1");
      const salt2 = ethers.id("salt-2");

      const addrs = await deployer.connect(user).calculateDestinationAddresses([salt1, salt2]);

      expect(addrs[0]).to.not.equal(addrs[1]);
    });
  });

  describe("Proxy Deployment", function () {
    it("should deploy proxy at calculated address", async function () {
      const salt = ethers.id("deploy-test");

      // Calculate expected address
      const [expectedAddr] = await deployer.connect(user).calculateDestinationAddresses([salt]);

      // Deploy
      const tx = await deployer.connect(user).deployMultiple([salt]);
      const receipt = await tx.wait();

      // Verify deployment at expected address
      const code = await ethers.provider.getCode(expectedAddr);
      expect(code).to.not.equal("0x");
    });

    it("should deploy multiple proxies", async function () {
      const salts = [
        ethers.id("multi-1"),
        ethers.id("multi-2"),
        ethers.id("multi-3"),
      ];

      const expectedAddrs = await deployer.connect(user).calculateDestinationAddresses(salts);

      await deployer.connect(user).deployMultiple(salts);

      // Verify all deployed
      for (const addr of expectedAddrs) {
        const code = await ethers.provider.getCode(addr);
        expect(code).to.not.equal("0x");
      }
    });

    it("should revert if deploying same salt twice", async function () {
      const salt = ethers.id("duplicate");

      await deployer.connect(user).deployMultiple([salt]);

      // Second deployment should fail (CREATE2 returns 0 for existing contract)
      await expect(deployer.connect(user).deployMultiple([salt]))
        .to.be.revertedWithCustomError(deployer, "Create2Failed");
    });

    it("should return deployed addresses", async function () {
      const salts = [ethers.id("return-test-1"), ethers.id("return-test-2")];

      const expectedAddrs = await deployer.connect(user).calculateDestinationAddresses(salts);
      
      // Use staticCall to get return value
      const returnedAddrs = await deployer.connect(user).deployMultiple.staticCall(salts);

      expect(returnedAddrs[0]).to.equal(expectedAddrs[0]);
      expect(returnedAddrs[1]).to.equal(expectedAddrs[1]);
    });
  });

  describe("Proxy ETH Forwarding", function () {
    it("should forward ETH from proxy to router", async function () {
      const salt = ethers.id("forward-test");
      const amount = ethers.parseEther("1.0");

      // Deploy proxy
      const [proxyAddr] = await deployer.connect(user).calculateDestinationAddresses([salt]);
      await deployer.connect(user).deployMultiple([salt]);

      // Send ETH to proxy
      await owner.sendTransaction({
        to: proxyAddr,
        value: amount,
      });

      // ETH should be forwarded to router
      const routerBalance = await ethers.provider.getBalance(await router.getAddress());
      expect(routerBalance).to.equal(amount);

      // Proxy should have no balance
      const proxyBalance = await ethers.provider.getBalance(proxyAddr);
      expect(proxyBalance).to.equal(0);
    });

    it("should forward multiple ETH deposits", async function () {
      const salt = ethers.id("multi-forward");
      const amount1 = ethers.parseEther("0.5");
      const amount2 = ethers.parseEther("0.3");

      const [proxyAddr] = await deployer.connect(user).calculateDestinationAddresses([salt]);
      await deployer.connect(user).deployMultiple([salt]);

      // Multiple deposits
      await owner.sendTransaction({ to: proxyAddr, value: amount1 });
      await user.sendTransaction({ to: proxyAddr, value: amount2 });

      const routerBalance = await ethers.provider.getBalance(await router.getAddress());
      expect(routerBalance).to.equal(amount1 + amount2);
    });
  });

  describe("Full E2E Flow", function () {
    it("should complete deposit -> forward -> route flow", async function () {
      const salt = ethers.id("e2e-test");
      const depositAmount = ethers.parseEther("1.0");

      // 1. Calculate deposit address (before deployment)
      const [depositAddr] = await deployer.connect(user).calculateDestinationAddresses([salt]);

      // 2. Deploy proxy at that address
      await deployer.connect(user).deployMultiple([salt]);

      // 3. Customer sends ETH to deposit address
      await owner.sendTransaction({
        to: depositAddr,
        value: depositAmount,
      });

      // 4. ETH is now in router
      expect(await ethers.provider.getBalance(await router.getAddress()))
        .to.equal(depositAmount);

      // 5. Allowed caller routes to treasury
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      await router.connect(caller).transferFunds(
        depositAmount,
        [],
        [],
        treasury.address
      );

      // 6. Treasury received the ETH
      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(depositAmount);
    });

    it("should handle multiple deposits to different addresses", async function () {
      const salts = [ethers.id("user-1"), ethers.id("user-2")];
      const amounts = [ethers.parseEther("0.5"), ethers.parseEther("0.7")];

      // Deploy both proxies
      const addrs = await deployer.connect(user).calculateDestinationAddresses(salts);
      await deployer.connect(user).deployMultiple(salts);

      // Deposits to both
      await owner.sendTransaction({ to: addrs[0], value: amounts[0] });
      await owner.sendTransaction({ to: addrs[1], value: amounts[1] });

      // All forwarded to router
      const totalDeposits = amounts[0] + amounts[1];
      expect(await ethers.provider.getBalance(await router.getAddress()))
        .to.equal(totalDeposits);

      // Route all to treasury
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
      await router.connect(caller).transferFunds(totalDeposits, [], [], treasury.address);

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(totalDeposits);
    });
  });

  describe("getInitCodeHash", function () {
    it("should return consistent init code hash", async function () {
      const hash1 = await deployer.getInitCodeHash();
      const hash2 = await deployer.getInitCodeHash();

      expect(hash1).to.equal(hash2);
      expect(hash1).to.not.equal(ethers.ZeroHash);
    });

    it("should be usable for off-chain address calculation", async function () {
      const salt = ethers.id("offchain-calc");
      const derivedSalt = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "address"], [salt, user.address])
      );

      const initCodeHash = await deployer.getInitCodeHash();
      const deployerAddr = await deployer.getAddress();

      // Manual CREATE2 calculation
      const calculatedAddr = ethers.getCreate2Address(
        deployerAddr,
        derivedSalt,
        initCodeHash
      );

      // Compare with contract calculation
      const [contractAddr] = await deployer.connect(user).calculateDestinationAddresses([salt]);

      expect(calculatedAddr).to.equal(contractAddr);
    });
  });
});
