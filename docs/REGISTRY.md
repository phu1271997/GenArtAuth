# Provenance Registry & Certificate Layer (Milestone 7)

This milestone turns GenArtAuth from a per-artwork verifier into a **self-referential
provenance registry**: every certified original becomes part of the reference corpus
that future submissions are judged against, and each clean verdict mints a portable,
on-chain **Certificate of Authenticity**.

## Why this needs GenLayer

A registry-aware plagiarism check is not expressible in a normal smart contract:

1. The contract reads **its own on-chain registry** of previously certified originals
   (deterministic code, before the non-deterministic block).
2. Inside the non-deterministic block, GenLayer validators **crawl the live web**
   content of both the new submission and each registered original.
3. An **LLM reaches consensus** on whether the new piece is a re-mint / crop /
   derivative of any registered original — a subjective, semantic judgment.

Solidity can store hashes, but it cannot fetch live pages or reason about visual /
stylistic reproduction. That reasoning is the product.

## Registry-aware verification flow

```
verifyAuthenticity(artwork_id)
  │
  ├─ _collect_registry(exclude=artwork_id)      # deterministic read of storage
  │     walk ids newest→oldest, keep VERIFIED + verdict==ORIGINAL,
  │     cap at REGISTRY_CROSSREF_LIMIT (5) → JSON [{artwork_id, artwork_url, earliest_source}]
  │
  ├─ _verify(url, sources_json, registry_json)  # non-deterministic block
  │     crawl target + sources + Wayback
  │     crawl each registered original's URL
  │     LLM: Forensic · Provenance · Skeptic · REGISTRY CROSS-REFERENCE
  │     → {verdict, action, confidence, earliest_source, matched_artwork_id, reason}
  │     eq_principle.prompt_comparative: validators must agree on verdict, action,
  │       confidence (±15), AND matched_artwork_id
  │
  └─ if verdict == ORIGINAL: _issue_certificate(...)   # mint Certificate
```

`_clean_verdict` enforces an invariant: **a non-empty `matched_artwork_id` is coerced
to `COPY` / `BLOCK_MINT`**, so a model that flags a registry match can never also mint a
certificate for a duplicate.

## Certificate lifecycle

| Event | Certificate effect |
|---|---|
| `verifyAuthenticity` → ORIGINAL | mint `Certificate` (serial `certificate_count+1`, status `VALID`) |
| `verifyAuthenticity` → COPY | no certificate |
| `resolveChallenge` overturn → COPY | `_revoke_certificate` → status `REVOKED` |
| `resolveChallenge` overturn → ORIGINAL | `_issue_certificate` (mint or refresh) |
| `resolveChallenge` uphold | certificate unchanged |

The certificate hash is deterministic so every validator computes the same value:

```
certificate_hash = sha256(f"{serial}|{artwork_id}|{submitter}|{artwork_url}|{earliest_source}")
```

## Storage added

```python
@allow_storage
@dataclass
class Certificate:
    serial: u256
    artwork_id: str
    submitter: Address
    artwork_url: str
    earliest_source: str
    confidence: u256
    certificate_hash: str
    status: str            # "VALID" | "REVOKED"

certificates: TreeMap[str, Certificate]   # keyed by artwork_id
certificate_count: u256                    # monotonic serial
```

## Views

| View | Returns |
|---|---|
| `getCertificate(artwork_id)` | Certificate JSON, or `""` if none minted |
| `getRegistry()` | JSON list of every artwork (newest first) with verdict + certificate status/serial |
| `getRegistryStats()` | `{total_artworks, originals, copies, certificates_issued, certificates_valid, certificates_revoked, treasury_slashed}` |
| `getVerificationResult(artwork_id)` | now embeds a `certificate` object |

## Frontend surfaces

- **`/registry`** — public gallery of the whole registry with certificate/copy badges,
  filter tabs (All / Certified Originals / Blocked Copies), and aggregate stat tiles.
- **`/certificate/[id]`** — a shareable Certificate of Authenticity: serial, deterministic
  fingerprint, earliest verified appearance, issued-to address, consensus confidence, jury
  rationale, VALID/REVOKED status, and a copy-link button. Anyone can verify it against the
  on-chain record via the Explorer link.
- **Dashboard** — "Run AI Verification" wires `verifyAuthenticity` into the app, and each
  card surfaces its certificate + any registry cross-reference match.
