import json
import pytest

SUBMITTER_BOND = 5 * 10**18  # 5 GEN required at submitArtwork
CHALLENGE_STAKE = 10 * 10**18  # 10 GEN required at challengeVerdict

# Helper to format mock response
def make_mock_result(verdict, action, confidence, earliest_source, reason):
    return json.dumps({
        "verdict": verdict,
        "action": action,
        "confidence": confidence,
        "earliest_source": earliest_source,
        "reason": reason
    }, sort_keys=True)

def _submit(contract, direct_vm, artwork_url, source_urls, bond=SUBMITTER_BOND):
    direct_vm.value = bond
    try:
        return contract.submitArtwork(artwork_url, source_urls)
    finally:
        direct_vm.value = 0

def test_genuine_artwork_flow(direct_vm, direct_deploy):
    # Deploy contract
    contract = direct_deploy("contracts/gen_art_auth.py")

    # Define test inputs
    artwork_url = "https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/123"
    source_urls = ["https://twitter.com/BoredApeYC/status/1385350352277495813"]
    
    # Mock Web request results
    direct_vm.mock_web(r".*opensea\.io.*", {"status": 200, "body": "Bored Ape Yacht Club #123"})
    direct_vm.mock_web(r".*twitter\.com.*", {"status": 200, "body": "Original Bored Ape post 2021"})
    direct_vm.mock_web(r".*archive\.org.*", {"status": 200, "body": '{"archived_snapshots":{"closest":{"available":true,"url":"https://web.archive.org/web/2021/url"}}}'})
    
    # Mock LLM verdict
    mock_verdict = {
        "verdict": "ORIGINAL",
        "action": "MINT_SAFE",
        "confidence": 95,
        "earliest_source": source_urls[0],
        "reason": "Art provenance matches earliest appearances in April 2021."
    }
    direct_vm.mock_llm(r".*Determine if the target artwork is an ORIGINAL.*", mock_verdict)

    # Submit artwork with 5 GEN bond
    artwork_id = _submit(contract, direct_vm, artwork_url, source_urls)
    assert artwork_id == "1"

    # Verify authenticity
    contract.verifyAuthenticity(artwork_id)

    # Get verification results
    res_str = contract.getVerificationResult(artwork_id)
    res = json.loads(res_str)

    assert res["status"] == "VERIFIED"
    assert res["verdict"]["verdict"] == "ORIGINAL"
    assert res["verdict"]["action"] == "MINT_SAFE"
    assert res["verdict"]["confidence"] == 95
    assert res["submitter_bond"] == SUBMITTER_BOND

def test_copy_artwork_flow(direct_vm, direct_deploy):
    # Deploy contract
    contract = direct_deploy("contracts/gen_art_auth.py")
    
    artwork_url = "https://foundation.app/mint/some-random-new-mint"
    source_urls = ["https://www.deviantart.com/famousartist/art/original-art-2015-8493021"]
    
    direct_vm.mock_web(r".*foundation\.app.*", {"status": 200, "body": "New Minted Copy Art 2026"})
    direct_vm.mock_web(r".*deviantart\.com.*", {"status": 200, "body": "Famous Artist Original Artwork 2015"})
    direct_vm.mock_web(r".*archive\.org.*", {"status": 200, "body": '{"archived_snapshots":{"closest":{"available":true,"url":"https://web.archive.org/web/2015/url"}}}'})
    
    mock_verdict = {
        "verdict": "COPY",
        "action": "BLOCK_MINT",
        "confidence": 98,
        "earliest_source": source_urls[0],
        "reason": "Source dates back to 2015. Target was created in 2026. Clear plagiarism."
    }
    direct_vm.mock_llm(r".*Determine if the target artwork is an ORIGINAL.*", mock_verdict)

    artwork_id = _submit(contract, direct_vm, artwork_url, source_urls)
    contract.verifyAuthenticity(artwork_id)

    res_str = contract.getVerificationResult(artwork_id)
    res = json.loads(res_str)

    assert res["status"] == "VERIFIED"
    assert res["verdict"]["verdict"] == "COPY"
    assert res["verdict"]["action"] == "BLOCK_MINT"

def test_edge_case_double_submit(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/gen_art_auth.py")
    artwork_url = "https://opensea.io/assets/1"
    source_urls = ["https://twitter.com/1"]

    _submit(contract, direct_vm, artwork_url, source_urls)

    # Double submitting must raise exception
    with pytest.raises(Exception) as excinfo:
        _submit(contract, direct_vm, artwork_url, source_urls)
    assert "Artwork already submitted" in str(excinfo.value)

def test_edge_case_empty_sources(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/gen_art_auth.py")
    artwork_url = "https://opensea.io/assets/1"

    with pytest.raises(Exception) as excinfo:
        _submit(contract, direct_vm, artwork_url, [])
    assert "Source URLs cannot be empty" in str(excinfo.value)

def test_edge_case_insufficient_bond(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/gen_art_auth.py")
    artwork_url = "https://opensea.io/assets/1"
    source_urls = ["https://twitter.com/1"]

    # Under-fund the bond
    with pytest.raises(Exception) as excinfo:
        _submit(contract, direct_vm, artwork_url, source_urls, bond=1 * 10**18)
    assert "Insufficient submitter bond" in str(excinfo.value)

def test_edge_case_invalid_status_transition(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/gen_art_auth.py")
    artwork_url = "https://opensea.io/assets/1"
    source_urls = ["https://twitter.com/1"]

    direct_vm.mock_web(r".*", {"status": 200, "body": "Mock data"})
    direct_vm.mock_llm(r".*", {"verdict": "ORIGINAL", "action": "MINT_SAFE", "confidence": 90, "earliest_source": "", "reason": "ok"})

    artwork_id = _submit(contract, direct_vm, artwork_url, source_urls)
    contract.verifyAuthenticity(artwork_id)
    
    # Trying to verify again must raise exception
    with pytest.raises(Exception) as excinfo:
        contract.verifyAuthenticity(artwork_id)
    assert "Artwork already verified or in progress" in str(excinfo.value)

def test_challenge_uphold_flow(direct_vm, direct_deploy, direct_alice, direct_bob):
    # Deploy contract
    contract = direct_deploy("contracts/gen_art_auth.py")
    
    artwork_url = "https://opensea.io/assets/1"
    source_urls = ["https://twitter.com/1"]
    
    # Mock initial verification
    direct_vm.mock_web(r".*", {"status": 200, "body": "Mock data"})
    direct_vm.mock_llm(r".*Determine if the target artwork is an ORIGINAL.*", {
        "verdict": "COPY",
        "action": "BLOCK_MINT",
        "confidence": 90,
        "earliest_source": source_urls[0],
        "reason": "Clearly copied."
    })
    
    direct_vm.sender = direct_alice
    artwork_id = _submit(contract, direct_vm, artwork_url, source_urls)
    contract.verifyAuthenticity(artwork_id)

    # Challenger (Bob) files a dispute
    direct_vm.sender = direct_bob
    evidence_urls = ["https://deviantart.com/original-source"]

    # Set transaction value on VM context to simulate payable transfer
    direct_vm.value = CHALLENGE_STAKE
    contract.challengeVerdict(artwork_id, evidence_urls)
    direct_vm.value = 0

    # Verify status changed to CHALLENGED
    res_str = contract.getVerificationResult(artwork_id)
    assert json.loads(res_str)["status"] == "CHALLENGED"

    # Mock LLM for the Jury to uphold the verdict (returns COPY again)
    direct_vm.mock_llm(r".*Supreme AI Jury of GenArtAuth.*", {
        "verdict": "COPY",
        "action": "BLOCK_MINT",
        "confidence": 95,
        "earliest_source": source_urls[0],
        "reason": "Jury analyzed new evidence but maintains the artwork is indeed a copy."
    })

    # Resolve dispute
    direct_vm.sender = direct_alice  # Anyone can resolve
    contract.resolveChallenge(artwork_id)

    # Read challenge and artwork states
    challenge_str = contract.getChallenge(artwork_id)
    challenge_data = json.loads(challenge_str)
    artwork_data = json.loads(contract.getVerificationResult(artwork_id))

    assert challenge_data["status"] == "RESOLVED_UPHELD"
    assert artwork_data["status"] == "VERIFIED"
    assert artwork_data["verdict"]["verdict"] == "COPY"  # Verdict unchanged
    # Bond refunded to submitter on uphold
    assert artwork_data["submitter_bond"] == 0

def test_challenge_overturn_flow(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/gen_art_auth.py")
    
    artwork_url = "https://opensea.io/assets/1"
    source_urls = ["https://twitter.com/1"]
    
    # Mock initial verification as COPY
    direct_vm.mock_web(r".*", {"status": 200, "body": "Mock data"})
    direct_vm.mock_llm(r".*Determine if the target artwork is an ORIGINAL.*", {
        "verdict": "COPY",
        "action": "BLOCK_MINT",
        "confidence": 85,
        "earliest_source": source_urls[0],
        "reason": "Initial verdict flagged as copy."
    })
    
    direct_vm.sender = direct_alice
    artwork_id = _submit(contract, direct_vm, artwork_url, source_urls)
    contract.verifyAuthenticity(artwork_id)

    # Challenger (Bob) files a dispute with 10 GEN
    direct_vm.sender = direct_bob
    evidence_urls = ["https://deviantart.com/undeniable-proof"]

    # Set transaction value on VM context to simulate payable transfer
    direct_vm.value = CHALLENGE_STAKE
    contract.challengeVerdict(artwork_id, evidence_urls)
    direct_vm.value = 0

    # Mock LLM for the Jury to overturn the verdict (returns ORIGINAL)
    direct_vm.mock_llm(r".*Supreme AI Jury of GenArtAuth.*", {
        "verdict": "ORIGINAL",
        "action": "MINT_SAFE",
        "confidence": 98,
        "earliest_source": artwork_url,
        "reason": "Jury analyzed the new evidence. The timeline proves target artwork is indeed the original!"
    })

    # Resolve challenge
    contract.resolveChallenge(artwork_id)

    # Read challenge and artwork states
    challenge_str = contract.getChallenge(artwork_id)
    challenge_data = json.loads(challenge_str)
    artwork_data = json.loads(contract.getVerificationResult(artwork_id))

    assert challenge_data["status"] == "RESOLVED_OVERTURNED"
    assert artwork_data["status"] == "VERIFIED"
    assert artwork_data["verdict"]["verdict"] == "ORIGINAL"  # Verdict overturned!
    assert artwork_data["verdict"]["action"] == "MINT_SAFE"
    # Bond consumed to reward challenger (stake + bond = 15 GEN payout, fully funded)
    assert artwork_data["submitter_bond"] == 0
