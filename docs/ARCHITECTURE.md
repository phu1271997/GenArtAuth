# GenArtAuth — Architecture

This document describes the on-chain and off-chain components of GenArtAuth after the **Trust Layer v1** upgrade.

## Component overview

```mermaid
flowchart LR
    subgraph Browser["Browser (Next.js 15 + wagmi)"]
        UI[UI pages] --> Providers[Providers]
        Providers -->|"createClient(chain: studionet)"| GJ[genlayer-js]
    end

    GJ -->|writeContract| MetaMask
    MetaMask -->|signed tx| RPC[(Studionet RPC\nhttps://studio.genlayer.com/api)]
    GJ -->|readContract| RPC

    subgraph Chain[GenLayer Studionet]
        RPC --> IC[Intelligent Contract\ngen_art_auth.py]
        IC -->|gl.nondet.web.render| Web[Live web pages\n+ Wayback Machine API]
        IC -->|gl.nondet.exec_prompt| LLM[Validator LLMs\nOptimistic Democracy]
    end

    IC --> Storage[(TreeMap storage:\nartworks, challenges,\nreputations, treasury)]
```

## Verification lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as User (submitter)
    participant F as Frontend
    participant C as Contract (studionet)
    participant V as Validator LLMs
    participant W as Wayback + web

    U->>F: Fill artwork_url + source_urls
    F->>C: submitArtwork(...) [payable 5 GEN bond]
    C-->>F: artwork_id, status=PENDING

    U->>F: verifyAuthenticity(artwork_id)
    F->>C: verifyAuthenticity(...)
    C->>V: eq_principle.prompt_comparative(get_verdict)
    V->>W: crawl target + sources + Wayback snapshots
    V->>V: 3-perspective analysis (Forensic / Provenance / Skeptic)
    V-->>C: consensus verdict JSON
    C-->>F: status=VERIFIED, verdict stored
```

## Dispute lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Ch as Challenger
    participant C as Contract
    participant J as Supreme AI Jury
    participant S as Submitter

    Ch->>C: challengeVerdict(id, evidence) [payable 10 GEN stake]
    Note over C: status=CHALLENGED, contract holds 15 GEN (bond + stake)

    Ch->>C: resolveChallenge(id)
    C->>J: eq_principle.prompt_comparative(get_challenge_verdict)
    J-->>C: new verdict JSON

    alt Overturned
        C->>Ch: emit_transfer(stake + bond = 15 GEN)
        C->>C: submitter score -100, challenger score +100
    else Upheld
        C->>S: emit_transfer(bond = 5 GEN)
        C->>C: stake slashed to treasury_slashed
        C->>C: submitter score +50, challenger score -50
    end
    Note over C: status=VERIFIED, submitter_bond=0
```

## Storage layout

| Field | Type | Purpose |
|---|---|---|
| `artworks` | `TreeMap[str, Artwork]` | Primary registry keyed by decimal id |
| `artwork_url_to_id` | `TreeMap[str, str]` | Reverse index for double-submit prevention |
| `challenges` | `TreeMap[str, Challenge]` | One active challenge per artwork_id |
| `reputations` | `TreeMap[str, Reputation]` | Score + counters keyed by lowercased `0x…` |
| `next_artwork_id` | `str` | Auto-incrementing decimal id |
| `min_challenge_stake` | `u256` | 10 GEN floor at `challengeVerdict` |
| `min_submitter_bond` | `u256` | 5 GEN floor at `submitArtwork` |
| `treasury_slashed` | `u256` | Cumulative GEN slashed from failed challenges |

All TreeMap keys are `str` to stay safe at the calldata boundary (see rule R19 in `~GEN_RULES/02-common-errors.md`).

## Non-determinism boundary

Every `gl.nondet.web.render` and `gl.nondet.exec_prompt` call runs inside a closure passed to `gl.eq_principle.prompt_comparative`. Storage is read **outside** the closure and captured by reference — the closure never touches `self.*` directly.

The equivalence principle instructs validator LLMs to:

- Match `verdict` (ORIGINAL vs COPY).
- Match `action` (MINT_SAFE vs BLOCK_MINT).
- Allow `confidence` to differ by at most 15.
- Require the `reason` to explicitly cover Forensic + Provenance + Skeptic perspectives.

## Trust Layer v1 additions

- **Reputation**: `Reputation` struct + four scoring helpers exposed through `getReputation(address_str)`.
- **Multi-perspective prompt**: `_verify` now mirrors `_verify_challenge` by demanding an explicit three-perspective synthesis.
- **Prompt-injection canary**: `_CANARY_SENTINEL` is quoted in every prompt with a do-not-echo directive; `_detect_injection` raises on any leak in the output.
- **`_addr_str` R20 wrapper**: `Address.as_hex` is version-fragile; the wrapper falls back to `str(addr)` and normalises casing.
- **Self-challenge guard**: `challengeVerdict` rejects `sender == submitter` to prevent stake-farming with one's own bond.
- **`treasury_slashed`**: cumulative counter for slashed stakes, exposed via `getTreasuryBalance`.
