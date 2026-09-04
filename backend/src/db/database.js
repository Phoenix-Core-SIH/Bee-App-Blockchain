/**
 * @file   src/db/database.js
 * @notice SQLite database layer for off-chain batch metadata.
 *         Schema mirrors the ERD: batches, batch_transfers, qr_activations.
 *         Uses better-sqlite3 (synchronous API) for simplicity.
 *         Swap the Database constructor call to a Postgres client for production.
 */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");

// Allow callers to override DB path via env (use :memory: for tests)
const DB_PATH = process.env.SQLITE_DB_PATH ?? path.join(__dirname, "..", "..", "honeychain.db");

/** @type {import('better-sqlite3').Database} */
let db;

/**
 * Returns the singleton database connection.
 * Initialises the schema on first call.
 *
 * @param {string} [dbPath] - Override path (useful for tests).
 * @returns {import('better-sqlite3').Database}
 */
function getDb(dbPath) {
  if (!db) {
    const defaultPath = process.env.SQLITE_DB_PATH ?? path.join(__dirname, "..", "..", "honeychain.db");
    db = new Database(dbPath ?? defaultPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

/**
 * Close and reset the connection (used in tests to get a clean slate).
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      batch_id        TEXT PRIMARY KEY,
      hive_id         TEXT,
      beekeeper_id    TEXT,
      beekeeper_name  TEXT,
      beekeeper_addr  TEXT NOT NULL,
      hive_location   TEXT,
      harvest_date    TEXT,
      quantity_kg     REAL,
      honey_type      TEXT,
      quality_grade   TEXT,
      lab_report_link TEXT,
      metadata_hash   TEXT NOT NULL,
      on_chain_tx     TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS batch_transfers (
      transfer_id   TEXT PRIMARY KEY,
      batch_id      TEXT NOT NULL REFERENCES batches(batch_id),
      from_entity   TEXT NOT NULL,
      to_entity     TEXT NOT NULL,
      transfer_type INTEGER NOT NULL,
      location_hash TEXT,
      on_chain_tx   TEXT,
      transferred_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qr_activations (
      qr_id         TEXT PRIMARY KEY,
      batch_id      TEXT NOT NULL REFERENCES batches(batch_id),
      jar_serial    TEXT,
      is_active     INTEGER DEFAULT 1,
      on_chain_tx   TEXT,
      activated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operators (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL,
      entity_id     TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

function insertBatch(db, batch) {
  db.prepare(`
    INSERT INTO batches
      (batch_id, hive_id, beekeeper_id, beekeeper_name, beekeeper_addr,
       hive_location, harvest_date, quantity_kg, honey_type, quality_grade,
       lab_report_link, metadata_hash, on_chain_tx)
    VALUES
      (@batch_id, @hive_id, @beekeeper_id, @beekeeper_name, @beekeeper_addr,
       @hive_location, @harvest_date, @quantity_kg, @honey_type, @quality_grade,
       @lab_report_link, @metadata_hash, @on_chain_tx)
  `).run(batch);
}

function getBatchById(db, batchId) {
  return db.prepare("SELECT * FROM batches WHERE batch_id = ?").get(batchId);
}

function getAllBatches(db) {
  return db.prepare("SELECT * FROM batches ORDER BY created_at DESC").all();
}

// ─── Transfer helpers ─────────────────────────────────────────────────────────

function insertTransfer(db, transfer) {
  db.prepare(`
    INSERT INTO batch_transfers
      (transfer_id, batch_id, from_entity, to_entity, transfer_type, location_hash, on_chain_tx)
    VALUES
      (@transfer_id, @batch_id, @from_entity, @to_entity, @transfer_type, @location_hash, @on_chain_tx)
  `).run(transfer);
}

function getTransfersByBatchId(db, batchId) {
  return db.prepare(
    "SELECT * FROM batch_transfers WHERE batch_id = ? ORDER BY transferred_at ASC"
  ).all(batchId);
}

// ─── QR helpers ───────────────────────────────────────────────────────────────

function insertQR(db, qr) {
  db.prepare(`
    INSERT INTO qr_activations
      (qr_id, batch_id, jar_serial, is_active, on_chain_tx)
    VALUES
      (@qr_id, @batch_id, @jar_serial, @is_active, @on_chain_tx)
  `).run(qr);
}

function getQRByBatchId(db, batchId) {
  return db.prepare("SELECT * FROM qr_activations WHERE batch_id = ?").get(batchId);
}

function getQRByQrId(db, qrId) {
  return db.prepare("SELECT * FROM qr_activations WHERE qr_id = ?").get(qrId);
}

function getBatchByQrId(db, qrId) {
  return db.prepare(`
    SELECT b.*, q.qr_id, q.jar_serial, q.is_active
    FROM qr_activations q
    JOIN batches b ON b.batch_id = q.batch_id
    WHERE q.qr_id = ?
  `).get(qrId);
}

// ─── Operator helpers ────────────────────────────────────────────────────────

function insertOperator(db, op) {
  db.prepare(`
    INSERT INTO operators (username, password_hash, role, entity_id)
    VALUES (@username, @password_hash, @role, @entity_id)
  `).run(op);
}

function getOperatorByUsername(db, username) {
  return db.prepare(`SELECT * FROM operators WHERE username = ?`).get(username);
}

module.exports = {
  getDb,
  closeDb,
  initSchema,
  insertBatch,
  getBatchById,
  getAllBatches,
  insertTransfer,
  getTransfersByBatchId,
  insertQR,
  getQRByBatchId,
  getQRByQrId,
  getBatchByQrId,
  insertOperator,
  getOperatorByUsername,
};
