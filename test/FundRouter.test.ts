import { expect } from "chai";
import { ethers } from "hardhat";
import { FundRouter, FundRouterStorage, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FundRouter", function () {
  let storage: FundRouterStorage;
  let router: FundRouter;
  let mockToken: MockERC20;
  let owner: HardhatEthersSigner;
  let caller: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  // Permission bits
  const CALLER_BIT = 0x01;
  const TREASURY_BIT = 0x02;

  beforeEach(async function () {
    [owner, caller, treasury, unauthorized] = await ethers.getSigners();

    // Deploy FundRouterStorage
    const StorageFactory = await ethers.getContractFactory("FundRouterStorage");
    storage = await StorageFactory.deploy(owner.address);
    await storage.waitForDeployment();

    // Deploy FundRouter
    const RouterFactory = await ethers.getContractFactory("FundRouter");
    router = await RouterFactory.deploy(await storage.getAddress());
    await router.waitForDeployment();

    // Deploy MockERC20
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    mockToken = await TokenFactory.deploy("Mock Token", "MOCK", 18);
    await mockToken.waitForDeployment();

    // Set up permissions: caller is allowed, treasury is allowed
    await storage.setPermissions(caller.address, CALLER_BIT);
    await storage.setPermissions(treasury.address, TREASURY_BIT);
  });

  describe("Deployment", function () {
    it("should set the correct storage address", async function () {
      expect(await router.STORAGE()).to.equal(await storage.getAddress());
    });

    it("should revert if storage is zero address", async function () {
      const RouterFactory = await ethers.getContractFactory("FundRouter");
      await expect(RouterFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("storage=0");
    });
  });

  describe("Permission Checks", function () {
    it("should revert if caller is not allowed", async function () {
      await expect(
        router.connect(unauthorized).transferFunds(
          0,
          [],
          [],
          treasury.address
        )
      ).to.be.revertedWithCustomError(router, "NotAuthorizedCaller");
    });

    it("should revert if treasury is not allowed", async function () {
      await expect(
        router.connect(caller).transferFunds(
          0,
          [],
          [],
          unauthorized.address
        )
      ).to.be.revertedWithCustomError(router, "TreasuryNotAllowed");
    });

    it("should revert if treasury is zero address", async function () {
      await expect(
        router.connect(caller).transferFunds(
          0,
          [],
          [],
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(router, "ZeroTreasury");
    });

    it("should allow transfer when both permissions are set", async function () {
      // Should not revert
      await router.connect(caller).transferFunds(0, [], [], treasury.address);
    });
  });

  describe("ETH Routing", function () {
    it("should receive ETH via receive()", async function () {
      const amount = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await router.getAddress(),
        value: amount,
      });

      expect(await ethers.provider.getBalance(await router.getAddress()))
        .to.equal(amount);
    });

    it("should route ETH to treasury", async function () {
      const amount = ethers.parseEther("1.0");
      
      // Send ETH to router first
      await owner.sendTransaction({
        to: await router.getAddress(),
        value: amount,
      });

      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      // Route ETH to treasury
      await router.connect(caller).transferFunds(
        amount,
        [],
        [],
        treasury.address
      );

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(amount);
    });

    it("should route partial ETH amount", async function () {
      const depositAmount = ethers.parseEther("2.0");
      const routeAmount = ethers.parseEther("1.5");
      
      await owner.sendTransaction({
        to: await router.getAddress(),
        value: depositAmount,
      });

      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      await router.connect(caller).transferFunds(
        routeAmount,
        [],
        [],
        treasury.address
      );

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(routeAmount);

      // Router should still have remaining ETH
      expect(await ethers.provider.getBalance(await router.getAddress()))
        .to.equal(depositAmount - routeAmount);
    });

    it("should handle zero ETH amount", async function () {
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      await router.connect(caller).transferFunds(0, [], [], treasury.address);

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore);
    });
  });

  describe("ERC20 Routing", function () {
    it("should route ERC20 tokens to treasury", async function () {
      const amount = ethers.parseEther("100");
      
      // Mint tokens to router
      await mockToken.mint(await router.getAddress(), amount);

      // Route tokens to treasury
      await router.connect(caller).transferFunds(
        0,
        [await mockToken.getAddress()],
        [amount],
        treasury.address
      );

      expect(await mockToken.balanceOf(treasury.address)).to.equal(amount);
      expect(await mockToken.balanceOf(await router.getAddress())).to.equal(0);
    });

    it("should route multiple ERC20 tokens", async function () {
      // Deploy second token
      const TokenFactory = await ethers.getContractFactory("MockERC20");
      const token2 = await TokenFactory.deploy("Token 2", "TK2", 18);
      
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      // Mint tokens to router
      await mockToken.mint(await router.getAddress(), amount1);
      await token2.mint(await router.getAddress(), amount2);

      // Route both tokens
      await router.connect(caller).transferFunds(
        0,
        [await mockToken.getAddress(), await token2.getAddress()],
        [amount1, amount2],
        treasury.address
      );

      expect(await mockToken.balanceOf(treasury.address)).to.equal(amount1);
      expect(await token2.balanceOf(treasury.address)).to.equal(amount2);
    });

    it("should skip zero amounts", async function () {
      const amount = ethers.parseEther("100");
      await mockToken.mint(await router.getAddress(), amount);

      // Route with zero amount - should not fail
      await router.connect(caller).transferFunds(
        0,
        [await mockToken.getAddress()],
        [0],
        treasury.address
      );

      // Tokens should still be in router
      expect(await mockToken.balanceOf(await router.getAddress())).to.equal(amount);
    });

    it("should revert if token/amount arrays have different lengths", async function () {
      await expect(
        router.connect(caller).transferFunds(
          0,
          [await mockToken.getAddress()],
          [ethers.parseEther("100"), ethers.parseEther("200")],
          treasury.address
        )
      ).to.be.revertedWithCustomError(router, "LengthMismatch");
    });
  });

  describe("Combined ETH and ERC20 Routing", function () {
    it("should route both ETH and ERC20 in single transaction", async function () {
      const ethAmount = ethers.parseEther("1.0");
      const tokenAmount = ethers.parseEther("100");

      // Fund router with ETH and tokens
      await owner.sendTransaction({
        to: await router.getAddress(),
        value: ethAmount,
      });
      await mockToken.mint(await router.getAddress(), tokenAmount);

      const treasuryEthBefore = await ethers.provider.getBalance(treasury.address);

      // Route both
      await router.connect(caller).transferFunds(
        ethAmount,
        [await mockToken.getAddress()],
        [tokenAmount],
        treasury.address
      );

      const treasuryEthAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryEthAfter - treasuryEthBefore).to.equal(ethAmount);
      expect(await mockToken.balanceOf(treasury.address)).to.equal(tokenAmount);
    });
  });
});
