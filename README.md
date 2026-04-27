# GenArtAuth - AI-Powered On-Chain Digital Art Authenticator

GenArtAuth is an on-chain "AI Art Detective" that verifies the authenticity of digital artworks and NFTs using GenLayer's Intelligent Contracts. It prevents NFT plagiarism and copyright disputes by leveraging LLM-based intelligent consensus.

## Features
- **On-Chain Crawling**: Uses `gl.nondet.web.render` to fetch real-time metadata, Wayback Machine archives, and historical data from the target artwork and its source URLs.
- **LLM Consensus Analysis**: Uses `gl.nondet.exec_prompt` to analyze the crawled data and output a verified, deterministic authenticity JSON report.
- **Modern Next.js 15 UI**: Dark mode, glassmorphism UI built with TailwindCSS and Framer Motion.
- **Web3 Ready**: Fully integrated with Wagmi for seamless wallet connectivity.

## Project Structure
```text
GenArtAuth/
├── contracts/               # GenLayer Intelligent Contracts
│   ├── gen_art_auth.py      # The core AI authentication contract
│   └── deploy.py            # Programmatic deployment script example
└── frontend/                # Next.js 15 Web App
    ├── src/
    │   ├── app/             # App Router pages (Home, Submit, Dashboard, My Verifications)
    │   ├── components/      # Reusable React components (Navbar, etc.)
    │   └── lib/             # Utilities and Wagmi Providers
    ├── package.json
    └── tailwind.config.ts
```

## How to Deploy the Contract
1. Go to [GenLayer Studio](https://studio.genlayer.com/contracts).
2. Create a new file and paste the contents of `contracts/gen_art_auth.py`.
3. Compile and Deploy the contract to the GenLayer Testnet.
4. Copy the deployed **Contract Address**.

## Setup Frontend
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Copy the environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
3. Open `.env.local` and paste your deployed Contract Address:
   ```env
   NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="YOUR_CONTRACT_ADDRESS_HERE"
   ```
4. Install dependencies and run the development server:
   ```bash
   npm install
   npm run dev
   ```

## Test Cases for GenLayer Studio

You can test the following scenarios directly in the GenLayer Studio by calling the `submitArtwork` function and then `verifyAuthenticity`:

**Test Case 1: Genuine Artwork**
- `artwork_url`: `"https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/123"`
- `source_urls`: `["https://twitter.com/BoredApeYC/status/1385350352277495813"]`
- *Expected Verdict*: `ORIGINAL`, `MINT_SAFE`

**Test Case 2: Copy/Plagiarized Mint**
- `artwork_url`: `"https://foundation.app/mint/some-random-new-mint"`
- `source_urls`: `["https://www.deviantart.com/famousartist/art/original-art-2015-8493021"]`
- *Expected Verdict*: `COPY`, `BLOCK_MINT`

## One-Click Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo%2FGenArtAuth&env=NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS)
*(Link above is a placeholder. Push this repository to GitHub and connect it to your Vercel account to easily deploy).*
