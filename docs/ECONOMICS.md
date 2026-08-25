# GenArtAuth — Economics & Reputation

This file explains the GEN flows and the reputation scoring rules introduced in Trust Layer v1.

## GEN flows

| Action | Payer | Amount | Where the GEN goes |
|---|---|---|---|
| `submitArtwork` | Submitter | 5 GEN (bond floor) | Locked on the `Artwork` struct |
| `challengeVerdict` | Challenger | 10 GEN (stake floor) | Locked on the `Challenge` struct |
| `resolveChallenge` — overturn | Contract → Challenger | 15 GEN (bond + stake) | Sent via `gl.get_contract_at(...).emit_transfer` |
| `resolveChallenge` — uphold | Contract → Submitter | 5 GEN (bond refund) | Sent via `emit_transfer`; stake credited to `treasury_slashed` |

Invariant: the contract never pays more than it has already received in the current dispute cycle. In particular the challenger's overturn reward is fully funded by the submitter's up-front bond.

## Reputation model

Reputation is stored per address as an ELO-style `u256` score. Every address starts implicitly at **1000**. `getReputation` returns that default without writing storage for addresses that have never been touched.

### Delta table

| Event | Submitter Δ | Challenger Δ |
|---|---|---|
| Verdict finalises unchallenged (no dispute path) | +0 (score unchanged until challenged) | — |
| Challenge resolved as **UPHELD** | +50 (verdict stood) | −50 |
| Challenge resolved as **OVERTURNED** | −100 (verdict was wrong) | +100 |

Scores floor at 0 — they can never underflow the underlying `u256`.

### Counters

`Reputation` also tracks monotonic counters for auditability:

- `total_submissions` — number of `submitArtwork` calls (regardless of outcome).
- `verified_stands` — verdicts the submitter authored that survived a challenge.
- `verdicts_overturned` — verdicts overturned by a jury.
- `successful_challenges` — challenges the address filed and won.
- `failed_challenges` — challenges the address filed and lost.

### Tier bands

`_score_to_tier` classifies the current numeric score into a human-readable tier:

| Score | Tier |
|---|---|
| ≥ 1500 | `TRUSTED` |
| 1100 – 1499 | `RELIABLE` |
| 900 – 1099 | `NEUTRAL` |
| 500 – 899 | `SUSPECT` |
| < 500 | `UNTRUSTED` |

The frontend renders these tiers as coloured badges next to submitter and challenger addresses.

## Design rationale

- **Asymmetric deltas** (challenger wins +100 vs submitter's −100) reward the harder-to-perform work — challenging a wrong verdict requires evidence gathering, so we pay more. Losing a verdict is worse for the submitter than losing a challenge is for the challenger, because a submitter's incorrect verdict has already misled downstream users.
- **Floor at 0** avoids negative-score semantics inside a `u256` and keeps the score comparable across builds without dealing with signed integer edge-cases.
- **Monotonic counters** are kept separate from the score so downstream apps can compute alternate metrics (e.g. win-rate over last N challenges) without losing raw history.
- **`treasury_slashed`** is exposed via a view so anyone can audit the total GEN captured by the protocol; a future release can add a governance-gated withdrawal path.
