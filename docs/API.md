# GenArtAuth — Contract API Reference

Contract: `0x5e85C3319FA74948d753168a38d6b510C3E4FC9e` on GenLayer Studionet (`https://studio.genlayer.com/api`).
Source: [`contracts/gen_art_auth.py`](../contracts/gen_art_auth.py).

All calldata types conform to the GenLayer allowed set (see `~GEN_RULES/02-common-errors.md` R14/R18/R19).
All views return **JSON-encoded strings** so downstream clients can parse without knowing the on-chain struct layout.

---

## Write methods

### `submitArtwork(artwork_url: str, source_urls: DynArray[str]) → str`

**Payable.** Locks a **5 GEN** submitter bond that funds the challenger reward if the verdict is ever overturned.

| Param | Type | Description |
|---|---|---|
| `artwork_url` | `str` | Target artwork / NFT URL |
| `source_urls` | `DynArray[str]` | One or more original-source URLs (non-empty) |
| **msg.value** | `u256` | ≥ 5 × 10¹⁸ (5 GEN) |

**Returns**: decimal `artwork_id` (e.g. `"1"`).

**Reverts**:
- `Source URLs cannot be empty`
- `Insufficient submitter bond. Min bond is 5 GEN`
- `Artwork already submitted` (case-insensitive URL match)

**Reputation side-effect**: `total_submissions[sender] += 1`.

---

### `verifyAuthenticity(artwork_id: str) → None`

Runs the initial AI verification. Non-deterministic block:
- Crawls `artwork_url` + every source URL + Wayback Machine snapshot for each.
- Prompts LLM to reason across **Forensic + Provenance + Skeptic** perspectives.
- Consensus via `gl.eq_principle.prompt_comparative` — validators must match on `verdict`, `action`, and `confidence` within ±15, and both `reason` fields must cover all three perspectives.
- Prompt-injection canary aborts if the LLM output leaks the do-not-echo sentinel.

**Reverts**:
- `Artwork not found`
- `Artwork already verified or in progress`
- `Failed to crawl target artwork URL: …`
- `Failed to parse AI verdict JSON: …`
- `Prompt-injection canary triggered: …`

**State change**: `artwork.status` transitions `PENDING → PROCESSING → VERIFIED`, `artwork.verdict` is populated with the JSON verdict.

---

### `challengeVerdict(artwork_id: str, evidence_urls: DynArray[str]) → None`

**Payable.** Locks a **10 GEN** challenger stake and opens a dispute against a `VERIFIED` verdict.

| Param | Type | Description |
|---|---|---|
| `artwork_id` | `str` | Decimal id returned by `submitArtwork` |
| `evidence_urls` | `DynArray[str]` | New evidence URLs (non-empty) |
| **msg.value** | `u256` | ≥ 10 × 10¹⁸ (10 GEN) |

**Reverts**:
- `Artwork not found`
- `Artwork must be verified to be challenged`
- `Insufficient stake. Min stake is 10 GEN`
- `Challenge evidence URLs cannot be empty`
- `Artwork is already challenged`
- `Submitter cannot challenge their own verdict`

**State change**: `artwork.status → CHALLENGED`, a new `Challenge` entry is written with `status=PENDING`.

---

### `resolveChallenge(artwork_id: str) → None`

Anyone can call this once a challenge is `PENDING`. The Supreme AI Jury re-examines the artwork, original sources, and challenger's evidence from three perspectives and issues a binding verdict.

**Payout branches** (both use `gl.get_contract_at(addr).emit_transfer`):
- **Overturned** (`new_verdict != old_verdict`): challenger receives `stake + bond = 15 GEN`. Submitter reputation −100; challenger reputation +100.
- **Upheld**: submitter's bond (5 GEN) refunded; challenger's stake (10 GEN) credited to `treasury_slashed`. Submitter reputation +50; challenger reputation −50.

**Reverts**: `Challenge not found`, `Challenge already resolved or in progress`.

**State change**: `challenge.status → RESOLVED_OVERTURNED | RESOLVED_UPHELD`, `artwork.status → VERIFIED`, `artwork.submitter_bond → 0`. If overturned, `artwork.verdict` is replaced with the jury's verdict.

---

## View methods

### `getVerificationResult(artwork_id: str) → str`

Returns a JSON string with the artwork dossier.

```json
{
  "artwork_id": "1",
  "submitter": "0x5e85...4fc9e",
  "artwork_url": "https://opensea.io/assets/…",
  "source_urls": ["https://twitter.com/…"],
  "status": "VERIFIED",
  "verdict": {
    "verdict": "ORIGINAL",
    "action": "MINT_SAFE",
    "confidence": 95,
    "earliest_source": "https://twitter.com/…",
    "reason": "Forensic: … Provenance: … Skeptic: …"
  },
  "submitter_bond": 5000000000000000000
}
```

**Reverts**: `Artwork not found`.

---

### `getChallenge(artwork_id: str) → str`

Returns `""` if no challenge exists. Otherwise:

```json
{
  "artwork_id": "1",
  "challenger": "0xabc…",
  "stake": 10000000000000000000,
  "evidence_urls": ["https://deviantart.com/…"],
  "status": "RESOLVED_UPHELD",
  "new_verdict": { "…same schema as verdict…" }
}
```

---

### `getReputation(address_str: str) → str`

Returns the on-chain reputation dossier. Address is normalised (lowercased hex) before lookup.

Fresh addresses (never scored) return the default without writing storage:

```json
{
  "address": "0xabc…",
  "score": 1000,
  "total_submissions": 0,
  "verified_stands": 0,
  "verdicts_overturned": 0,
  "successful_challenges": 0,
  "failed_challenges": 0,
  "tier": "NEUTRAL",
  "initialized": false
}
```

**Tier bands**: `TRUSTED` (≥1500) · `RELIABLE` (1100-1499) · `NEUTRAL` (900-1099) · `SUSPECT` (500-899) · `UNTRUSTED` (<500).

---

### `getTreasuryBalance() → str`

Cumulative GEN slashed from failed challenges.

```json
{ "treasury_slashed": 30000000000000000000 }
```

---

## Client examples

### TypeScript (genlayer-js, this repo's frontend)

```ts
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({ chain: studionet, account: userAddress });

// Submit
const txHash = await client.writeContract({
  address: "0x5e85C3319FA74948d753168a38d6b510C3E4FC9e",
  functionName: "submitArtwork",
  args: [artworkUrl, sourceUrls],
  value: BigInt(5) * BigInt(10) ** BigInt(18),
});

// Read
const raw = await client.readContract({
  address: "0x5e85C3319FA74948d753168a38d6b510C3E4FC9e",
  functionName: "getReputation",
  args: [addr.toLowerCase()],
});
const rep = JSON.parse(raw as string);
```

### Python (`genlayer-test`, in `tests/`)

```python
contract.connect(alice).submitArtwork(
    args=["https://opensea.io/assets/1", ["https://twitter.com/1"]]
).transact(value=5 * 10**18)

rep = json.loads(contract.getReputation(args=["0xabc…"]).call())
```

---

## Common reverts (frontend-friendly messages)

`extractContractError` in `frontend/src/lib/errors.ts` unwraps viem / MetaMask envelopes; the strings below reach the UI verbatim.

| String | Origin |
|---|---|
| `Insufficient submitter bond. Min bond is 5 GEN` | `submitArtwork` |
| `Artwork already submitted` | `submitArtwork` |
| `Insufficient stake. Min stake is 10 GEN` | `challengeVerdict` |
| `Submitter cannot challenge their own verdict` | `challengeVerdict` |
| `Artwork is already challenged` | `challengeVerdict` |
| `Prompt-injection canary triggered: …` | `_detect_injection` |
