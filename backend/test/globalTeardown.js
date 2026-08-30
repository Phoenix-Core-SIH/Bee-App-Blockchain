/**
 * @file   test/globalTeardown.js
 * @notice Jest globalTeardown — kills the Hardhat node after all tests.
 */

"use strict";

function killPort(port) {
  try {
    const result = require("child_process").execSync(
      `lsof -t -i :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    if (result) {
      result.split("\n").forEach((pid) => {
        try { process.kill(parseInt(pid, 10), "SIGKILL"); } catch (_) {}
      });
    }
  } catch (_) {}
}

module.exports = async function globalTeardown() {
  if (global.__HARDHAT_PROC__) {
    global.__HARDHAT_PROC__.kill("SIGTERM");
  }
  killPort(18547);
  await new Promise(r => setTimeout(r, 500));
  console.log("\n✅  Hardhat node stopped\n");
};
