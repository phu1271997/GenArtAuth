# GenArtAuth - AI-Powered On-Chain Digital Art Authenticator & Dispute Registry

GenArtAuth is an on-chain "AI Art Detective" dApp that verifies the authenticity of digital artworks and NFTs using GenLayer's Intelligent Contracts. By leveraging LLM-based multi-validator consensus, Wayback Machine historical crawling, and a locked-stake dispute mechanism, GenArtAuth protects creators from plagiarism, re-minting, and copyright disputes entirely on-chain.

- **Live Contract (Bradbury Testnet):** `0xC3B94461a00Ed36432f32e76C4a05C391ab91A0E`
- **Entry class:** `GenArtAuth` (see `contracts/gen_art_auth.py`)

---

## Key Features (Milestone-Grade)

### 1. Multi-Source Provenance & Timeline Crawling
- Uses `gl.nondet.web.render` to fetch real-time metadata from the target artwork and its source references.
- Integrates **Wayback Machine APIs** to retrieve historical creation and archive timestamps on-chain, establishing an undeniable historical timeline of first appearance.

### 2. Semantic AI Consensus (Equivalence Principle)
- Migrated from strict byte-matching to **Semantic Consensus** using `gl.eq_principle.prompt_comparative`.
- Reaches consensus if validator nodes agree on the **meaning** of the judgment (matching verdict, recommended action, and confidence score within ±15%), ensuring high reliability and transaction success on-chain.

### 3. Decentralized Dispute & Challenge Flow
- **Submitter Bond (5 GEN)**: Every `submitArtwork` call is payable and locks a **5 GEN bond** on the artwork. The bond pre-funds any future overturn reward, guaranteeing the contract can never owe more than it received.
- **Locked-Stake Challenges (10 GEN)**: Anyone can dispute a verified verdict by filing a challenge with a **10 GEN stake** and submitting new evidence.
- **Supreme AI Jury**: Resolves disputes by running a deep forensic trial from three perspectives:
  1. *Forensic Perspective*: Style, markers, and visual anomalies.
  2. *Provenance Perspective*: Detailed timeline analysis comparing Wayback snapshots.
  3. *Skeptic Perspective*: Cross-examining the challenger's claims and original assumptions.
- **Fully-Funded Payouts**:
  - **Overturn** → challenger receives `stake (10) + bond (5) = 15 GEN`. Contract balance after payout: **0**.
  - **Uphold** → submitter's bond is refunded; challenger's stake is slashed into the protocol treasury.

---

## Project Structure

```text
GenArtAuth/
├── contracts/               # GenLayer Intelligent Contracts
│   ├── gen_art_auth.py      # The core AI contract (Semantic Consensus, AI Jury, Stakes)
│   └── deploy.py            # Deployment orchestrator & frontend sync script
├── tests/                   # Automated Testing Suite
│   └── test_gen_art_auth.py # Unit & integration tests (Direct Mode VM, Mocks, Stake checks)
├── frontend/                # Next.js 15 Web App
│   ├── src/
│   │   ├── app/             # App Router pages (Home, Submit, Dashboard, My Verifications)
│   │   ├── components/      # UI components (Navbar, Modals, Badges)
│   │   └── lib/             # Web3 Providers & wagmi configurations
│   ├── package.json
│   └── tailwind.config.ts
├── .gitignore               # Root git ignore definitions
├── CHANGELOG.md             # Project development milestones log
└── README.md                # Documentation (this file)
```

---

## How to Test the Contract Locally

GenArtAuth includes a comprehensive unit testing suite built with the `genlayer-test` framework.

1. Install dependencies:
   ```bash
   pip install genlayer-test
   ```
2. Run the test suite:
   ```bash
   pytest tests/ -v
   ```
   *The tests run in Direct Mode (in-memory emulation) and cover happy paths, double-submit protection, empty sources, and dispute upholds/overturns (including stake changes).*

---

## How to Deploy the Contract

### Option A: Using GenLayer Studio (Recommended)
1. Navigate to [GenLayer Studio](https://studio.genlayer.com/run-debug).
2. Create a new file and paste the contents of [contracts/gen_art_auth.py](file:///Users/peter/Downloads/AI/GenArtAuth/contracts/gen_art_auth.py).
3. Compile and Deploy the contract to the GenLayer Testnet.
4. Copy the deployed **Contract Address**.
5. Run the deployment script to sync with the frontend:
   ```bash
   python3 contracts/deploy.py
   ```
   *Paste your contract address when prompted to automatically write it to `frontend/.env.local`.*

### Option B: Programmatic Deployment
If you have a private key and RPC endpoint configured in your environment:
1. Setup your `.env` file:
   ```env
   PRIVATE_KEY="your_private_key_here"
   GENLAYER_RPC_URL="https://testnet.genlayer.network/rpc"
   ```
2. Run the deployer:
   ```bash
   python3 contracts/deploy.py
   ```
   *The script will deploy the contract, wait for the receipt, and automatically configure the frontend environment.*

---

## Setup Frontend & Run Locally

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Make sure your `.env.local` file contains your contract address (automatically configured by the deploy script):
   ```env
   NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="0x..."
   ```
3. Install dependencies and run the Next.js development server:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## One-Click Deploy to Vercel

Easily deploy the GenArtAuth frontend to Vercel with automatic contract configuration:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fphu1271997%2FGenArtAuth&env=NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS)

---

## Test Cases for GenLayer Studio

**Test Case 1: Genuine Artwork**
- `artwork_url`: `"https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/123"`
- `source_urls`: `["https://twitter.com/BoredApeYC/status/1385350352277495813"]`
- *Expected Verdict*: `ORIGINAL`, `MINT_SAFE`

**Test Case 2: Copy/Plagiarized Mint**
- `artwork_url`: `"https://foundation.app/mint/some-random-new-mint"`
- `source_urls`: `["https://www.deviantart.com/famousartist/art/original-art-2015-8493021"]`
- *Expected Verdict*: `COPY`, `BLOCK_MINT`
