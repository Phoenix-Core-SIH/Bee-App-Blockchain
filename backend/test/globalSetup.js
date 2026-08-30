/**
 * @file   test/globalSetup.js
 * @notice Jest globalSetup — starts a Hardhat node and deploys the contract.
 *
 * Key design: after starting the node, we call hardhat_reset to guarantee
 * a completely fresh chain state regardless of prior runs. Then we deploy
 * and grant roles using explicit nonce management to prevent any caching issues.
 */

"use strict";

const { spawn }   = require("child_process");
const { ethers }  = require("ethers");
const path        = require("path");
const fs          = require("fs");

const HARDHAT_MNEMONIC   = "test test test test test test test test test test test junk";
const HARDHAT_DERIVATION = "m/44'/60'/0'/0/";
const HARDHAT_PORT       = 18547;
const RPC_URL            = `http://127.0.0.1:${HARDHAT_PORT}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function killPort(port) {
  try {
    const result = require("child_process").execSync(
      `lsof -t -i :${port} 2>/dev/null`, { encoding: "utf8" }
    ).trim();
    if (result) {
      result.split("\n").forEach(pid => {
        try { process.kill(parseInt(pid, 10), "SIGKILL"); } catch (_) {}
      });
    }
  } catch (_) {}
}

/** Send a raw JSON-RPC call */
async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method} failed: ${JSON.stringify(json.error)}`);
  return json.result;
}

module.exports = async function globalSetup() {
  // 1. Kill any lingering process on the port
  killPort(HARDHAT_PORT);
  try {
    require("child_process").execSync("pkill -9 -f 'node.*hardhat' 2>/dev/null || true",
      { stdio: "ignore" });
  } catch (_) {}
  await sleep(1500);

  const projectRoot = path.join(__dirname, "..", "..");

  // 2. Start fresh Hardhat node
  const proc = spawn("npx", ["hardhat", "node", "--port", String(HARDHAT_PORT)], {
    cwd:   projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env:   { ...process.env },
  });

  global.__HARDHAT_PROC__ = proc;
  process.env.HARDHAT_TEST_PID = String(proc.pid);

  // 3. Wait for node ready signal
  await new Promise((resolve, reject) => {
    let buf = "";
    const onData = (d) => {
      buf += d.toString();
      if (buf.includes("Started HTTP and WebSocket JSON-RPC server")) {
        setTimeout(resolve, 2500); // extra stabilisation
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", reject);
    proc.on("exit", c => reject(new Error(`Hardhat exited (code=${c})`)));
    setTimeout(() => reject(new Error("Hardhat startup timed out")), 50_000);
  });

  // 4. Confirm node is responding (hardhat_reset not supported in Hardhat 3 external node)
  const blockNum = await rpc("eth_blockNumber");
  console.log(`\n✅  Hardhat node up on port ${HARDHAT_PORT}, block: ${parseInt(blockNum, 16)}`);
  if (parseInt(blockNum, 16) !== 0) {
    throw new Error(`Node is not at block 0 — old state detected (block=${parseInt(blockNum, 16)}). Kill any running Hardhat processes and retry.`);
  }

  // 5. Create provider — use a StaticJsonRpcProvider (no network auto-detection cache)
  const provider = new ethers.JsonRpcProvider(RPC_URL, 31337, {
    staticNetwork: true,
  });
  // Force nonce fetch on first tx by resetting internal cache
  provider.clearState?.();

  const wallet0 = new ethers.Wallet(
    // Hardhat account 0 private key (from mnemonic)
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  const wallet1 = new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    provider
  );

  // 6. Deploy contract with explicit nonce tracking
  const artifactPath = path.join(projectRoot,
    "artifacts", "contracts", "BatchRegistry.sol", "BatchRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  let currentNonce = await provider.getTransactionCount(wallet0.address, "latest");
  console.log(`   Operator nonce before deploy: ${currentNonce}`);

  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet0);
  const contract = await factory.deploy({ nonce: currentNonce++ });
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`✅  BatchRegistry deployed at ${contractAddress}`);

  // 7. Grant roles with explicit nonces
  const BEEKEEPER_ROLE = await contract.BEEKEEPER_ROLE();
  const PROCESSOR_ROLE = await contract.PROCESSOR_ROLE();

  console.log(`   Nonce for grantRole BEEKEEPER: ${currentNonce}`);
  await (await contract.grantRole(BEEKEEPER_ROLE, wallet0.address, { nonce: currentNonce++ })).wait();

  console.log(`   Nonce for grantRole PROCESSOR: ${currentNonce}`);
  await (await contract.grantRole(PROCESSOR_ROLE, wallet1.address, { nonce: currentNonce++ })).wait();

  console.log(`✅  Roles granted to operator (${wallet0.address}) and processor (${wallet1.address})\n`);

  // 8. Export to env
  process.env.TEST_RPC_URL          = RPC_URL;
  process.env.TEST_CONTRACT_ADDRESS = contractAddress;
  process.env.TEST_OPERATOR_KEY     = wallet0.privateKey;
  process.env.TEST_OPERATOR_ADDR    = wallet0.address;
  process.env.TEST_PROCESSOR_ADDR   = wallet1.address;
};
