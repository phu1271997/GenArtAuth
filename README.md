# GenArtAuth - AI-Powered On-Chain Digital Art Authenticator & Dispute Registry

[![Tests](https://github.com/phu1271997/GenArtAuth/actions/workflows/tests.yml/badge.svg)](https://github.com/phu1271997/GenArtAuth/actions/workflows/tests.yml)

> 🇻🇳 Tiếng Việt: xem [README.vi.md](./README.vi.md).

GenArtAuth is an on-chain "AI Art Detective" dApp that verifies the authenticity of digital artworks and NFTs using GenLayer's Intelligent Contracts. By leveraging LLM-based multi-validator consensus, Wayback Machine historical crawling, and a locked-stake dispute mechanism, GenArtAuth protects creators from plagiarism, re-minting, and copyright disputes entirely on-chain.

### Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Mermaid diagrams, storage layout, non-determinism boundary.
- [`docs/API.md`](./docs/API.md) — full contract API reference (writes, views, JSON schemas, revert strings, TS/Python examples).
- [`docs/ECONOMICS.md`](./docs/ECONOMICS.md) — GEN flows, reputation deltas, tier bands.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — threat model + Trust Layer v1 mitigations.
- [`docs/samples/`](./docs/samples/) — ready-to-paste sample submissions and matching challenge payloads.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — dev workflow + ground rules for PRs.
- [`CHANGELOG.md`](./CHANGELOG.md) — milestone history.

- **Live Contract (GenLayer Studionet, Milestone 8 head):** `0x2f3B89e545941c7e4c81d1F8F1A4450dA75779b9`
- Previous heads (older storage schema, do not use): M7 `0x10A1d17C802436809c79bAD42e788f8a4C336522` · M6 `0x5e85C3319FA74948d753168a38d6b510C3E4FC9e` · M5 `0xC00FDc21EdCC4D07a0c8d585fDEE01B07Fb8FCA1`
- **Explorer:** https://genlayer-explorer.vercel.app/address/0x2f3B89e545941c7e4c81d1F8F1A4450dA75779b9
- **Entry class:** `Contract` (required by the GenLayer schema loader; see `contracts/gen_art_auth.py`)

---

## Key Features (Milestone-Grade)

### 0. Licensing & Royalty Layer with AI Compliance Adjudication (Milestone 8 — latest)
- **License a certified original**: `createLicense` lets the holder of a VALID Certificate of Authenticity offer a license for GEN, with written `terms` the AI adjudicates against.
- **Royalty purchase**: `purchaseLicense` pays the price straight to the rights holder as a royalty and locks a licensee compliance bond, recording the concrete `usage_url` where the work will be used.
- **AI compliance adjudication**: `reviewLicenseCompliance` has GenLayer validators crawl the licensee's real usage page and judge it against the license terms, returning `COMPLIANT` or `VIOLATION` with severity + reason. **Solidity cannot read a live page and decide whether a real-world use honours written terms** — this subjective judgment is the product.
- **Fully-collateralised**: VIOLATION awards the rights holder the licensee's bond (+ stake back); COMPLIANT refunds the bond and slashes the rights holder's stake to the treasury. The contract never owes more than it holds.
- **Frontend `/licenses`**: issue, browse marketplace, purchase, and run AI compliance reviews in-app.

### 0.1 Provenance Registry & Certificate Layer (Milestone 7)
- **Registry-aware verification**: before running the AI, `verifyAuthenticity` snapshots the on-chain corpus of already-certified originals (`_collect_registry`, bounded to the 5 most recent) and feeds it into the nondet block. The validators crawl each registered original and decide whether the new submission is a re-mint/derivative of one of them, returning a `matched_artwork_id`. A match is coerced to `COPY` / `BLOCK_MINT`. **This is impossible in Solidity** — the contract reads its own registry and an LLM semantically compares live web content against it.
- **On-chain Certificate of Authenticity**: a clean `ORIGINAL` verdict mints an immutable `Certificate` (monotonic serial + deterministic sha256 fingerprint) into `certificates: TreeMap[str, Certificate]`. A dispute that later overturns the verdict flips the certificate to `REVOKED` automatically; a dispute that re-confirms `ORIGINAL` refreshes it.
- **New views**: `getCertificate(artwork_id)`, `getRegistry()` (whole registry, newest first), `getRegistryStats()` (aggregate counters). `getVerificationResult` now embeds the certificate.
- **New frontend surfaces**: public **Registry gallery** (`/registry`) with certificate/copy badges + stats, and a **shareable Certificate of Authenticity page** (`/certificate/[id]`) verifiable by anyone against the on-chain record.
- **End-to-end in-app verification**: `verifyAuthenticity` is now wired into the dApp ("Run AI Verification" on the dashboard) — the entire submit → verify → certify → dispute loop runs from the UI, no GenLayer Studio round-trip.
- **Tests**: 19 total (5 new) under `genlayer-test`, covering certificate minting, no-cert-for-copy, registry cross-reference coercion, registry views, and certificate revocation on overturn.

### 0.1 Trust Layer v1 (Milestone 6 + 6.1)
- **On-chain reputation system**: ELO-style score (starts at 1000, floor 0) per address, plus monotonic counters for submissions, verified stands, verdicts overturned, and challenge wins/losses. Exposed via `getReputation(address_str)` and rendered as tier badges in the UI.
- **Multi-perspective AI verification**: initial `_verify` now demands an explicit Forensic + Provenance + Skeptic synthesis (previously only the challenge jury did). The equivalence principle validates that both validator outputs cover all three perspectives.
- **Prompt-injection canary defense**: crawled web content is wrapped in `<<<UNTRUSTED_BEGIN>>> … <<<UNTRUSTED_END>>>` delimiters and every prompt embeds a do-not-echo sentinel. Verdicts that echo the sentinel are rejected before storage is written.
- **Self-challenge guard + treasury counter**: `challengeVerdict` blocks `sender == submitter`; `treasury_slashed` records cumulative GEN captured from upheld challenges.
- **Trust Leaderboard page** (`/leaderboard`): live on-chain ranking of participants by reputation score with tier badges and aggregate stats.
- **Error handling polish**: `ErrorBoundary` catches unhandled render errors; `extractContractError` unwraps nested viem/MetaMask envelopes so users see the real revert reason.
- **Full docs bundle**: `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/ECONOMICS.md` (Mermaid diagrams + threat model + reputation deltas + tier bands).

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
│   ├── gen_art_auth.py      # Core AI contract (Consensus, AI Jury, Stakes, Reputation, Registry, Certificates)
│   └── deploy.py            # Deployment orchestrator & frontend sync script
├── scripts/                 # Operational scripts
│   └── seed_studionet.py    # Seed the live registry with real artworks (submit + verify)
├── tests/                   # Automated Testing Suite
│   └── test_gen_art_auth.py # 19 tests: happy paths, edge cases, disputes, reputation, injection, registry, certificates
├── docs/                    # Extended documentation
│   ├── ARCHITECTURE.md      # Mermaid diagrams + storage layout + lifecycles
│   ├── REGISTRY.md          # Milestone 7: registry-aware verification + certificate lifecycle
│   ├── SECURITY.md          # Threat model + mitigations
│   └── ECONOMICS.md         # GEN flows + reputation deltas + tier bands
├── frontend/                # Next.js 15 Web App
│   ├── src/
│   │   ├── app/             # App Router pages (Home, Submit, Dashboard, Registry, Certificate, Leaderboard, My Verifications)
│   │   ├── components/      # UI components (Navbar, ReputationBadge, Modals)
│   │   ├── config/          # Contract address + gas-floor provider + explorer helpers
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
2. Create a new file and paste the contents of `contracts/gen_art_auth.py`.
3. Compile and Deploy the contract to **GenLayer Studionet** (the hosted Studio network — never a testnet build).
4. Click the deploy transaction and confirm `Result: SUCCESS` (not just `Status: FINALIZED`).
5. Copy the deployed **Contract Address** and run the sync helper:
   ```bash
   python3 contracts/deploy.py
   ```
   *Paste your contract address when prompted to automatically write it to `frontend/.env.local`.*

### Option B: Programmatic Deployment (Studionet)
If you have a Studionet-funded private key configured in your environment:
1. Provide a Studionet-funded key via `GENLAYER_PRIVATE_KEY` (or `PRIVATE_KEY`):
   ```env
   GENLAYER_PRIVATE_KEY="your_studionet_private_key_here"
   # Optional: override the default Studionet RPC.
   GENLAYER_RPC_URL="https://studio.genlayer.com/api"
   ```
2. Run the deployer:
   ```bash
   python3 contracts/deploy.py
   ```
   *The script deploys to Studionet, waits for the receipt, and auto-configures the frontend environment. Fund the deployer wallet from the Studio **Accounts** panel — the public testnet faucet funds a different network and will not work here.*
3. (Optional) Seed the live registry so `/registry` and `/certificate/[id]` are populated for reviewers:
   ```bash
   python3 scripts/seed_studionet.py 0x<contract_address>
   ```

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
