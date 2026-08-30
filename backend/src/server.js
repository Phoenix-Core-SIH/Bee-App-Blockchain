/**
 * @file   src/server.js
 * @notice Entry point — loads env, creates BlockchainService, starts Express server.
 */

"use strict";

require("dotenv").config();

const { createApp }          = require("./app.js");
const { BlockchainService }  = require("./blockchain/BlockchainService.js");
const { getDb }              = require("./db/database.js");

const PORT            = process.env.PORT            ?? 3000;
const RPC_URL         = process.env.RPC_URL          ?? "http://127.0.0.1:8545";
const OPERATOR_KEY    = process.env.OPERATOR_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
const CONTRACT_ADDR   = process.env.CONTRACT_ADDRESS;

if (!OPERATOR_KEY) {
  console.error("❌  OPERATOR_PRIVATE_KEY (or PRIVATE_KEY) is required");
  process.exit(1);
}
if (!CONTRACT_ADDR) {
  console.error("❌  CONTRACT_ADDRESS is required");
  process.exit(1);
}

// Initialise DB (creates schema if tables don't exist)
getDb();

const blockchain = new BlockchainService({
  rpcUrl:          RPC_URL,
  privateKey:      OPERATOR_KEY,
  contractAddress: CONTRACT_ADDR,
});

const app = createApp({ blockchain });

app.listen(PORT, () => {
  console.log(`\n🍯  HoneyChain API running at http://localhost:${PORT}`);
  console.log(`🔑  Operator  : ${blockchain.operatorAddress}`);
  console.log(`📋  Contract  : ${CONTRACT_ADDR}`);
  console.log(`📡  RPC       : ${RPC_URL}\n`);
});
