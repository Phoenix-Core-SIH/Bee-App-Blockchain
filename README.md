# HoneyChain

Blockchain-based honey traceability system for rural Indian beekeepers (KVIC Honey Mission). 

HoneyChain bridges off-chain metadata (PostgreSQL/SQLite) with on-chain immutable provenance (Polygon Amoy / Ethereum). It creates an auditable custody chain from the beekeeper's hive, to processors, to the final retail jar accessed via public QR codes.

---

## 🏗 Architecture

- **Smart Contracts**: Solidity ^0.8.x, deployed via Hardhat.
- **Backend API**: Node.js + Express.js backend bridging Web2 and Web3.
- **Blockchain SDK**: ethers.js v6.
- **Database**: `better-sqlite3` (easily swappable to PostgreSQL).
- **Custodian Model**: The platform backend acts as the sole authorized sender for all blockchain transactions, subsidizing gas fees for beekeepers.

---

## 🚀 Setup Instructions

### 1. Install Dependencies

You'll need Node.js `v18+` or `v20+`.

Install dependencies for both the Hardhat project and the Backend API:
```bash
# In the project root (Hardhat)
npm install

# In the backend directory
cd backend
npm install
```

### 2. Local Blockchain & Deployment

Start a local Hardhat node in a separate terminal:
```bash
npx hardhat node
```

Once the node is running, deploy the smart contract and provision roles:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
This script will automatically generate a `.env.deployed` file in the project root containing the deployed contract address and private keys.

### 3. Deploy to Polygon Amoy Testnet

To deploy to the Polygon Amoy testnet, follow these steps:

1. **Fund your wallet:** Ensure the wallet associated with `DEPLOYER_PRIVATE_KEY` has Amoy testnet MATIC. You can get test tokens from the Polygon Amoy Faucet.
2. **Configure environment:** Create a `.env` file in the root directory (copy `.env.example`) and fill in your `AMOY_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `POLYGONSCAN_API_KEY`.
3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```
   This will output your configuration to `backend/src/config/contract.json`.
4. **Verify Contract:**
   Wait a minute or two for the transaction to be indexed, then verify the contract code on Polygonscan:
   ```bash
   npx hardhat verify --network amoy <YOUR_DEPLOYED_CONTRACT_ADDRESS>
   ```

### 4. Start the Backend API

Link the deployed environment variables and start the server:
```bash
cd backend
# Create a symlink to the deployed variables (or copy the file)
ln -s ../.env.deployed .env

npm run dev
```
The server will start on `http://localhost:3000`.

---

## 🧪 Testing

The backend includes a comprehensive integration test suite using Jest and Supertest. It automatically spawns a local Hardhat node, deploys the contracts, and verifies API-to-Blockchain synchronization.

```bash
cd backend
npm test
```
*(Tests require port 18547 to be available for the test-specific Hardhat node).*

---

## 📖 API Documentation

A full suite of manual tests for the REST API is provided in `backend/api.http`. Use the **VSCode REST Client** extension to execute them directly.

### Endpoints

- `GET /health` - Service health and operator address
- `POST /batches` - Register a new harvest batch (mint on-chain)
- `POST /batches/:id/transfer` - Record a custody transfer (Processor, Distributor, Retailer)
- `POST /batches/:id/qr` - Activate a QR code for a retail jar
- `GET /batches/:id/history` - Fetch full batch provenance (merged on-chain & off-chain)
- `GET /public/verify/:qr` - Public endpoint to verify a jar's authenticity

---

## 📝 License
MIT License
