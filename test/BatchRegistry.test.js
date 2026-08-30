/**
 * @file   test/BatchRegistry.test.js
 * @notice Hardhat 3 + Mocha + Chai test suite for BatchRegistry.sol
 *         Covers: happy path, access control, and edge cases.
 *         Target: >90% branch coverage.
 *
 * Hardhat 3 pattern:
 *   - import { network } from "hardhat"
 *   - const { ethers } = await network.create()
 *   - chai matchers are injected via the hardhat-ethers-chai-matchers plugin
 */

import { network } from "hardhat";
import { expect } from "chai";
import { ZeroAddress, keccak256, toUtf8Bytes, zeroPadValue, toBeHex } from "ethers";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Encode a string as bytes32 via keccak256 */
const toBytes32 = (str) => keccak256(toUtf8Bytes(str));

// ─────────────────────────────────────────────────────────────────────────────
//  Shared network instance (created once, reused across all tests)
// ─────────────────────────────────────────────────────────────────────────────

// `network.create()` provisions a fresh in-process EDR network and registers
// the chai matchers plugin on the resulting connection.
const { ethers } = await network.create();

// ─────────────────────────────────────────────────────────────────────────────
//  Fixtures
// ─────────────────────────────────────────────────────────────────────────────

async function deployBatchRegistryFixture() {
  const [admin, beekeeper, processor, distributor, retailer, stranger] =
    await ethers.getSigners();

  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const registry = await BatchRegistry.deploy();
  await registry.waitForDeployment();

  const BEEKEEPER_ROLE   = await registry.BEEKEEPER_ROLE();
  const PROCESSOR_ROLE   = await registry.PROCESSOR_ROLE();
  const DISTRIBUTOR_ROLE = await registry.DISTRIBUTOR_ROLE();
  const RETAILER_ROLE    = await registry.RETAILER_ROLE();
  const ADMIN_ROLE       = await registry.ADMIN_ROLE();

  // Grant roles to designated signers
  await registry.connect(admin).grantRole(BEEKEEPER_ROLE,   beekeeper.address);
  await registry.connect(admin).grantRole(PROCESSOR_ROLE,   processor.address);
  await registry.connect(admin).grantRole(DISTRIBUTOR_ROLE, distributor.address);
  await registry.connect(admin).grantRole(RETAILER_ROLE,    retailer.address);

  return {
    registry,
    admin,
    beekeeper,
    processor,
    distributor,
    retailer,
    stranger,
    BEEKEEPER_ROLE,
    PROCESSOR_ROLE,
    DISTRIBUTOR_ROLE,
    RETAILER_ROLE,
    ADMIN_ROLE,
  };
}

// Batch fixtures (constant bytes32 values)
const BATCH_ID      = toBytes32("batch-001");
const METADATA_HASH = toBytes32("metadata-001");
const QR_ID         = toBytes32("qr-001");
const LOCATION_HASH = toBytes32("location-001");

// Transfer types matching contract enum
const TransferType = { Harvest: 0, Processor: 1, Distributor: 2, Retailer: 3 };

// ─────────────────────────────────────────────────────────────────────────────
//  Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("BatchRegistry", function () {

  // ───────────────────────────────────────────────
  //  Deployment
  // ───────────────────────────────────────────────

  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN_ROLE and ADMIN_ROLE to deployer", async function () {
      const { registry, admin, ADMIN_ROLE } = await deployBatchRegistryFixture();
      const DEFAULT_ADMIN = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(DEFAULT_ADMIN, admin.address)).to.be.true;
      expect(await registry.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("deployer does not initially have BEEKEEPER_ROLE", async function () {
      const { registry, admin, BEEKEEPER_ROLE } = await deployBatchRegistryFixture();
      expect(await registry.hasRole(BEEKEEPER_ROLE, admin.address)).to.be.false;
    });
  });

  // ───────────────────────────────────────────────
  //  Happy Path
  // ───────────────────────────────────────────────

  describe("Happy Path — full supply chain flow", function () {
    it("creates batch → transfers custody twice → activates QR → correct history", async function () {
      const { registry, beekeeper, processor, distributor } =
        await deployBatchRegistryFixture();

      // ── Step 1: Beekeeper creates batch ─────────────────────────────────
      await expect(
        registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address)
      ).to.emit(registry, "BatchCreated");

      const batch = await registry.getBatch(BATCH_ID);
      expect(batch.metadataHash).to.equal(METADATA_HASH);
      expect(batch.beekeeper).to.equal(beekeeper.address);
      expect(batch.currentCustodian).to.equal(beekeeper.address);
      expect(batch.exists).to.be.true;

      // ── Step 2: Beekeeper → Processor ────────────────────────────────────
      const locHash1 = toBytes32("farm-location-1");
      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(BATCH_ID, processor.address, TransferType.Processor, locHash1)
      ).to.emit(registry, "CustodyTransferred");

      expect((await registry.getBatch(BATCH_ID)).currentCustodian).to.equal(
        processor.address
      );

      // ── Step 3: Processor → Distributor ──────────────────────────────────
      const locHash2 = toBytes32("processing-plant-1");
      await registry
        .connect(processor)
        .transferCustody(BATCH_ID, distributor.address, TransferType.Distributor, locHash2);

      expect((await registry.getBatch(BATCH_ID)).currentCustodian).to.equal(
        distributor.address
      );

      // ── Step 4: Distributor activates QR ─────────────────────────────────
      await expect(registry.connect(distributor).activateQR(BATCH_ID, QR_ID))
        .to.emit(registry, "QRActivated");

      expect(await registry.getQRCode(BATCH_ID)).to.equal(QR_ID);
      expect(await registry.getBatchByQR(QR_ID)).to.equal(BATCH_ID);

      // ── Step 5: Verify full history ───────────────────────────────────────
      const history = await registry.getBatchHistory(BATCH_ID);
      expect(history).to.have.length(2);

      expect(history[0].from).to.equal(beekeeper.address);
      expect(history[0].to).to.equal(processor.address);
      expect(Number(history[0].transferType)).to.equal(TransferType.Processor);
      expect(history[0].locationHash).to.equal(locHash1);

      expect(history[1].from).to.equal(processor.address);
      expect(history[1].to).to.equal(distributor.address);
      expect(Number(history[1].transferType)).to.equal(TransferType.Distributor);
      expect(history[1].locationHash).to.equal(locHash2);
    });

    it("returns empty history for a freshly created batch", async function () {
      const { registry, beekeeper } = await deployBatchRegistryFixture();
      await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
      const history = await registry.getBatchHistory(BATCH_ID);
      expect(history).to.have.length(0);
    });

    it("admin granted BEEKEEPER_ROLE can call createBatch", async function () {
      const { registry, admin, BEEKEEPER_ROLE } = await deployBatchRegistryFixture();
      await registry.connect(admin).grantRole(BEEKEEPER_ROLE, admin.address);
      await expect(
        registry.connect(admin).createBatch(BATCH_ID, METADATA_HASH, admin.address)
      ).to.emit(registry, "BatchCreated");
    });

    it("supports full four-step chain: harvest → processor → distributor → retailer", async function () {
      const { registry, beekeeper, processor, distributor, retailer } =
        await deployBatchRegistryFixture();

      const batchId = toBytes32("full-chain-batch");
      await registry.connect(beekeeper).createBatch(batchId, METADATA_HASH, beekeeper.address);
      await registry.connect(beekeeper).transferCustody(batchId, processor.address, TransferType.Processor, LOCATION_HASH);
      await registry.connect(processor).transferCustody(batchId, distributor.address, TransferType.Distributor, LOCATION_HASH);
      await registry.connect(distributor).transferCustody(batchId, retailer.address, TransferType.Retailer, LOCATION_HASH);

      const history = await registry.getBatchHistory(batchId);
      expect(history).to.have.length(3);
      expect(Number(history[2].transferType)).to.equal(TransferType.Retailer);
    });

    it("timestamps are recorded on custody records", async function () {
      const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
      await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
      await registry.connect(beekeeper).transferCustody(BATCH_ID, processor.address, TransferType.Processor, LOCATION_HASH);

      const history = await registry.getBatchHistory(BATCH_ID);
      expect(Number(history[0].timestamp)).to.be.greaterThan(0);
    });
  });

  // ───────────────────────────────────────────────
  //  Access Control
  // ───────────────────────────────────────────────

  describe("Access Control", function () {
    describe("createBatch", function () {
      it("reverts when caller lacks BEEKEEPER_ROLE", async function () {
        const { registry, stranger } = await deployBatchRegistryFixture();
        await expect(
          registry.connect(stranger).createBatch(BATCH_ID, METADATA_HASH, stranger.address)
        ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      });

      it("reverts when processor (not beekeeper) calls createBatch", async function () {
        const { registry, processor } = await deployBatchRegistryFixture();
        await expect(
          registry.connect(processor).createBatch(BATCH_ID, METADATA_HASH, processor.address)
        ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      });

      it("reverts with ZeroAddress when beekeeper param is zero address", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        await expect(
          registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, ZeroAddress)
        ).to.be.revertedWithCustomError(registry, "ZeroAddress");
      });
    });

    describe("transferCustody", function () {
      it("reverts when caller is not the current custodian", async function () {
        const { registry, beekeeper, processor, stranger } =
          await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(stranger).transferCustody(BATCH_ID, processor.address, TransferType.Processor, LOCATION_HASH)
        )
          .to.be.revertedWithCustomError(registry, "NotCurrentCustodian")
          .withArgs(BATCH_ID, stranger.address);
      });

      it("reverts when processor tries to transfer a batch held by beekeeper", async function () {
        const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(processor).transferCustody(BATCH_ID, processor.address, TransferType.Processor, LOCATION_HASH)
        ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian");
      });

      it("reverts with ZeroAddress when `to` is zero address", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(beekeeper).transferCustody(BATCH_ID, ZeroAddress, TransferType.Processor, LOCATION_HASH)
        ).to.be.revertedWithCustomError(registry, "ZeroAddress");
      });

      it("reverts with InvalidTransferType for value > 3", async function () {
        const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(beekeeper).transferCustody(BATCH_ID, processor.address, 99, LOCATION_HASH)
        )
          .to.be.revertedWithCustomError(registry, "InvalidTransferType")
          .withArgs(99);
      });
    });

    describe("activateQR", function () {
      it("reverts when caller is not custodian and not admin", async function () {
        const { registry, beekeeper, stranger } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(stranger).activateQR(BATCH_ID, QR_ID)
        ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian");
      });

      it("admin can activate QR even without being custodian", async function () {
        const { registry, beekeeper, admin } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(registry.connect(admin).activateQR(BATCH_ID, QR_ID))
          .to.emit(registry, "QRActivated");
      });
    });

    describe("Role management", function () {
      it("admin can grant and revoke BEEKEEPER_ROLE", async function () {
        const { registry, admin, stranger, BEEKEEPER_ROLE } =
          await deployBatchRegistryFixture();
        await registry.connect(admin).grantRole(BEEKEEPER_ROLE, stranger.address);
        expect(await registry.hasRole(BEEKEEPER_ROLE, stranger.address)).to.be.true;
        await registry.connect(admin).revokeRole(BEEKEEPER_ROLE, stranger.address);
        expect(await registry.hasRole(BEEKEEPER_ROLE, stranger.address)).to.be.false;
      });

      it("stranger cannot grant roles", async function () {
        const { registry, stranger, BEEKEEPER_ROLE } = await deployBatchRegistryFixture();
        await expect(
          registry.connect(stranger).grantRole(BEEKEEPER_ROLE, stranger.address)
        ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      });
    });
  });

  // ───────────────────────────────────────────────
  //  Edge Cases
  // ───────────────────────────────────────────────

  describe("Edge Cases", function () {
    describe("Duplicate batch ID", function () {
      it("reverts when creating a batch with an already-used batchId", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address)
        )
          .to.be.revertedWithCustomError(registry, "BatchAlreadyExists")
          .withArgs(BATCH_ID);
      });
    });

    describe("Duplicate QR activation", function () {
      it("reverts when same batch already has a QR code (QRAlreadyActivated)", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await registry.connect(beekeeper).activateQR(BATCH_ID, QR_ID);

        const qrId2 = toBytes32("qr-002");
        await expect(
          registry.connect(beekeeper).activateQR(BATCH_ID, qrId2)
        )
          .to.be.revertedWithCustomError(registry, "QRAlreadyActivated")
          .withArgs(BATCH_ID);
      });

      it("reverts when same QR code is used for a different batch (QRIdAlreadyUsed)", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        const batchId2 = toBytes32("batch-002");

        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await registry.connect(beekeeper).createBatch(batchId2, METADATA_HASH, beekeeper.address);
        await registry.connect(beekeeper).activateQR(BATCH_ID, QR_ID);

        await expect(
          registry.connect(beekeeper).activateQR(batchId2, QR_ID)
        ).to.be.revertedWithCustomError(registry, "QRIdAlreadyUsed");
      });
    });

    describe("Transfer of nonexistent batch", function () {
      it("reverts with BatchNotFound on transferCustody", async function () {
        const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
        const fakeBatchId = toBytes32("does-not-exist");
        await expect(
          registry.connect(beekeeper).transferCustody(fakeBatchId, processor.address, TransferType.Processor, LOCATION_HASH)
        )
          .to.be.revertedWithCustomError(registry, "BatchNotFound")
          .withArgs(fakeBatchId);
      });

      it("reverts with BatchNotFound on getBatchHistory", async function () {
        const { registry } = await deployBatchRegistryFixture();
        const fakeBatchId = toBytes32("ghost-batch");
        await expect(registry.getBatchHistory(fakeBatchId))
          .to.be.revertedWithCustomError(registry, "BatchNotFound")
          .withArgs(fakeBatchId);
      });

      it("reverts with BatchNotFound on activateQR", async function () {
        const { registry, beekeeper } = await deployBatchRegistryFixture();
        const fakeBatchId = toBytes32("ghost-batch");
        await expect(registry.connect(beekeeper).activateQR(fakeBatchId, QR_ID))
          .to.be.revertedWithCustomError(registry, "BatchNotFound")
          .withArgs(fakeBatchId);
      });

      it("reverts with BatchNotFound on getQRCode", async function () {
        const { registry } = await deployBatchRegistryFixture();
        const fakeBatchId = toBytes32("ghost-batch");
        await expect(registry.getQRCode(fakeBatchId))
          .to.be.revertedWithCustomError(registry, "BatchNotFound")
          .withArgs(fakeBatchId);
      });

      it("reverts with BatchNotFound on getBatch", async function () {
        const { registry } = await deployBatchRegistryFixture();
        const fakeBatchId = toBytes32("ghost-batch");
        await expect(registry.getBatch(fakeBatchId))
          .to.be.revertedWithCustomError(registry, "BatchNotFound")
          .withArgs(fakeBatchId);
      });
    });

    describe("QR reverse lookup", function () {
      it("returns bytes32(0) for unknown QR codes", async function () {
        const { registry } = await deployBatchRegistryFixture();
        const result = await registry.getBatchByQR(toBytes32("unknown-qr"));
        expect(result).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      });
    });

    describe("Transfer type boundary", function () {
      it("accepts transfer type 3 (Retailer — max valid)", async function () {
        const { registry, beekeeper, retailer } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(beekeeper).transferCustody(BATCH_ID, retailer.address, TransferType.Retailer, LOCATION_HASH)
        ).to.emit(registry, "CustodyTransferred");
      });

      it("accepts transfer type 0 (Harvest)", async function () {
        const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
        await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
        await expect(
          registry.connect(beekeeper).transferCustody(BATCH_ID, processor.address, TransferType.Harvest, LOCATION_HASH)
        ).to.emit(registry, "CustodyTransferred");
      });
    });

    describe("Multiple independent batches", function () {
      it("tracks multiple batches without cross-contamination", async function () {
        const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
        const batchA = toBytes32("batch-A");
        const batchB = toBytes32("batch-B");

        await registry.connect(beekeeper).createBatch(batchA, toBytes32("meta-A"), beekeeper.address);
        await registry.connect(beekeeper).createBatch(batchB, toBytes32("meta-B"), beekeeper.address);

        // Only transfer batchA
        await registry.connect(beekeeper).transferCustody(batchA, processor.address, TransferType.Processor, LOCATION_HASH);

        // batchB custodian unchanged
        const bBatch = await registry.getBatch(batchB);
        expect(bBatch.currentCustodian).to.equal(beekeeper.address);

        // batchA has 1 transfer, batchB has 0
        expect(await registry.getBatchHistory(batchA)).to.have.length(1);
        expect(await registry.getBatchHistory(batchB)).to.have.length(0);
      });
    });
  });

  // ───────────────────────────────────────────────
  //  Gas Snapshots (informational, non-failing)
  // ───────────────────────────────────────────────

  describe("Gas Usage (informational)", function () {
    it("measures gas for createBatch", async function () {
      const { registry, beekeeper } = await deployBatchRegistryFixture();
      const tx = await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
      const receipt = await tx.wait();
      console.log(`\n    ⛽  createBatch gas used: ${receipt.gasUsed.toString()}`);
    });

    it("measures gas for transferCustody", async function () {
      const { registry, beekeeper, processor } = await deployBatchRegistryFixture();
      await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
      const tx = await registry.connect(beekeeper).transferCustody(BATCH_ID, processor.address, TransferType.Processor, LOCATION_HASH);
      const receipt = await tx.wait();
      console.log(`\n    ⛽  transferCustody gas used: ${receipt.gasUsed.toString()}`);
    });

    it("measures gas for activateQR", async function () {
      const { registry, beekeeper } = await deployBatchRegistryFixture();
      await registry.connect(beekeeper).createBatch(BATCH_ID, METADATA_HASH, beekeeper.address);
      const tx = await registry.connect(beekeeper).activateQR(BATCH_ID, QR_ID);
      const receipt = await tx.wait();
      console.log(`\n    ⛽  activateQR gas used: ${receipt.gasUsed.toString()}`);
    });
  });
});
