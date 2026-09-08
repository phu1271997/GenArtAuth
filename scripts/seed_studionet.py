"""Seed the deployed GenArtAuth contract on Studionet with real artworks so the
public registry + certificate pages are populated for reviewers.

Usage:
    source ~/.genlayer/env.sh
    python3 scripts/seed_studionet.py [0x<contract_address>]

Submits + verifies a small provenance corpus:
  A — a genuine, historically-documented work  -> expected ORIGINAL -> Certificate #1
  B — a print-shop reproduction of A           -> expected COPY (registry cross-reference)
Each submission locks the 5 GEN bond. Verification runs the real GenLayer
validator consensus (LLM + web.render + Wayback), so verdicts are decided
on-chain, not here.
"""
import json
import os
import sys

import genlayer_py
from genlayer_py.client import GenLayerClient
from genlayer_py.accounts.account import Account

BOND = 5 * 10**18

SEED = [
    {
        "label": "A — genuine original (Van Gogh, The Starry Night)",
        "artwork_url": "https://en.wikipedia.org/wiki/The_Starry_Night",
        "source_urls": ["https://www.wikiart.org/en/vincent-van-gogh/the-starry-night-1889"],
    },
    {
        "label": "B — reproduction / re-mint of A",
        "artwork_url": "https://www.wikiart.org/en/vincent-van-gogh/the-starry-night-1889",
        "source_urls": ["https://en.wikipedia.org/wiki/The_Starry_Night"],
    },
]


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else os.getenv("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS")
    if not address:
        print("Provide contract address as arg or NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS")
        sys.exit(1)

    pk = os.getenv("GENLAYER_PRIVATE_KEY") or os.getenv("PRIVATE_KEY")
    if not pk:
        print("Set GENLAYER_PRIVATE_KEY (source ~/.genlayer/env.sh)")
        sys.exit(1)
    if not pk.startswith("0x"):
        pk = "0x" + pk

    account = Account.from_key(pk)
    client = GenLayerClient(chain_config=genlayer_py.chains.studionet)
    print(f"Seeding {address} as {account.address}\n")

    for item in SEED:
        print("=" * 70)
        print(item["label"])
        try:
            tx = client.write_contract(
                address=address,
                function_name="submitArtwork",
                account=account,
                value=BOND,
                args=[item["artwork_url"], item["source_urls"]],
            )
            client.wait_for_transaction_receipt(tx)
            print(f"  submitArtwork tx: {tx}")
        except Exception as e:
            print(f"  submit failed: {e}")
            continue

    # Discover the ids we just created and verify each PENDING one.
    print("\n" + "=" * 70)
    print("Running verification consensus on PENDING artworks...\n")
    for i in range(1, 20):
        try:
            raw = client.read_contract(address=address, function_name="getVerificationResult", args=[str(i)], account=account)
        except Exception:
            break
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            break
        if not data or not data.get("artwork_id"):
            break
        if data.get("status") != "PENDING":
            print(f"  #{i}: already {data.get('status')}, skipping")
            continue
        print(f"  #{i}: verifying {data.get('artwork_url')} ...")
        try:
            tx = client.write_contract(
                address=address,
                function_name="verifyAuthenticity",
                account=account,
                args=[str(i)],
            )
            client.wait_for_transaction_receipt(tx)
            res = client.read_contract(address=address, function_name="getVerificationResult", args=[str(i)], account=account)
            res = json.loads(res) if isinstance(res, str) else res
            v = res.get("verdict") or {}
            cert = res.get("certificate")
            print(f"     verdict={v.get('verdict')} action={v.get('action')} conf={v.get('confidence')} "
                  f"matched={v.get('matched_artwork_id') or '-'} cert={'#'+str(cert['serial']) if cert else 'none'}")
        except Exception as e:
            print(f"     verify failed: {e}")

    print("\n" + "=" * 70)
    print("Registry stats:")
    try:
        stats = client.read_contract(address=address, function_name="getRegistryStats", args=[], account=account)
        print("  " + (stats if isinstance(stats, str) else json.dumps(stats)))
    except Exception as e:
        print(f"  stats read failed: {e}")


if __name__ == "__main__":
    main()
