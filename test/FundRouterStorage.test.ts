import { expect } from "chai";
import { ethers } from "hardhat";
import { FundRouterStorage } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FundRouterStorage", function () {
  let storage: FundRouterStorage;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  // Permission bits
  const CALLER_BIT = 0x01;
  const TREASURY_BIT = 0x02;
  const BOTH_BITS = 0x03;

  beforeEach(async function () {
    [owner, alice, bob, treasury] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("FundRouterStorage");
    storage = await Factory.deploy(owner.address);
    await storage.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await storage.owner()).to.equal(owner.address);
    });

    it("should emit OwnershipTransferred event on deploy", async function () {
      const Factory = await ethers.getContractFactory("FundRouterStorage");
      const tx = await Factory.deploy(alice.address);
      
      await expect(tx.deploymentTransaction())
        .to.emit(tx, "OwnershipTransferred")
        .withArgs(ethers.ZeroAddress, alice.address);
    });

    it("should revert if owner is zero address", async function () {
      const Factory = await ethers.getContractFactory("FundRouterStorage");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(storage, "ZeroAddress");
    });

    it("should initialize with no permissions", async function () {
      expect(await storage.permissions(alice.address)).to.equal(0);
    });
  });

  describe("setPermissions", function () {
    it("should allow owner to set caller permission", async function () {
      await storage.setPermissions(alice.address, CALLER_BIT);
      expect(await storage.permissions(alice.address)).to.equal(CALLER_BIT);
    });

    it("should allow owner to set treasury permission", async function () {
      await storage.setPermissions(treasury.address, TREASURY_BIT);
      expect(await storage.permissions(treasury.address)).to.equal(TREASURY_BIT);
    });

    it("should allow owner to set both permissions", async function () {
      await storage.setPermissions(alice.address, BOTH_BITS);
      expect(await storage.permissions(alice.address)).to.equal(BOTH_BITS);
    });

    it("should emit PermissionsSet event", async function () {
      await expect(storage.setPermissions(alice.address, CALLER_BIT))
        .to.emit(storage, "PermissionsSet")
        .withArgs(alice.address, CALLER_BIT);
    });

    it("should revert if called by non-owner", async function () {
      await expect(storage.connect(alice).setPermissions(bob.address, CALLER_BIT))
        .to.be.revertedWithCustomError(storage, "NotOwner");
    });

    it("should allow overwriting permissions", async function () {
      await storage.setPermissions(alice.address, CALLER_BIT);
      await storage.setPermissions(alice.address, TREASURY_BIT);
      expect(await storage.permissions(alice.address)).to.equal(TREASURY_BIT);
    });

    it("should overwrite (not OR) when setting permissions twice on same address", async function () {
      // This test documents the overwrite behavior that caused the deployment bug
      // If deployer and treasury are the same address, you must set BOTH_BITS (0x03)
      // Setting CALLER_BIT then TREASURY_BIT separately results in only TREASURY_BIT
      await storage.setPermissions(alice.address, CALLER_BIT);
      expect(await storage.isAllowedCaller(alice.address)).to.be.true;
      expect(await storage.isAllowedTreasury(alice.address)).to.be.false;
      
      // Second call OVERWRITES, not ORs
      await storage.setPermissions(alice.address, TREASURY_BIT);
      expect(await storage.isAllowedCaller(alice.address)).to.be.false; // Lost!
      expect(await storage.isAllowedTreasury(alice.address)).to.be.true;
      
      // Correct way: set both at once
      await storage.setPermissions(alice.address, BOTH_BITS);
      expect(await storage.isAllowedCaller(alice.address)).to.be.true;
      expect(await storage.isAllowedTreasury(alice.address)).to.be.true;
    });

    it("should allow clearing permissions", async function () {
      await storage.setPermissions(alice.address, BOTH_BITS);
      await storage.setPermissions(alice.address, 0);
      expect(await storage.permissions(alice.address)).to.equal(0);
    });
  });

  describe("isAllowedCaller", function () {
    it("should return false for address with no permissions", async function () {
      expect(await storage.isAllowedCaller(alice.address)).to.be.false;
    });

    it("should return true for address with caller bit set", async function () {
      await storage.setPermissions(alice.address, CALLER_BIT);
      expect(await storage.isAllowedCaller(alice.address)).to.be.true;
    });

    it("should return true for address with both bits set", async function () {
      await storage.setPermissions(alice.address, BOTH_BITS);
      expect(await storage.isAllowedCaller(alice.address)).to.be.true;
    });

    it("should return false for address with only treasury bit", async function () {
      await storage.setPermissions(alice.address, TREASURY_BIT);
      expect(await storage.isAllowedCaller(alice.address)).to.be.false;
    });
  });

  describe("isAllowedTreasury", function () {
    it("should return false for address with no permissions", async function () {
      expect(await storage.isAllowedTreasury(treasury.address)).to.be.false;
    });

    it("should return true for address with treasury bit set", async function () {
      await storage.setPermissions(treasury.address, TREASURY_BIT);
      expect(await storage.isAllowedTreasury(treasury.address)).to.be.true;
    });

    it("should return true for address with both bits set", async function () {
      await storage.setPermissions(treasury.address, BOTH_BITS);
      expect(await storage.isAllowedTreasury(treasury.address)).to.be.true;
    });

    it("should return false for address with only caller bit", async function () {
      await storage.setPermissions(treasury.address, CALLER_BIT);
      expect(await storage.isAllowedTreasury(treasury.address)).to.be.false;
    });
  });

  describe("isAllowedCallerAndTreasury", function () {
    it("should return false when neither is allowed", async function () {
      expect(await storage.isAllowedCallerAndTreasury(alice.address, treasury.address)).to.be.false;
    });

    it("should return false when only caller is allowed", async function () {
      await storage.setPermissions(alice.address, CALLER_BIT);
      expect(await storage.isAllowedCallerAndTreasury(alice.address, treasury.address)).to.be.false;
    });

    it("should return false when only treasury is allowed", async function () {
      await storage.setPermissions(treasury.address, TREASURY_BIT);
      expect(await storage.isAllowedCallerAndTreasury(alice.address, treasury.address)).to.be.false;
    });

    it("should return true when both are allowed", async function () {
      await storage.setPermissions(alice.address, CALLER_BIT);
      await storage.setPermissions(treasury.address, TREASURY_BIT);
      expect(await storage.isAllowedCallerAndTreasury(alice.address, treasury.address)).to.be.true;
    });

    it("should work when same address has both permissions", async function () {
      await storage.setPermissions(alice.address, BOTH_BITS);
      expect(await storage.isAllowedCallerAndTreasury(alice.address, alice.address)).to.be.true;
    });
  });

  describe("transferOwnership", function () {
    it("should allow owner to transfer ownership", async function () {
      await storage.transferOwnership(alice.address);
      expect(await storage.owner()).to.equal(alice.address);
    });

    it("should emit OwnershipTransferred event", async function () {
      await expect(storage.transferOwnership(alice.address))
        .to.emit(storage, "OwnershipTransferred")
        .withArgs(owner.address, alice.address);
    });

    it("should revert if called by non-owner", async function () {
      await expect(storage.connect(alice).transferOwnership(bob.address))
        .to.be.revertedWithCustomError(storage, "NotOwner");
    });

    it("should revert if new owner is zero address", async function () {
      await expect(storage.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(storage, "ZeroAddress");
    });

    it("should allow new owner to set permissions", async function () {
      await storage.transferOwnership(alice.address);
      await storage.connect(alice).setPermissions(bob.address, CALLER_BIT);
      expect(await storage.permissions(bob.address)).to.equal(CALLER_BIT);
    });

    it("should prevent old owner from setting permissions", async function () {
      await storage.transferOwnership(alice.address);
      await expect(storage.setPermissions(bob.address, CALLER_BIT))
        .to.be.revertedWithCustomError(storage, "NotOwner");
    });
  });
});
