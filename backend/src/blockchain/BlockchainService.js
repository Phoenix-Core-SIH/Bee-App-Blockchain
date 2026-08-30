/**
 * @file   src/blockchain/BlockchainService.js
 * @notice Wraps ethers.js v6 calls to the deployed BatchRegistry contract.
 *         Provides clean error handling — revert reasons are parsed into
 *         structured ApiError objects instead of leaking raw RPC errors.
 *
 * Design: single operator model — one wallet signs all transactions.
 * For multi-custodian flows, swap `this.signer` for wallet injection.
 */

"use strict";

const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// ─── Load ABI from Hardhat artifacts ─────────────────────────────────────────

function loadABI() {
  // Try standard Hardhat artifacts path (relative to project root)
  const artifactPaths = [
    // When running from backend/
    path.join(__dirname, "..", "..", "..", "artifacts", "contracts", "BatchRegistry.sol", "BatchRegistry.json"),
    // When artifacts are copied next to backend
    path.join(__dirname, "..", "artifacts", "BatchRegistry.json"),
  ];

  for (const p of artifactPaths) {
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
      return artifact.abi;
    }
  }

  // Fallback: inline minimal ABI (useful if artifacts dir isn't available)
  throw new Error(
    "BatchRegistry artifact not found. Run `npx hardhat compile` first.\n" +
    "Expected at: " + artifactPaths[0]
  );
}

// ─── ApiError ─────────────────────────────────────────────────────────────────

/**
 * Structured API error produced by BlockchainService.
 * Includes a human-readable message and an HTTP status code suggestion.
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ─── Revert reason parser ─────────────────────────────────────────────────────

/**
 * Maps contract custom error names to human-readable messages and HTTP codes.
 */
const CUSTOM_ERROR_MAP = {
  BatchAlreadyExists:    { msg: "A batch with this ID already exists on-chain",          status: 409 },
  BatchNotFound:         { msg: "Batch not found on-chain",                               status: 404 },
  NotCurrentCustodian:   { msg: "Caller is not the current custodian of this batch",      status: 403 },
  QRAlreadyActivated:    { msg: "A QR code is already linked to this batch",              status: 409 },
  QRIdAlreadyUsed:       { msg: "This QR code is already linked to another batch",        status: 409 },
  InvalidTransferType:   { msg: "Transfer type must be 0 (Harvest), 1, 2, or 3 (Retailer)", status: 400 },
  ZeroAddress:           { msg: "Address parameter must not be the zero address",         status: 400 },
  AccessControlUnauthorizedAccount: {
    msg: "Caller does not have the required role to perform this action",
    status: 403,
  },
};

/**
 * Parses an ethers.js error (from a reverted transaction) into an ApiError.
 *
 * @param {Error} err - The raw error from ethers
 * @param {ethers.Contract} contract - Used to decode custom errors
 * @returns {ApiError}
 */
function parseContractError(err, contract) {
  // ethers v6 wraps contract errors in err.revert
  if (err.revert) {
    const name = err.revert.name;
    const mapped = CUSTOM_ERROR_MAP[name];
    if (mapped) {
      return new ApiError(mapped.msg, mapped.status, {
        errorName: name,
        args: err.revert.args ? [...err.revert.args].map(String) : [],
      });
    }
    return new ApiError(`Contract error: ${name}`, 400, { errorName: name });
  }

  // Try to decode from raw data
  if (err.data && contract) {
    try {
      const decoded = contract.interface.parseError(err.data);
      if (decoded) {
        const mapped = CUSTOM_ERROR_MAP[decoded.name];
        if (mapped) {
          return new ApiError(mapped.msg, mapped.status, {
            errorName: decoded.name,
            args: decoded.args ? [...decoded.args].map(String) : [],
          });
        }
        return new ApiError(`Contract error: ${decoded.name}`, 400, {
          errorName: decoded.name,
        });
      }
    } catch (_) {
      // fall through
    }
  }

  // String revert reason
  if (err.reason) {
    return new ApiError(err.reason, 400, { raw: err.reason });
  }

  // Insufficient funds, network issues, etc.
  if (err.code === "INSUFFICIENT_FUNDS") {
    return new ApiError("Operator wallet has insufficient funds to send this transaction", 503);
  }
  if (err.code === "NETWORK_ERROR" || err.code === "SERVER_ERROR") {
    return new ApiError("Blockchain node unavailable — try again later", 503);
  }

  // Unknown — expose error during testing
  console.error("[BlockchainService] Unhandled error:", err);
  return new ApiError(`An unexpected blockchain error occurred: ${err.message}`, 500);
}

// ─── BlockchainService ────────────────────────────────────────────────────────

class BlockchainService {
  /**
   * @param {object} opts
   * @param {string}  opts.rpcUrl           - JSON-RPC endpoint
   * @param {string}  opts.privateKey       - Operator wallet private key
   * @param {string}  opts.contractAddress  - Deployed BatchRegistry address
   * @param {object}  [opts.provider]       - Optional pre-built ethers provider (for tests)
   * @param {object}  [opts.signer]         - Optional pre-built ethers signer (for tests)
   */
  constructor({ rpcUrl, privateKey, contractAddress, provider: injectedProvider, signer: injectedSigner }) {
    this.provider = injectedProvider ?? new ethers.JsonRpcProvider(rpcUrl);
    this.signer   = injectedSigner ?? new ethers.Wallet(privateKey, this.provider);
    this.abi      = loadABI();

    this.contract = new ethers.Contract(contractAddress, this.abi, this.signer);
    this.readContract = new ethers.Contract(contractAddress, this.abi, this.provider);
  }

  /** Convenience to wait for tx confirmation and return a result object */
  async _send(txPromise) {
    const tx      = await txPromise;
    const receipt = await tx.wait();
    return {
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed.toString(),
    };
  }

  /**
   * Creates a batch on-chain.
   *
   * @param {string} batchId       - bytes32 hex string (keccak256 of UUID)
   * @param {string} metadataHash  - bytes32 hex string (keccak256 of JSON)
   * @param {string} beekeeperAddr - Ethereum address of the beekeeper
   * @returns {Promise<{txHash, blockNumber, gasUsed}>}
   * @throws {ApiError}
   */
  async createBatch(batchId, metadataHash, beekeeperAddr) {
    try {
      const nonce = await this._getNonce();
      return await this._send(
        this.contract.createBatch(batchId, metadataHash, beekeeperAddr, { nonce })
      );
    } catch (err) {
      throw parseContractError(err, this.contract);
    }
  }

  /**
   * Transfers custody of a batch to a new entity.
   *
   * @param {string} batchId       - bytes32 hex string
   * @param {string} toAddr        - Recipient Ethereum address
   * @param {number} transferType  - 0=Harvest, 1=Processor, 2=Distributor, 3=Retailer
   * @param {string} locationHash  - bytes32 hex string
   * @returns {Promise<{txHash, blockNumber, gasUsed}>}
   * @throws {ApiError}
   */
  async transferCustody(batchId, toAddr, transferType, locationHash) {
    try {
      const nonce = await this._getNonce();
      return await this._send(
        this.contract.transferCustody(batchId, toAddr, transferType, locationHash, { nonce })
      );
    } catch (err) {
      throw parseContractError(err, this.contract);
    }
  }

  /**
   * Links a QR code to a batch on-chain.
   *
   * @param {string} batchId - bytes32 hex string
   * @param {string} qrId    - bytes32 hex string (keccak256 of QR payload)
   * @returns {Promise<{txHash, blockNumber, gasUsed}>}
   * @throws {ApiError}
   */
  async activateQR(batchId, qrId) {
    try {
      const nonce = await this._getNonce();
      return await this._send(
        this.contract.activateQR(batchId, qrId, { nonce })
      );
    } catch (err) {
      throw parseContractError(err, this.contract);
    }
  }

  /**
   * Returns the full on-chain custody history for a batch.
   *
   * @param {string} batchId - bytes32 hex string
   * @returns {Promise<Array<{from, to, transferType, locationHash, timestamp}>>}
   * @throws {ApiError}
   */
  async getBatchHistory(batchId) {
    try {
      const records = await this.readContract.getBatchHistory(batchId);
      return records.map((r) => ({
        from:         r.from,
        to:           r.to,
        transferType: Number(r.transferType),
        locationHash: r.locationHash,
        timestamp:    Number(r.timestamp),
      }));
    } catch (err) {
      throw parseContractError(err, this.readContract);
    }
  }

  /**
   * Returns core batch record from the chain.
   *
   * @param {string} batchId - bytes32 hex string
   * @returns {Promise<{metadataHash, beekeeper, currentCustodian, exists}>}
   * @throws {ApiError}
   */
  async getBatch(batchId) {
    try {
      const b = await this.readContract.getBatch(batchId);
      return {
        metadataHash:     b.metadataHash,
        beekeeper:        b.beekeeper,
        currentCustodian: b.currentCustodian,
        exists:           b.exists,
      };
    } catch (err) {
      throw parseContractError(err, this.readContract);
    }
  }

  /**
   * Reverse-lookup: returns batchId for a given QR code hash.
   *
   * @param {string} qrId - bytes32 hex string
   * @returns {Promise<string>} batchId or bytes32(0) if not found
   * @throws {ApiError}
   */
  async getBatchByQR(qrId) {
    try {
      return await this.readContract.getBatchByQR(qrId);
    } catch (err) {
      throw parseContractError(err, this.readContract);
    }
  }

  /** Get the address of the operator */
  get operatorAddress() {
    return this.signer.address || this.signer.signer?.address;
  }

  /** Force fetch the true current nonce from the node, bypassing caches */
  async _getNonce() {
    const hex = await this.provider.send("eth_getTransactionCount", [this.operatorAddress, "pending"]);
    return parseInt(hex, 16);
  }
}

module.exports = { BlockchainService, ApiError, parseContractError };
