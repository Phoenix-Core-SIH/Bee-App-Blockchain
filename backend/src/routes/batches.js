/**
 * @file   src/routes/batches.js
 * @notice REST routes for batch management:
 *         POST /batches           — create batch (on-chain + DB)
 *         POST /batches/:id/transfer — custody transfer
 *         POST /batches/:id/qr   — activate QR code
 *         GET  /batches/:id/history — merged on+off-chain history
 */

"use strict";

const express = require("express");
const { ethers } = require("ethers");
const { randomUUID: uuidv4 } = require("crypto");
const { authenticateJWT, requireRole } = require("../middleware/auth.js");
const { validate, CreateBatchSchema, TransferCustodySchema, ActivateQRSchema } = require("../middleware/validate.js");
const {
  getDb,
  insertBatch,
  getBatchById,
  getAllBatches,
  insertTransfer,
  getTransfersByBatchId,
  insertQR,
  getQRByBatchId,
} = require("../db/database.js");

const router = express.Router();

// ─── GET /batches ─────────────────────────────────────────────────────────────

/**
 * @route GET /batches
 * @desc  Returns all honey batches (off-chain metadata with current on-chain custodian).
 *        Used for dashboard overview.
 */
router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const db = getDb();
    const batches = getAllBatches(db);
    res.json(batches);
  } catch (err) {
    next(err);
  }
});

// ─── Transfer type label map ──────────────────────────────────────────────────

const TRANSFER_LABELS = ["Harvest", "Processor", "Distributor", "Retailer"];

// ─── Helper: batchId string → bytes32 ────────────────────────────────────────

function uuidToBytes32(uuid) {
  // Stable keccak256 of the UUID string for on-chain batchId
  return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

function strToBytes32(str) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

// ─── POST /batches ─────────────────────────────────────────────────────────────

/**
 * @route POST /batches
 * @desc  Creates a honey batch on-chain and records metadata off-chain.
 * @body  {CreateBatchSchema}
 */
router.post("/", authenticateJWT, requireRole("BEEKEEPER_OPS", "ADMIN"), validate(CreateBatchSchema), async (req, res, next) => {
  try {
    const blockchain = req.app.get("blockchain");
    const db = getDb();

    const body = req.body;

    // Assign UUID if not provided
    const batchUuid = body.batch_id ?? uuidv4();

    // Check idempotency — don't re-create if already in DB
    const existing = getBatchById(db, batchUuid);
    if (existing) {
      return res.status(409).json({ error: "Batch already exists", batch_id: batchUuid });
    }

    // Build on-chain identifiers
    const batchIdBytes32   = uuidToBytes32(batchUuid);
    const metadataObj      = {
      batch_id: batchUuid, hive_id: body.hive_id, beekeeper_id: body.beekeeper_id,
      harvest_date: body.harvest_date, quantity_kg: body.quantity_kg,
      honey_type: body.honey_type, quality_grade: body.quality_grade,
    };
    const metadataHash = body.metadata_hash ??
      ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadataObj)));

    // ── On-chain call ──────────────────────────────────────────────────────────
    const txResult = await blockchain.createBatch(
      batchIdBytes32,
      metadataHash,
      body.beekeeper_addr
    );

    // ── Off-chain write ────────────────────────────────────────────────────────
    insertBatch(db, {
      batch_id:        batchUuid,
      hive_id:         body.hive_id,
      beekeeper_id:    body.beekeeper_id,
      beekeeper_name:  body.beekeeper_name ?? null,
      beekeeper_addr:  body.beekeeper_addr,
      hive_location:   body.hive_location ?? null,
      harvest_date:    body.harvest_date,
      quantity_kg:     body.quantity_kg,
      honey_type:      body.honey_type,
      quality_grade:   body.quality_grade ?? null,
      lab_report_link: body.lab_report_link ?? null,
      metadata_hash:   metadataHash,
      on_chain_tx:     txResult.txHash,
    });

    res.status(201).json({
      batch_id:      batchUuid,
      batch_id_hex:  batchIdBytes32,
      metadata_hash: metadataHash,
      tx_hash:       txResult.txHash,
      block_number:  txResult.blockNumber,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /batches/:id/transfer ────────────────────────────────────────────────

/**
 * @route POST /batches/:id/transfer
 * @desc  Records a custody transfer on-chain and in the DB.
 * @body  {TransferCustodySchema}
 */
router.post("/:id/transfer", authenticateJWT, validate(TransferCustodySchema), async (req, res, next) => {
  try {
    const blockchain = req.app.get("blockchain");
    const db = getDb();

    const batchUuid = req.params.id;
    const batchRow  = getBatchById(db, batchUuid);
    if (!batchRow) {
      return res.status(404).json({ error: "Batch not found in database", batch_id: batchUuid });
    }

    // Dynamic custody check for transfer
    const transfers = getTransfersByBatchId(db, batchUuid);
    let expectedRole = "BEEKEEPER_OPS"; // Default if no transfers yet

    if (transfers && transfers.length > 0) {
      const latestTransfer = transfers[0]; // ordered by transferred_at DESC
      // transfer_type: 0=Harvest, 1=Processor, 2=Distributor, 3=Retailer
      switch (latestTransfer.transfer_type) {
        case 0: expectedRole = "BEEKEEPER_OPS"; break;
        case 1: expectedRole = "PROCESSOR_OPS"; break;
        case 2: expectedRole = "DISTRIBUTOR_OPS"; break;
        case 3: expectedRole = "RETAILER_OPS"; break;
      }
    }

    if (req.operator.role !== "ADMIN" && req.operator.role !== expectedRole) {
      return res.status(403).json({ 
        error: "Forbidden: You are not authorized to transfer this batch at its current stage",
        expected_role: expectedRole,
        your_role: req.operator.role
      });
    }

    const batchIdBytes32 = uuidToBytes32(batchUuid);
    const body           = req.body;

    // Compute locationHash
    const locationSource = body.location_json ?? JSON.stringify({ location: "unknown" });
    const locationHash   = body.location_hash ?? strToBytes32(locationSource);

    // ── On-chain call ──────────────────────────────────────────────────────────
    const txResult = await blockchain.transferCustody(
      batchIdBytes32,
      body.to_address,
      body.transfer_type,
      locationHash
    );

    // ── Off-chain write ────────────────────────────────────────────────────────
    const transferId = uuidv4();
    insertTransfer(db, {
      transfer_id:   transferId,
      batch_id:      batchUuid,
      from_entity:   blockchain.operatorAddress,
      to_entity:     body.to_address,
      transfer_type: body.transfer_type,
      location_hash: locationHash,
      on_chain_tx:   txResult.txHash,
    });

    res.status(201).json({
      transfer_id:   transferId,
      batch_id:      batchUuid,
      from:          blockchain.operatorAddress,
      to:            body.to_address,
      transfer_type: TRANSFER_LABELS[body.transfer_type],
      location_hash: locationHash,
      tx_hash:       txResult.txHash,
      block_number:  txResult.blockNumber,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /batches/:id/qr ──────────────────────────────────────────────────────

/**
 * @route POST /batches/:id/qr
 * @desc  Activates a QR code and links it to a batch on-chain.
 * @body  {ActivateQRSchema}
 */
router.post("/:id/qr", authenticateJWT, requireRole("BEEKEEPER_OPS", "PROCESSOR_OPS", "ADMIN"), validate(ActivateQRSchema), async (req, res, next) => {
  try {
    const blockchain = req.app.get("blockchain");
    const db = getDb();

    const batchUuid = req.params.id;
    const batchRow  = getBatchById(db, batchUuid);
    if (!batchRow) {
      return res.status(404).json({ error: "Batch not found in database", batch_id: batchUuid });
    }

    const body = req.body;
    const batchIdBytes32 = uuidToBytes32(batchUuid);

    // Derive qrId from jar_serial if not explicitly provided
    const qrId = body.qr_id ?? strToBytes32(body.jar_serial);

    // ── On-chain call ──────────────────────────────────────────────────────────
    const txResult = await blockchain.activateQR(batchIdBytes32, qrId);

    // ── Off-chain write ────────────────────────────────────────────────────────
    insertQR(db, {
      qr_id:      qrId,
      batch_id:   batchUuid,
      jar_serial: body.jar_serial,
      is_active:  body.is_active ? 1 : 0,
      on_chain_tx: txResult.txHash,
    });

    res.status(201).json({
      qr_id:       qrId,
      batch_id:    batchUuid,
      jar_serial:  body.jar_serial,
      is_active:   body.is_active,
      tx_hash:     txResult.txHash,
      block_number: txResult.blockNumber,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /batches/:id/history ──────────────────────────────────────────────────

/**
 * @route GET /batches/:id/history
 * @desc  Returns merged on-chain custody chain + off-chain metadata.
 */
router.get("/:id/history", async (req, res, next) => {
  try {
    const blockchain = req.app.get("blockchain");
    const db = getDb();

    const batchUuid = req.params.id;
    const batchRow  = getBatchById(db, batchUuid);
    if (!batchRow) {
      return res.status(404).json({ error: "Batch not found in database", batch_id: batchUuid });
    }

    const batchIdBytes32 = uuidToBytes32(batchUuid);

    // ── On-chain reads ─────────────────────────────────────────────────────────
    const [onChainBatch, custodyChain] = await Promise.all([
      blockchain.getBatch(batchIdBytes32),
      blockchain.getBatchHistory(batchIdBytes32),
    ]);

    // ── Off-chain reads ────────────────────────────────────────────────────────
    const dbTransfers = getTransfersByBatchId(db, batchUuid);
    const qrRow       = getQRByBatchId(db, batchUuid);

    // Merge on-chain custody records with off-chain transfer records
    const mergedHistory = custodyChain.map((onChain, idx) => {
      const dbRecord = dbTransfers[idx] ?? {};
      return {
        step:            idx + 1,
        from:            onChain.from,
        to:              onChain.to,
        transfer_type:   TRANSFER_LABELS[onChain.transferType] ?? `Unknown(${onChain.transferType})`,
        location_hash:   onChain.locationHash,
        timestamp:       onChain.timestamp,
        timestamp_iso:   new Date(onChain.timestamp * 1000).toISOString(),
        on_chain_tx:     dbRecord.on_chain_tx ?? null,
        transfer_id:     dbRecord.transfer_id ?? null,
      };
    });

    res.json({
      batch_id:          batchUuid,
      batch_id_hex:      batchIdBytes32,
      // Off-chain enrichment
      hive_id:           batchRow.hive_id,
      beekeeper_id:      batchRow.beekeeper_id,
      beekeeper_name:    batchRow.beekeeper_name,
      hive_location:     batchRow.hive_location,
      harvest_date:      batchRow.harvest_date,
      quantity_kg:       batchRow.quantity_kg,
      honey_type:        batchRow.honey_type,
      quality_grade:     batchRow.quality_grade,
      lab_report_link:   batchRow.lab_report_link,
      // On-chain state
      metadata_hash:     onChainBatch.metadataHash,
      beekeeper_addr:    onChainBatch.beekeeper,
      current_custodian: onChainBatch.currentCustodian,
      on_chain_tx:       batchRow.on_chain_tx,
      // QR code info
      qr_code:           qrRow ? { qr_id: qrRow.qr_id, jar_serial: qrRow.jar_serial, is_active: !!qrRow.is_active } : null,
      // Custody chain
      custody_chain:     mergedHistory,
      total_transfers:   mergedHistory.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
