# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *

@allow_storage
@dataclass
class Artwork:
    artwork_id: str
    submitter: str
    artwork_url: str
    source_urls: str
    status: str
    verdict: str

class GenArtAuth(gl.Contract):
    artworks: TreeMap[str, Artwork]
    next_artwork_id: str

    def __init__(self):
        self.next_artwork_id = "1"

    def _verify(self, artwork_url: str, source_urls_json: str) -> str:
        def get_verdict() -> str:
            web_data = gl.nondet.web.render(artwork_url, mode="text")
            
            source_urls = json.loads(source_urls_json)
            source_contents = {}
            for src in source_urls:
                try:
                    source_contents[src] = gl.nondet.web.render(src, mode="text")
                except Exception as e:
                    source_contents[src] = f"Error rendering: {str(e)}"
                    
            task = f"""
You are GenArtAuth, an AI Art Detective.
Analyze the following digital artwork context and source URLs to determine its authenticity.
Check for plagiarism, re-minting, AI generation traces, and ownership history.

Target Artwork Content / Meta: 
{web_data}

Source URLs Content / Meta: 
{json.dumps(source_contents)}

Return a JSON object with the exact following schema:
{{
  "authenticity": "ORIGINAL" | "COPY" | "AI_GENERATED" | "DISPUTED",
  "confidence": <integer between 0 and 100>,
  "first_appearance": "YYYY-MM-DD",
  "provenance_summary": "<string>",
  "risk_factors": ["<string>"],
  "recommended_action": "MINT_SAFE" | "BLOCK_MINT" | "REQUIRES_MANUAL_REVIEW",
  "evidence_links": ["<string>"]
}}
It is mandatory that you respond only using the JSON format above, nothing else.
            """
            result = gl.nondet.exec_prompt(task, response_format="json")
            return json.dumps(result, sort_keys=True)

        result_json_str = gl.eq_principle.strict_eq(get_verdict)
        return result_json_str

    @gl.public.write
    def submitArtwork(self, artwork_url: str, source_urls: list[str]) -> str:
        artwork_id = self.next_artwork_id
        self.next_artwork_id = str(int(self.next_artwork_id) + 1)
        
        artwork = Artwork(
            artwork_id=artwork_id,
            submitter=gl.message.sender_address.as_hex,
            artwork_url=artwork_url,
            source_urls=json.dumps(source_urls),
            status="PENDING",
            verdict=""
        )
        self.artworks[artwork_id] = artwork
        return artwork_id

    @gl.public.write
    def verifyAuthenticity(self, artwork_id: str) -> None:
        if artwork_id not in self.artworks:
            raise Exception("Artwork not found")
            
        artwork = self.artworks[artwork_id]
        if artwork.status != "PENDING":
            raise Exception("Artwork already verified or in progress")
            
        artwork.status = "PROCESSING"
        self.artworks[artwork_id] = artwork
        
        verdict_str = self._verify(artwork.artwork_url, artwork.source_urls)
        
        artwork.status = "VERIFIED"
        artwork.verdict = verdict_str
        self.artworks[artwork_id] = artwork

    @gl.public.view
    def getVerificationResult(self, artwork_id: str) -> dict:
        if artwork_id not in self.artworks:
            raise Exception("Artwork not found")
            
        artwork = self.artworks[artwork_id]
        return {
            "artwork_id": artwork.artwork_id,
            "submitter": artwork.submitter,
            "artwork_url": artwork.artwork_url,
            "source_urls": json.loads(artwork.source_urls),
            "status": artwork.status,
            "verdict": json.loads(artwork.verdict) if artwork.verdict else None
        }
