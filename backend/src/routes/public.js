/**
 * @file   src/routes/public.js
 * @notice Public (unauthenticated) route for consumer QR code scanning.
 *         GET /public/verify/:qrCodeValue
 *
 * The qrCodeValue can be:
 *   - The raw jar_serial string (e.g. "JAR-2024-001")
 *   - A bytes32 hex qrId (0x + 64 hex chars)
 * The route normalises both to bytes32 and looks up on-chain + DB.
 */

"use strict";

const express = require("express");
const { ethers } = require("ethers");
const {
  getDb,
  getBatchById,
  getTransfersByBatchId,
  getQRByQrId,
  getBatchByQrId,
} = require("../db/database.js");

const router = express.Router();

const TRANSFER_LABELS = ["Harvest", "Processor", "Distributor", "Retailer"];

/** Convert a raw string to bytes32 keccak256 hex */
function strToBytes32(str) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

function uuidToBytes32(uuid) {
  return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

/** Test whether a string looks like a bytes32 hex value */
function isBytes32(str) {
  return /^0x[0-9a-fA-F]{64}$/.test(str);
}

/**
 * @route GET /public/verify/:qrCodeValue
 * @desc  Consumer-facing QR scan: resolves QR → batch → full provenance.
 *        Returns batch metadata + custody chain for display on a consumer app.
 * @access Public (no authentication required)
 */
router.get("/verify/:qrCodeValue", async (req, res, next) => {
  try {
    const blockchain   = req.app.get("blockchain");
    const db           = getDb();
    const rawQrValue   = req.params.qrCodeValue;

    // Normalise: if already bytes32, use as-is; otherwise hash it
    const qrIdBytes32  = isBytes32(rawQrValue) ? rawQrValue : strToBytes32(rawQrValue);

    // ── 1. Check DB for QR activation record ──────────────────────────────────
    const qrRow = getQRByQrId(db, qrIdBytes32);
    if (!qrRow || !qrRow.is_active) {
      return res.status(404).json({
        verified: false,
        error:    "QR code not found or not active",
        qr_id:    qrIdBytes32,
      });
    }

    const batchUuid = qrRow.batch_id;
    const batchRow  = getBatchById(db, batchUuid);

    // ── 2. Get on-chain batch and history ─────────────────────────────────────
    const batchIdBytes32 = uuidToBytes32(batchUuid);
    let onChainBatch, custodyChain;
    try {
      [onChainBatch, custodyChain] = await Promise.all([
        blockchain.getBatch(batchIdBytes32),
        blockchain.getBatchHistory(batchIdBytes32),
      ]);
    } catch (blockchainErr) {
      // If chain is unavailable, return partial data from DB
      console.warn("[Public verify] Blockchain unavailable, falling back to DB only:", blockchainErr.message);
      return res.json({
        verified:       true,
        warning:        "Blockchain node temporarily unavailable — data from local cache",
        qr_id:          qrIdBytes32,
        jar_serial:     qrRow.jar_serial,
        batch_id:       batchUuid,
        honey_type:     batchRow?.honey_type ?? null,
        beekeeper_name: batchRow?.beekeeper_name ?? null,
        harvest_date:   batchRow?.harvest_date ?? null,
        quality_grade:  batchRow?.quality_grade ?? null,
        lab_report:     batchRow?.lab_report_link ?? null,
        custody_chain:  [],
      });
    }

    // ── 3. Build provenance response ──────────────────────────────────────────
    const dbTransfers = getTransfersByBatchId(db, batchUuid);

    const custodyChainFormatted = custodyChain.map((rec, idx) => ({
      step:          idx + 1,
      stage:         TRANSFER_LABELS[rec.transferType] ?? "Unknown",
      from:          rec.from,
      to:            rec.to,
      timestamp_iso: new Date(rec.timestamp * 1000).toISOString(),
      location_hash: rec.locationHash,
      tx:            dbTransfers[idx]?.on_chain_tx ?? null,
    }));

    res.json({
      verified:          true,
      qr_id:             qrIdBytes32,
      jar_serial:        qrRow.jar_serial,
      // Batch identity
      batch_id:          batchUuid,
      batch_id_hex:      batchIdBytes32,
      metadata_hash:     onChainBatch.metadataHash,
      // Off-chain enrichment (consumer-friendly fields)
      honey_type:        batchRow?.honey_type ?? null,
      beekeeper_name:    batchRow?.beekeeper_name ?? null,
      beekeeper_id:      batchRow?.beekeeper_id ?? null,
      hive_location:     batchRow?.hive_location ?? null,
      harvest_date:      batchRow?.harvest_date ?? null,
      quantity_kg:       batchRow?.quantity_kg ?? null,
      quality_grade:     batchRow?.quality_grade ?? null,
      lab_report:        batchRow?.lab_report_link ?? null,
      // On-chain state
      current_custodian: onChainBatch.currentCustodian,
      // Supply chain journey
      custody_chain:     custodyChainFormatted,
      total_transfers:   custodyChainFormatted.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
