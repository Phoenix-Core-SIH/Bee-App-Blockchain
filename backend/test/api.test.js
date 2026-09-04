/**
 * @file   test/api.test.js
 * @notice Jest + Supertest integration tests for the HoneyChain backend API.
 *
 * The Hardhat node and contract deployment are handled by globalSetup.js
 * (runs before Jest loads any test files). Env vars passed:
 *   TEST_RPC_URL, TEST_CONTRACT_ADDRESS, TEST_OPERATOR_KEY,
 *   TEST_OPERATOR_ADDR, TEST_PROCESSOR_ADDR
 */

"use strict";

const supertest              = require("supertest");
const { ethers }             = require("ethers");

const { createApp }          = require("../src/app.js");
const { BlockchainService }  = require("../src/blockchain/BlockchainService.js");
const db                     = require("../src/db/database.js");

// ─── Config from globalSetup env vars ────────────────────────────────────────

const RPC_URL          = process.env.TEST_RPC_URL;
const CONTRACT_ADDRESS = process.env.TEST_CONTRACT_ADDRESS;
const OPERATOR_KEY     = process.env.TEST_OPERATOR_KEY;
const OPERATOR_ADDR    = process.env.TEST_OPERATOR_ADDR;
const PROCESSOR_ADDR   = process.env.TEST_PROCESSOR_ADDR;

// ─── Shared state ────────────────────────────────────────────────────────────

let app;
let request;
let blockchain;

let transferBatchId;   // batch used for transfer + history tests
let qrBatchId;         // batch used for QR tests
let createdQrId;

let adminToken;
let beekeeperToken;
let processorToken;

// ─────────────────────────────────────────────────────────────────────────────
//  Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Create a single ethers provider + wallet (shared reference prevents nonce cache split)
  const provider = new ethers.JsonRpcProvider(RPC_URL, 31337, {
    staticNetwork: true,
  });
  const wallet   = new ethers.Wallet(OPERATOR_KEY, provider);

  blockchain = new BlockchainService({
    rpcUrl:          RPC_URL,
    privateKey:      OPERATOR_KEY,
    contractAddress: CONTRACT_ADDRESS,
    provider,
    signer: wallet,
  });

  process.env.SQLITE_DB_PATH = ":memory:";
  process.env.JWT_SECRET = "testsecret";
  db.closeDb();

  app     = createApp({ blockchain });
  request = supertest(app);

  // Setup roles and login
  const database = db.getDb();
  const bcrypt = require("bcrypt");
  const pwd = await bcrypt.hash("pass", 1);
  db.insertOperator(database, { username: "admin1", password_hash: pwd, role: "ADMIN", entity_id: null });
  db.insertOperator(database, { username: "bee1", password_hash: pwd, role: "BEEKEEPER_OPS", entity_id: "hive1" });
  db.insertOperator(database, { username: "proc1", password_hash: pwd, role: "PROCESSOR_OPS", entity_id: "proc1" });

  adminToken = (await request.post("/auth/login").send({ username: "admin1", password: "pass" })).body.token;
  beekeeperToken = (await request.post("/auth/login").send({ username: "bee1", password: "pass" })).body.token;
  processorToken = (await request.post("/auth/login").send({ username: "proc1", password: "pass" })).body.token;

  // Pre-create two batches needed across multiple test groups
  // Batch A: for custody transfer tests
    const resA = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        hive_id:         "HIVE-001",
        beekeeper_id:    "BEEKEEPER-123",
        beekeeper_name:  "Alice",
        beekeeper_addr:  OPERATOR_ADDR,
        hive_location:   "{\"lat\": 12.9716, \"lng\": 77.5946}",
        harvest_date:    "2024-05-01",
        quantity_kg:     500.5,
        honey_type:      "Multiflora",
        quality_grade:   "A",
        lab_report_link: "https://kvic.gov.in/reports/lab-001.pdf",
      });
    expect(resA.status).toBe(201);
    transferBatchId = resA.body.batch_id;

    // Batch B: for QR activation tests
    const resB = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        hive_id:         "HIVE-002",
        beekeeper_id:    "BEEKEEPER-124",
        beekeeper_name:  "Bob",
        beekeeper_addr:  OPERATOR_ADDR,
        hive_location:   "{\"lat\": 13.0, \"lng\": 77.6}",
        harvest_date:    "2024-05-15",
        quantity_kg:     200.0,
        honey_type:      "Litchi",
        quality_grade:   "A+",
      });
  if (resB.status !== 201) throw new Error(`Setup batch B failed: ${JSON.stringify(resB.body)}`);
  qrBatchId = resB.body.batch_id;
}, 30_000);

afterAll(() => {
  db.closeDb();
});

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with service status and operator address", async () => {
    const res = await request.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.operator.toLowerCase()).toBe(OPERATOR_ADDR.toLowerCase());
  });
});

// ─── POST /batches ───────────────────────────────────────────────────────────

describe("GET /batches", () => {
  it("returns all batches for an authenticated user", async () => {
    const res = await request.get("/batches").set("Authorization", `Bearer ${beekeeperToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
  it("returns 401 for missing token", async () => {
    const res = await request.get("/batches");
    expect(res.status).toBe(401);
  });
});

describe("POST /batches", () => {
  it("returns 409 when the same batch_id is resubmitted (idempotency)", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        batch_id:       transferBatchId,
        hive_id:        "HIVE-KA-001",
        beekeeper_id:   "BK-001",
        beekeeper_addr: OPERATOR_ADDR,
        harvest_date:   "2024-03-15",
        quantity_kg:    10,
        honey_type:     "Multiflora",
      });
    expect(res.status).toBe(409);
  });

  it("returns 422 for missing required fields", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({ honey_type: "Multiflora" });
    expect(res.status).toBe(422);
  });

  it("returns 422 for an invalid Ethereum address", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        // other fields omitted, Zod handles it
        beekeeper_addr: "0xInvalid",
        hive_id: "1", beekeeper_id: "1", beekeeper_name: "1", harvest_date: "2024-01-01", quantity_kg: 1
      });
    expect(res.status).toBe(422);
  });

  it("returns 422 for DD-MM-YYYY date format", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        beekeeper_addr: OPERATOR_ADDR, harvest_date: "31-12-2024",
        hive_id: "1", beekeeper_id: "1", beekeeper_name: "1", quantity_kg: 1
      });
    expect(res.status).toBe(422);
  });

  it("returns 422 for a negative quantity_kg", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        beekeeper_addr: OPERATOR_ADDR, harvest_date: "2024-12-31", quantity_kg: -10,
        hive_id: "1", beekeeper_id: "1", beekeeper_name: "1"
      });
    expect(res.status).toBe(422);
  });
  
  it("returns 401 for no token", async () => {
    const res = await request.post("/batches").send({
      hive_id: "1", beekeeper_id: "1", beekeeper_name: "1", beekeeper_addr: OPERATOR_ADDR, harvest_date: "2024-01-01", quantity_kg: 1
    });
    expect(res.status).toBe(401);
  });
  
  it("returns 403 for role mismatch", async () => {
    const res = await request.post("/batches")
      .set("Authorization", `Bearer ${processorToken}`)
      .send({
        hive_id: "1", beekeeper_id: "1", beekeeper_name: "1", beekeeper_addr: OPERATOR_ADDR, harvest_date: "2024-01-01", quantity_kg: 1
      });
    expect(res.status).toBe(403);
  });
});

// ─── POST /batches/:id/transfer ──────────────────────────────────────────────

describe("POST /batches/:id/transfer", () => {
  it("records Processor custody transfer on-chain + DB", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`)
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        to_address:    PROCESSOR_ADDR,
        transfer_type: 1, // Processor
        location_json: "{\"facility\": \"Mega Processors Ltd\"}",
      });
    expect(res.status).toBe(201);
    expect(res.body.transfer_id).toBeDefined();
    expect(res.body.tx_hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(res.body.to.toLowerCase()).toBe(PROCESSOR_ADDR.toLowerCase());
    expect(res.body.transfer_type).toBe("Processor");
  });

  it("returns 403 when operator is no longer custodian (reverted on-chain)", async () => {
    // transferBatchId is now held by PROCESSOR_ADDR.
    // Operator wallet (0xf39...) is no longer the custodian.
    // If the operator tries to transfer it again, it should fail.
    // NOTE: This triggers the dynamic role check FIRST.
    // To test on-chain revert, we use the Processor token so it passes the role check.
    const res = await request.post(`/batches/${transferBatchId}/transfer`)
      .set("Authorization", `Bearer ${processorToken}`)
      .send({
        to_address:    PROCESSOR_ADDR,
        transfer_type: 2, // Distributor
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/custodian/);
  });

  it("returns 404 for a non-existent batch ID", async () => {
    const res = await request.post("/batches/00000000-0000-0000-0000-000000000000/transfer")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        to_address: PROCESSOR_ADDR, transfer_type: 1
      });
    expect(res.status).toBe(404);
  });

  it("returns 422 for transfer_type > 3", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`)
      .set("Authorization", `Bearer ${processorToken}`)
      .send({
        to_address: PROCESSOR_ADDR, transfer_type: 4
      });
    expect(res.status).toBe(422);
  });
  
  it("returns 403 for role mismatch on dynamic custody check", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`)
      .set("Authorization", `Bearer ${beekeeperToken}`)
      .send({
        to_address: PROCESSOR_ADDR, transfer_type: 2
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
  });
});

// ─── POST /batches/:id/qr ────────────────────────────────────────────────────

describe("POST /batches/:id/qr", () => {
  it("activates a QR code and links it to the batch on-chain + DB", async () => {
    const res = await request.post(`/batches/${qrBatchId}/qr`)
      .set("Authorization", `Bearer ${processorToken}`)
      .send({
        jar_serial: "JAR-2024-KA-001",
        is_active:  true,
      });
    expect(res.status).toBe(201);
    expect(res.body.qr_id).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(res.body.jar_serial).toBe("JAR-2024-KA-001");
    expect(res.body.tx_hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    createdQrId = res.body.qr_id;
  });

  it("returns 409 when QR already activated on same batch (QRAlreadyActivated)", async () => {
    const res = await request.post(`/batches/${qrBatchId}/qr`)
      .set("Authorization", `Bearer ${processorToken}`)
      .send({
        jar_serial: "JAR-2024-KA-DUPE", is_active: true,
      });
    expect(res.status).toBe(409);
  });

  it("returns 404 for a non-existent batch", async () => {
    const res = await request.post("/batches/00000000-0000-0000-0000-000000000000/qr")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ jar_serial: "JAR-999", is_active: true });
    expect(res.status).toBe(404);
  });

  it("returns 422 when jar_serial is missing", async () => {
    const res = await request.post(`/batches/${qrBatchId}/qr`)
      .set("Authorization", `Bearer ${processorToken}`)
      .send({ is_active: true });
    expect(res.status).toBe(422);
  });
});

// ─── GET /batches/:id/history ────────────────────────────────────────────────

describe("GET /batches/:id/history", () => {
  it("returns merged on+off-chain history with all expected fields", async () => {
    const res = await request.get(`/batches/${transferBatchId}/history`);
    expect(res.status).toBe(200);
    const b = res.body;
    expect(b.batch_id).toBe(transferBatchId);
    expect(b.hive_id).toBe("HIVE-001");
    expect(b.beekeeper_name).toBe("Alice");
    expect(b.honey_type).toBe("Multiflora");
    expect(b.quality_grade).toBe("A");
    expect(b.lab_report_link).toBe("https://kvic.gov.in/reports/lab-001.pdf");
    expect(b.metadata_hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(b.custody_chain).toBeInstanceOf(Array);
    expect(b.custody_chain.length).toBeGreaterThanOrEqual(1);
    expect(b.custody_chain[0].from).toBeDefined();
    expect(b.custody_chain[0].to).toBeDefined();
    expect(b.custody_chain[0].timestamp_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns 404 for a non-existent batch", async () => {
    const res = await request.get("/batches/00000000-0000-0000-0000-000000000000/history");
    expect(res.status).toBe(404);
  });
});

// ─── GET /public/verify/:qrCodeValue ─────────────────────────────────────────

describe("GET /public/verify/:qrCodeValue", () => {
  it("verifies by bytes32 qrId and returns full provenance", async () => {
    const res = await request.get(`/public/verify/${createdQrId}`);
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.batch_id).toBe(qrBatchId);
    expect(res.body.honey_type).toBe("Litchi");
    expect(res.body.beekeeper_name).toBe("Bob");
    expect(res.body.custody_chain).toBeInstanceOf(Array);
  });

  it("verifies by raw jar_serial string (normalised to bytes32 internally)", async () => {
    const res = await request.get("/public/verify/JAR-2024-KA-001");
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.jar_serial).toBe("JAR-2024-KA-001");
  });

  it("returns 404 + verified=false for unknown QR code", async () => {
    const res = await request.get("/public/verify/completely-fake-qr-xyz999abc");
    expect(res.status).toBe(404);
    expect(res.body.verified).toBe(false);
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

describe("404 handler", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request.get("/totally/unknown/route");
    expect(res.status).toBe(404);
  });
});
