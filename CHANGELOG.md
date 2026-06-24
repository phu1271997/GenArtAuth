# Changelog

All notable changes to the **GenArtAuth** project are documented in this file.

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
