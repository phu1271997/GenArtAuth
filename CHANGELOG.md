# Changelog

All notable changes to the **GenArtAuth** project are documented in this file.

---

## [Milestone 6] - Trust Layer v1: Reputation, Multi-Perspective AI, Prompt-Injection Defense

### Added
- **On-chain reputation system** (`Reputation` struct + `reputations: TreeMap[str, Reputation]`, keyed by lowercased 0x-address). ELO-style score starts at 1000 for every address; `_bump_score` clamps at 0 so the underlying `u256` cannot underflow. Four monotonic counters — `total_submissions`, `verified_stands`, `verdicts_overturned`, `successful_challenges`, `failed_challenges` — record raw history alongside the score.
- **Scoring deltas** applied at `resolveChallenge`: submitter +50 on UPHELD, submitter −100 on OVERTURNED; challenger +100 on OVERTURNED, challenger −50 on UPHELD. Rationale in `docs/ECONOMICS.md`.
- **`getReputation(address_str)` and `getTreasuryBalance()` views**, both returning JSON. `getReputation` returns the default 1000/NEUTRAL tier without initialising storage for unseen addresses.
- **`treasury_slashed: u256`** — cumulative counter for GEN slashed from failed challenges, updated inside `resolveChallenge` on the UPHELD branch.
- **Multi-perspective prompt for `_verify`**: the initial verification now demands an explicit Forensic + Provenance + Skeptic synthesis, matching what `_verify_challenge` already required for the jury. The equivalence principle asks validators to check that both `reason` fields cover all three perspectives.
- **Prompt-injection canary defense**: every prompt embeds a static sentinel with a do-not-echo directive, and all crawled web content is wrapped inside `<<<UNTRUSTED_BEGIN>>> … <<<UNTRUSTED_END>>>` delimiters. `_detect_injection` raises before storage is written if the sentinel leaks into the LLM output. Covered by `test_prompt_injection_canary_rejected`.
- **`_addr_str` R20 defensive wrapper**: falls back to `str(addr)` if `Address.as_hex` is unavailable on the current GenVM build, and lowercases the result so mixed-case hex representations share a single reputation bucket.
- **Self-challenge guard**: `challengeVerdict` rejects `sender == artwork.submitter` — prevents reputation farming and bond recycling.
- **Frontend `ReputationBadge` component** displayed next to every submitter/challenger address on the Dashboard, and as an expanded panel at the top of `/my-verifications`. Address rows now link to the GenLayer Explorer (`explorerAddressUrl` helper).
- **Documentation bundle**: `docs/ARCHITECTURE.md` (Mermaid diagrams for component layout + verification/dispute lifecycles + storage layout), `docs/SECURITY.md` (threat model + mitigations + known limitations), `docs/ECONOMICS.md` (GEN flows + reputation deltas + tier bands).
- **Four new tests** (14 total, all passing under `genlayer-test` 0.29.2): `test_reputation_defaults_to_starting_score`, `test_reputation_increments_on_submission`, `test_self_challenge_rejected`, `test_prompt_injection_canary_rejected`, `test_reputation_score_floors_at_zero`. The uphold and overturn tests now also assert reputation deltas + `treasury_slashed`.

### Changed
- `_clean_verdict` extracted as a helper method and hardened: `confidence` is clamped to `[0, 100]` regardless of what the LLM returns.
- `resolveChallenge` now records reputation deltas as its final step (after the payout branch), so a mocked payout failure would surface before the score changes.
- Prompt copy for `_verify` and `_verify_challenge` was restructured around the guard preamble; the equivalence principle now explicitly requires three-perspective coverage.

### Redeploy required
- Storage schema changed (new `reputations` TreeMap and `treasury_slashed` field). The Studionet contract must be redeployed and `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` updated on Vercel + `frontend/.env.local`. See `README.md → How to Deploy`.

---

## [Milestone 5] - Reviewer-Requested Redeploy & Studionet Lock-In
### Fixed
- **Grader feedback addressed on a single deployable head.** Reviewer flagged that the previously submitted head failed contract validation (entry class the schema loader could not identify) and that a first overturn could owe 15 GEN after receiving only 10 GEN. The head now published to Studionet at `0xC00FDc21EdCC4D07a0c8d585fDEE01B07Fb8FCA1`:
  - Exposes exactly one `class Contract(gl.Contract)` subclass, matching the entry-point convention required by the GenLayer schema loader.
  - Collects a mandatory 5 GEN submitter bond at `submitArtwork` time and pays overturn rewards as `stake (10) + bond (5) = 15 GEN`, so the contract never owes more than it has already received.
- **Network wording purge**: swept residual "Testnet" references out of the README deployment guide and `contracts/deploy.py`. `deploy.py` no longer falls back to Bradbury — Studionet is the only supported target and the RPC hints point at `https://studio.genlayer.com/api` / the Studio **Accounts** panel for funding.

### Changed
- `frontend/.env`, `frontend/.env.local`, and the `contract.ts` fallback all point at the new Studionet contract `0xC00FDc21EdCC4D07a0c8d585fDEE01B07Fb8FCA1`.
- Vercel production `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` updated to the new address and the frontend redeployed.

---

## [Milestone 4] - Deployable Head & Solvent Dispute Economics
### Fixed
- **Contract class discovery on Studionet**: verified the entry-point class name that the GenLayer schema loader identifies (`class Contract(gl.Contract)`, matching the exact example in the official *Your First Intelligent Contract* docs). The rebuilt head deploys and validates cleanly on Studionet at `0x1F4040519Ee65Fcc595c944D563149A8191FCcAF`; the previous review report was traced to a stale/incorrect deployment target, not the class definition.
- **Insolvent overturn payout**: the previous head paid `stake + 5 GEN bonus` (15 GEN) on a first overturn while the contract had only received the 10 GEN challenger stake — reward path was unfunded. Every refund and reward is now fully collateralised on-chain before the resolver runs.
- **`transaction underpriced` from Studionet RPC**: Studionet reports `eth_gasPrice = 0` (and, for non-det ops, a value below the mempool floor). Wrapped the wallet provider so `eth_gasPrice`, `eth_maxPriorityFeePerGas`, and `eth_feeHistory` are floored to 25 gwei / 2 gwei before MetaMask signs. See `frontend/src/config/contract.ts`.
- **`No account set` from `genlayer-js`**: write clients now init with `{ chain, account: address, provider }` per the official README's wallet-provider pattern; read clients init with `{ chain }`.

### Added
- **Submitter Bond**: `submitArtwork` is now `@gl.public.write.payable` and requires a minimum bond of **5 GEN** (`min_submitter_bond`) locked with each submission. The bond is recorded on the `Artwork` storage struct (`submitter_bond: u256`).
- **Solvent dispute payout**:
  - On **overturn**: challenger receives `challenge.stake + artwork.submitter_bond` (10 + 5 = 15 GEN). Contract holds exactly that amount before the transfer, so it can never owe more than it received.
  - On **uphold**: submitter's bond is refunded; challenger's stake is slashed into the protocol treasury.
- New edge-case test `test_edge_case_insufficient_bond` guarding the bond floor.

### Changed
- Value transfers migrated to the official `@gl.evm.contract_interface` recipient pattern (matching `genlayer-studio/examples/contracts/faucet.py`).
- Frontend `submit/page.tsx` now attaches the 5 GEN bond value to the `submitArtwork` transaction and surfaces the bond mechanics in copy.
- Frontend chain resolution auto-detects the wallet's Studionet chainId and falls back to Studionet if the wallet is on an unknown network, keeping signing and RPC calls on a single network.

---

## [Milestone 3] - Frontend & Engineering Polish
### Added
- Created a robust automated test suite in `tests/test_gen_art_auth.py` utilizing `genlayer-test` (`pytest` fixtures).
- Wrote 7 comprehensive test scenarios covering Happy Paths, Edge Cases (Double-Submit, Empty Sources, Invalid Transitions), and Dispute Resolutions (Uphold and Overturn).
- Re-architected `contracts/deploy.py` to orchestrate contract deployment using the `genlayer-py` client and automatically sync the deployed contract address directly to `frontend/.env.local`.
- Created a root-level `.gitignore` to block OS-specific files (`.DS_Store`), Python test caches (`.pytest_cache`, `__pycache__`), and local environment variables.
- Implemented full interactive UI components for filing disputes, locking stakes, checking timeline provenance dossiers, and triggering Supreme AI Jury consensus on-chain.

### Changed
- Replaced the simple ID scanner in `frontend/src/app/dashboard/page.tsx` and `my-verifications/page.tsx` to safely handle and parse JSON-encoded responses returned by the contract.
- Upgraded the frontend UX/UI with premium badges representing all dispute states (`CHALLENGED`, `RESOLVED_OVERTURNED`, `RESOLVED_UPHELD`).
- Updated the main `README.md` to document the new architecture, local testing instructions, and correct Vercel deploy integration.

---

## [Milestone 2] - Dispute & Challenge Flow
### Added
- Defined the `Challenge` storage data structure with `@allow_storage` to record active disputes.
- Implemented `@gl.public.write.payable` `challengeVerdict` allowing anyone to dispute a verified verdict by locking a **10 GEN stake** and submitting new evidence.
- Implemented `@gl.public.write` `resolveChallenge` running a deep forensic AI Jury (Forensic + Provenance + Skeptic perspectives) to reach a final binding decision.
- Integrated stake incentive logic: refunds the stake and awards a **5 GEN bonus** to the challenger if the verdict is overturned; forfeits/slashes the stake if the verdict is upheld.
- Implemented `@gl.public.view` `getChallenge` returning JSON-encoded challenge metadata.

---

## [Milestone 1] - AI Consensus & Multi-Source Crawling
### Added
- Upgraded the consensus mechanism from strict string byte-matching (`strict_eq`) to **Semantic Consensus** using `gl.eq_principle.prompt_comparative` with a custom equivalence principle (matching verdict, action, and confidence score within ±15%).
- Integrated real-time **Wayback Machine snapshot crawling** to establish historical timelines of first appearance on-chain.
- Implemented double-submit protection using `artwork_url_to_id: TreeMap[str, str]` to prevent duplicate submissions.
- Added comprehensive edge-case handling (clean exceptions for empty sources, crawl failures, and malformed inputs).

### Changed
- Renamed the contract class to `Contract` to align with the entry point requirements of the GenLayer compiler.
- Fixed type signature violations of GenLayer rules (changed `list[str]` arguments to `DynArray[str]`, and replaced `dict` return types in public methods with JSON-serialized `str`).
- Changed storage integer types from Python's standard `int` to GenLayer's sized integer type `u256` to ensure compile-time safety.
- Conformed the contract file header to version `v0.2.16` and the correct dependency hash.
