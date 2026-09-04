import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import { defineConfig, configVariable } from "hardhat/config";

import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatEthers, hardhatChaiMatchers, hardhatMocha, hardhatVerify],

  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },

  networks: {
    // In-process EDR network (used when `--network hardhatLocal` or as default)
    hardhatLocal: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // External node spawned via `npx hardhat node`
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    // Polygon Amoy testnet
    amoy: {
      type: "http",
      chainType: "l1",
      url: configVariable("AMOY_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },

  etherscan: {
    apiKey: {
      polygonAmoy: configVariable("POLYGONSCAN_API_KEY")
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },

  mocha: {
    timeout: 60000,
  },
});
