/**
 * @file   scripts/deploy.js
 * @notice Deploys BatchRegistry to the selected network, optionally grants
 *         BEEKEEPER_ROLE to a list of addresses from the environment, and
 *         writes the deployed address to stdout (and optionally to a file).
 *
 * Usage:
 *   # Local Hardhat network
 *   npx hardhat run scripts/deploy.js --network hardhatLocal
 *
 *   # External Hardhat node (npx hardhat node running in another terminal)
 *   npx hardhat run scripts/deploy.js --network localhost
 *
 *   # Polygon Amoy testnet
 *   npx hardhat run scripts/deploy.js --network amoy
 *
 * Environment variables (see .env.example):
 *   PRIVATE_KEY              — deployer wallet private key
 *   AMOY_RPC_URL             — Polygon Amoy RPC endpoint
 *   INITIAL_BEEKEEPERS       — comma-separated addresses to grant BEEKEEPER_ROLE
 *   INITIAL_PROCESSORS       — comma-separated addresses to grant PROCESSOR_ROLE
 */

import { network } from "hardhat";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers } = await network.create();

  const [deployer] = await ethers.getSigners();
  console.log("\n🍯  HoneyChain — BatchRegistry Deployment");
  console.log("━".repeat(50));
  console.log(`📡  Network      : ${network.name}`);
  console.log(`🔑  Deployer     : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰  Balance      : ${ethers.formatEther(balance)} ETH/MATIC`);

  // ── Deploy ──────────────────────────────────────────────────────────────────
  console.log("\n⏳  Deploying BatchRegistry...");
  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const registry = await BatchRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`✅  Deployed at  : ${contractAddress}`);
  console.log(`📦  Tx hash      : ${registry.deploymentTransaction()?.hash ?? "n/a"}`);

  // ── Role constants ───────────────────────────────────────────────────────────
  const BEEKEEPER_ROLE   = await registry.BEEKEEPER_ROLE();
  const PROCESSOR_ROLE   = await registry.PROCESSOR_ROLE();
  const DISTRIBUTOR_ROLE = await registry.DISTRIBUTOR_ROLE();
  const RETAILER_ROLE    = await registry.RETAILER_ROLE();
  const ADMIN_ROLE       = await registry.ADMIN_ROLE();

  console.log("\n🔐  Role identifiers:");
  console.log(`    ADMIN_ROLE       : ${ADMIN_ROLE}`);
  console.log(`    BEEKEEPER_ROLE   : ${BEEKEEPER_ROLE}`);
  console.log(`    PROCESSOR_ROLE   : ${PROCESSOR_ROLE}`);
  console.log(`    DISTRIBUTOR_ROLE : ${DISTRIBUTOR_ROLE}`);
  console.log(`    RETAILER_ROLE    : ${RETAILER_ROLE}`);

  // ── Grant initial roles if provided ─────────────────────────────────────────
  const grantRoles = async (envVar, roleHash, roleName) => {
    const addresses = (process.env[envVar] ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    for (const addr of addresses) {
      console.log(`\n🎖️   Granting ${roleName} to ${addr}...`);
      const tx = await registry.grantRole(roleHash, addr);
      await tx.wait();
      console.log(`    ✅  Done (tx: ${tx.hash})`);
    }
  };

  await grantRoles("INITIAL_BEEKEEPERS",   BEEKEEPER_ROLE,   "BEEKEEPER_ROLE");
  await grantRoles("INITIAL_PROCESSORS",   PROCESSOR_ROLE,   "PROCESSOR_ROLE");
  await grantRoles("INITIAL_DISTRIBUTORS", DISTRIBUTOR_ROLE, "DISTRIBUTOR_ROLE");
  await grantRoles("INITIAL_RETAILERS",    RETAILER_ROLE,    "RETAILER_ROLE");

  // ── Write contract.json for backend ─────────────────────────────────────────
  const artifactPath = join(__dirname, "..", "artifacts", "contracts", "BatchRegistry.sol", "BatchRegistry.json");
  const artifactData = JSON.parse(readFileSync(artifactPath, "utf8"));
  
  const configDir = join(__dirname, "..", "backend", "src", "config");
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, "contract.json");
  
  const configContent = {
    network: network.name,
    address: contractAddress,
    deployer: deployer.address,
    roles: {
      ADMIN: ADMIN_ROLE,
      BEEKEEPER: BEEKEEPER_ROLE,
      PROCESSOR: PROCESSOR_ROLE,
      DISTRIBUTOR: DISTRIBUTOR_ROLE,
      RETAILER: RETAILER_ROLE
    },
    abi: artifactData.abi
  };
  
  writeFileSync(configPath, JSON.stringify(configContent, null, 2), "utf8");
  console.log(`\n📝  Wrote deployment info to backend/src/config/contract.json`);


  console.log("\n🎉  Deployment complete!\n");
  console.log("━".repeat(50));
  console.log("To interact via the backend, set in your .env:");
  console.log(`    CONTRACT_ADDRESS=${contractAddress}`);
  console.log("━".repeat(50));

  return contractAddress;
}

main().catch((err) => {
  console.error("\n❌  Deployment failed:", err);
  process.exit(1);
});
