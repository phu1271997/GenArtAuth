# Sample submissions

Ready-to-paste inputs for the GenLayer Studio Run & Debug tab or the live dApp's `/submit` page. Each JSON file corresponds to one `submitArtwork(artwork_url, source_urls)` call.

| File | Scenario | Expected verdict |
|---|---|---|
| `01_bayc_original.json` | Genuine BAYC — real NFT + original Twitter post | `ORIGINAL` / `MINT_SAFE` |
| `02_plagiarised_mint.json` | Fresh mint copying a 2015 DeviantArt piece | `COPY` / `BLOCK_MINT` |
| `03_ambiguous_meme.json` | Meme with unclear first-appearance timeline — good stress test for the equivalence principle | Varies; useful to trigger a dispute + jury run |

The dispute flow requires a second address for the challenger. The samples in `challenges/` are matched pairs — the original submission plus fresh evidence a challenger could file:

- `challenges/01_bayc_original_challenge.json` — attempts to overturn the BAYC verdict; a well-behaved jury upholds.
- `challenges/02_plagiarised_mint_challenge.json` — the *submitter* of the plagiarised piece tries to prove they authored the 2015 piece; jury should uphold BLOCK_MINT.

## Usage — dApp

1. Connect wallet.
2. Open `/submit`.
3. Paste `artwork_url` into the target field.
4. Paste each entry in `source_urls` one by one.
5. Submit — the frontend attaches the 5 GEN bond automatically.

## Usage — GenLayer Studio Run & Debug

`submitArtwork` args tab:

```
artwork_url: <string from sample>
source_urls: <paste JSON array>
```

Set `value` (payable) to `5000000000000000000`.
