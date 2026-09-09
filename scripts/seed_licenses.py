"""Seed the Milestone 8 contract with a full license chain for reviewers:

  1. rights holder (deployer)  submit + verify an original  -> Certificate #1
  2. rights holder             createLicense                -> License #1
  3. licensee (wallet _2)      purchaseLicense              -> Grant #1
  4. rights holder             reviewLicenseCompliance      -> AI verdict

Usage:
    source ~/.genlayer/env.sh
    python3 scripts/seed_licenses.py 0x<contract_address>

Verification + compliance review run real GenLayer consensus (slow to finalize),
so the script polls on-chain state instead of trusting the wait helper.
"""
import json
import os
import sys
import time
import logging

logging.disable(logging.CRITICAL)
import genlayer_py
from genlayer_py.client import GenLayerClient
from genlayer_py.accounts.account import Account

BOND = 5 * 10**18
PRICE = 15 * 10**18
LICENSE_BOND = 8 * 10**18
DISPUTE_STAKE = 5 * 10**18

ARTWORK = "https://en.wikipedia.org/wiki/The_Starry_Night"
SOURCES = ["https://www.wikiart.org/en/vincent-van-gogh/the-starry-night-1889"]
TERMS = "Non-commercial use only. Attribution to Vincent van Gogh required. No resale of prints or merchandise."
USAGE_URL = "https://www.redbubble.com/shop/starry+night"  # a commercial shop -> likely VIOLATION


def main():
    addr = sys.argv[1] if len(sys.argv) > 1 else os.getenv("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS")
    holder = Account.from_key(os.getenv("GENLAYER_PRIVATE_KEY"))
    buyer = Account.from_key(os.getenv("GENLAYER_PRIVATE_KEY_2"))
    c = GenLayerClient(chain_config=genlayer_py.chains.studionet)
    c.local_account = holder

    def rd(fn, args=None):
        return c.read_contract(address=addr, function_name=fn, args=args or [])

    def poll(fn, args, key, want, label, tries=60):
        for _ in range(tries):
            time.sleep(6)
            try:
                d = json.loads(rd(fn, args))
                if d.get(key) in want:
                    return d
            except Exception:
                pass
        return None

    print(f"Contract {addr}\n holder {holder.address}\n buyer  {buyer.address}\n", flush=True)

    # 1. submit + verify
    print("1) submit + verify original ...", flush=True)
    c.write_contract(address=addr, function_name="submitArtwork", account=holder, value=BOND, args=[ARTWORK, SOURCES])
    time.sleep(8)
    # find its id
    aid = None
    for i in range(1, 20):
        try:
            d = json.loads(rd("getVerificationResult", [str(i)]))
        except Exception:
            break
        if d.get("artwork_url") == ARTWORK:
            aid = str(i); break
    print(f"   artwork id = {aid}", flush=True)
    c.write_contract(address=addr, function_name="verifyAuthenticity", account=holder, args=[aid])
    d = poll("getVerificationResult", [aid], "status", ["VERIFIED"], "verify")
    v = (d or {}).get("verdict") or {}
    print(f"   verified: {v.get('verdict')} cert={'yes' if (d or {}).get('certificate') else 'no'}", flush=True)
    if not (d and d.get("certificate")):
        print("   no certificate minted (verdict not ORIGINAL); cannot license. stop.", flush=True)
        return

    # 2. createLicense
    print("2) createLicense ...", flush=True)
    c.write_contract(address=addr, function_name="createLicense", account=holder,
                     args=[aid, TERMS, PRICE, LICENSE_BOND])
    time.sleep(8)
    market = json.loads(rd("getLicenseMarketplace"))
    lid = market[0]["license_id"] if market else None
    print(f"   license id = {lid}", flush=True)

    # 3. purchaseLicense from buyer
    print("3) purchaseLicense (buyer) ...", flush=True)
    c.write_contract(address=addr, function_name="purchaseLicense", account=buyer,
                     value=PRICE + LICENSE_BOND, args=[lid, USAGE_URL])
    time.sleep(8)
    grants = json.loads(rd("getGrantsForLicense", [lid]))
    gid = grants[0]["grant_id"] if grants else None
    print(f"   grant id = {gid} status={grants[0]['status'] if grants else '?'}", flush=True)

    # 4. reviewLicenseCompliance from holder
    print("4) reviewLicenseCompliance (AI) ...", flush=True)
    c.write_contract(address=addr, function_name="reviewLicenseCompliance", account=holder,
                     value=DISPUTE_STAKE, args=[gid, [USAGE_URL]])
    d = poll("getGrant", [gid], "status", ["COMPLIANT", "VIOLATION"], "review")
    if d:
        vv = d.get("verdict") or {}
        print(f"   grant {gid} -> {d.get('status')} verdict={vv.get('verdict')} severity={vv.get('severity')}", flush=True)
    print("STATS:", rd("getLicenseStats"), flush=True)
    print("REGISTRY:", rd("getRegistryStats"), flush=True)


if __name__ == "__main__":
    main()
