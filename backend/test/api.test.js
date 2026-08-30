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
  db.closeDb();

  app     = createApp({ blockchain });
  request = supertest(app);

  // Pre-create two batches needed across multiple test groups
  // Batch A: for custody transfer tests
  const resA = await request.post("/batches").send({
    hive_id:         "HIVE-KA-001",
    beekeeper_id:    "BK-001",
    beekeeper_name:  "Ramesh Kumar",
    beekeeper_addr:  OPERATOR_ADDR,
    hive_location:   "Coorg, Karnataka",
    harvest_date:    "2024-03-15",
    quantity_kg:     50.5,
    honey_type:      "Multiflora",
    quality_grade:   "A+",
    lab_report_link: "https://kvic.gov.in/reports/lab-001.pdf",
  });
  if (resA.status !== 201) throw new Error(`Setup batch A failed: ${JSON.stringify(resA.body)}`);
  transferBatchId = resA.body.batch_id;

  // Batch B: for QR activation tests (operator stays custodian — no transfer before QR)
  const resB = await request.post("/batches").send({
    hive_id:        "HIVE-KA-002",
    beekeeper_id:   "BK-002",
    beekeeper_name: "Sita Devi",
    beekeeper_addr: OPERATOR_ADDR,
    harvest_date:   "2024-04-01",
    quantity_kg:    30,
    honey_type:     "Litchi",
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

describe("POST /batches", () => {
  it("returns 409 when the same batch_id is resubmitted (idempotency)", async () => {
    const res = await request.post("/batches").send({
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
    const res = await request.post("/batches").send({ hive_id: "HIVE-001" });
    if (res.status !== 422) console.log("FAILED 422 TEST BODY:", res.body);
    expect(res.status).toBe(422);
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("returns 422 for an invalid Ethereum address", async () => {
    const res = await request.post("/batches").send({
      hive_id: "H", beekeeper_id: "B", beekeeper_addr: "bad-addr",
      harvest_date: "2024-03-15", quantity_kg: 10, honey_type: "X",
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for DD-MM-YYYY date format", async () => {
    const res = await request.post("/batches").send({
      hive_id: "H", beekeeper_id: "B", beekeeper_addr: OPERATOR_ADDR,
      harvest_date: "15-03-2024", quantity_kg: 10, honey_type: "X",
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for a negative quantity_kg", async () => {
    const res = await request.post("/batches").send({
      hive_id: "H", beekeeper_id: "B", beekeeper_addr: OPERATOR_ADDR,
      harvest_date: "2024-03-15", quantity_kg: -1, honey_type: "X",
    });
    expect(res.status).toBe(422);
  });
});

// ─── POST /batches/:id/transfer ──────────────────────────────────────────────

describe("POST /batches/:id/transfer", () => {
  it("records Processor custody transfer on-chain + DB", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`).send({
      to_address:    PROCESSOR_ADDR,
      transfer_type: 1,
      location_json: JSON.stringify({ facility: "Coorg Processing", lat: 12.3, lng: 75.8 }),
    });
    expect(res.status).toBe(201);
    expect(res.body.transfer_id).toBeDefined();
    expect(res.body.tx_hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(res.body.to.toLowerCase()).toBe(PROCESSOR_ADDR.toLowerCase());
    expect(res.body.transfer_type).toBe("Processor");
  });

  it("returns 403 when operator is no longer custodian (reverted on-chain)", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`).send({
      to_address: OPERATOR_ADDR, transfer_type: 2,
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("custodian");
  });

  it("returns 404 for a non-existent batch ID", async () => {
    const res = await request.post("/batches/00000000-0000-0000-0000-000000000000/transfer")
      .send({ to_address: PROCESSOR_ADDR, transfer_type: 1 });
    expect(res.status).toBe(404);
  });

  it("returns 422 for transfer_type > 3", async () => {
    const res = await request.post(`/batches/${transferBatchId}/transfer`)
      .send({ to_address: PROCESSOR_ADDR, transfer_type: 99 });
    expect(res.status).toBe(422);
  });
});

// ─── POST /batches/:id/qr ────────────────────────────────────────────────────

describe("POST /batches/:id/qr", () => {
  it("activates a QR code and links it to the batch on-chain + DB", async () => {
    const res = await request.post(`/batches/${qrBatchId}/qr`).send({
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
    const res = await request.post(`/batches/${qrBatchId}/qr`).send({
      jar_serial: "JAR-2024-KA-DUPE", is_active: true,
    });
    expect(res.status).toBe(409);
  });

  it("returns 404 for a non-existent batch", async () => {
    const res = await request.post("/batches/00000000-0000-0000-0000-000000000000/qr")
      .send({ jar_serial: "JAR-999", is_active: true });
    expect(res.status).toBe(404);
  });

  it("returns 422 when jar_serial is missing", async () => {
    const res = await request.post(`/batches/${qrBatchId}/qr`).send({ is_active: true });
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
    expect(b.hive_id).toBe("HIVE-KA-001");
    expect(b.beekeeper_name).toBe("Ramesh Kumar");
    expect(b.honey_type).toBe("Multiflora");
    expect(b.quality_grade).toBe("A+");
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
    expect(res.body.beekeeper_name).toBe("Sita Devi");
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
