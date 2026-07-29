# Errors

Command failures and integration errors.

---

## [ERR-20260726-004] pytest-wrong-working-directory

**Logged**: 2026-07-26T00:00:00+07:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Contract tests were invoked from `frontend/`, so pytest could not find the root `tests/` directory.

### Error
`ERROR: file or directory not found: tests`

### Context
- Frontend lint and build completed successfully before the misplaced test command.

### Suggested Fix
Run contract pytest commands from the repository root.

### Metadata
- Reproducible: yes
- Related Files: tests/

---

## [ERR-20260726-003] contract-network-mismatch

**Logged**: 2026-07-26T00:00:00+07:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
The newly supplied contract address was initially assumed to be on Bradbury but is deployed on Studionet.

### Error
Bradbury returned `contract code not found`; Studionet returned the complete expected schema.

### Context
- Contract address was verified against both networks before finalizing frontend configuration.

### Suggested Fix
Keep the frontend chain, wallet, contract address, and funding source on Studionet for this deployment.

### Metadata
- Reproducible: yes
- Related Files: frontend/src/config/contract.ts, frontend/src/lib/providers.tsx

---

## [ERR-20260726-002] genlayer-cli-schema-bradbury

**Logged**: 2026-07-26T00:00:00+07:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The installed GenLayer CLI sends the Studio-style address parameter to Bradbury's schema RPC.

### Error
`gen_getContractSchema: invalid parameter: expected object`

### Context
- `genlayer schema <address> --rpc https://rpc-bradbury.genlayer.com`
- Bradbury requires fetching code with `{ address }`, then requesting schema with `{ code }`.

### Suggested Fix
Use the current `genlayer-js` non-Studio flow or direct JSON-RPC object parameters until the CLI is upgraded.

### Metadata
- Reproducible: yes
- Related Files: frontend/package.json

---

## [ERR-20260726-001] production-route-smoke-test

**Logged**: 2026-07-26T00:00:00+07:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
The first Vercel route smoke-test used an unavailable HTTP client and a reserved zsh variable.

### Error
`curl: command not found` and `read-only variable: status`

### Context
- Attempted to check production route HTTP status codes from zsh.
- The Vercel deployment itself completed successfully and was unaffected.

### Suggested Fix
Use Node's built-in `fetch` and avoid zsh-reserved variable names.

### Metadata
- Reproducible: yes
- Related Files: frontend/

---
