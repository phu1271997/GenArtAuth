# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *

@allow_storage
@dataclass
class Artwork:
    artwork_id: str
    submitter: Address
    artwork_url: str
    source_urls: str  # JSON-encoded list of strings
    status: str  # "PENDING", "PROCESSING", "VERIFIED"
    verdict: str  # JSON-encoded result

class Contract(gl.Contract):
    artworks: TreeMap[str, Artwork]
    artwork_url_to_id: TreeMap[str, str]
    next_artwork_id: str

    def __init__(self):
        self.next_artwork_id = "1"

    def _verify(self, artwork_url: str, source_urls_json: str) -> str:
        def get_verdict() -> str:
            # 1. Crawl target artwork metadata/content
            try:
                target_web_data = gl.nondet.web.render(artwork_url, mode="text")
            except Exception as e:
                raise Exception(f"Failed to crawl target artwork URL: {str(e)}")

            # 2. Crawl source URLs metadata/content
            source_urls = json.loads(source_urls_json)
            source_contents = {}
            for src in source_urls:
                try:
                    source_contents[src] = gl.nondet.web.render(src, mode="text")
                except Exception as e:
                    source_contents[src] = f"Error rendering source: {str(e)}"

            # 3. Wayback Machine snapshot checks
            wayback_data = {}
            try:
                wayback_data[artwork_url] = gl.nondet.web.render(
                    f"https://archive.org/wayback/available?url={artwork_url}", mode="text"
                )
            except Exception as e:
                wayback_data[artwork_url] = f"Wayback API error: {str(e)}"

            for src in source_urls:
                try:
                    wayback_data[src] = gl.nondet.web.render(
                        f"https://archive.org/wayback/available?url={src}", mode="text"
                    )
                except Exception as e:
                    wayback_data[src] = f"Wayback API error: {str(e)}"

            # 4. Construct Prompt
            task = f"""
You are GenArtAuth, an AI Art Detective.
Analyze the target digital artwork and its original source references to verify its authenticity.
Compare creation dates, metadata, and history from the Wayback Machine snapshots to establish a timeline of first appearance.

Target Artwork Content / Meta:
{target_web_data}

Wayback Machine Target Data:
{wayback_data.get(artwork_url, "")}

Source URLs Content:
{json.dumps(source_contents)}

Wayback Machine Sources Data:
{json.dumps({src: wayback_data.get(src, "") for src in source_urls})}

Determine if the target artwork is an ORIGINAL creation or a COPY (plagiarized, re-minted, or duplicate).
You must output a JSON object with the exact following schema:
{{
  "verdict": "ORIGINAL" | "COPY",
  "action": "MINT_SAFE" | "BLOCK_MINT",
  "confidence": <integer between 0 and 100>,
  "earliest_source": "<url of the earliest appearance, either target or one of the sources>",
  "reason": "<detailed explanation of the timeline, risk factors, and plagiarism checks>"
}}
It is mandatory that you respond only using the JSON format above, nothing else.
            """
            
            result = gl.nondet.exec_prompt(task, response_format="json")
            
            # Safe parsing and validation
            try:
                # If exec_prompt with response_format="json" returns a dict, serialize it first
                if isinstance(result, dict):
                    parsed = result
                else:
                    parsed = json.loads(result)
                
                # Normalize values
                verdict = parsed.get("verdict", "").upper()
                action = parsed.get("action", "").upper()
                confidence = int(parsed.get("confidence", 0))
                earliest_source = parsed.get("earliest_source", "")
                reason = parsed.get("reason", "")

                if verdict not in ["ORIGINAL", "COPY"]:
                    verdict = "COPY"  # Safe default
                if action not in ["MINT_SAFE", "BLOCK_MINT"]:
                    action = "BLOCK_MINT"  # Safe default
                
                cleaned_result = {
                    "verdict": verdict,
                    "action": action,
                    "confidence": confidence,
                    "earliest_source": earliest_source,
                    "reason": reason
                }
                return json.dumps(cleaned_result, sort_keys=True)
            except Exception as e:
                raise Exception(f"Failed to parse AI verdict JSON: {str(e)}")

        principle = (
            "The responses are equivalent if they both agree on the same 'verdict' (ORIGINAL vs COPY) "
            "and the same 'action' (MINT_SAFE vs BLOCK_MINT), and their 'confidence' scores differ "
            "by no more than 15. The 'earliest_source' should point to the same origin, and the "
            "'reason' must be semantically similar."
        )
        
        result_json_str = gl.eq_principle.prompt_comparative(get_verdict, principle)
        return result_json_str

    @gl.public.write
    def submitArtwork(self, artwork_url: str, source_urls: DynArray[str]) -> str:
        # Check for empty source URLs
        if len(source_urls) == 0:
            raise Exception("Source URLs cannot be empty")
            
        # Double-submit protection
        normalized_url = artwork_url.strip().lower()
        if normalized_url in self.artwork_url_to_id:
            raise Exception("Artwork already submitted")

        artwork_id = self.next_artwork_id
        self.next_artwork_id = str(int(self.next_artwork_id) + 1)
        
        # Serialize source_urls for storage
        urls_list = []
        for url in source_urls:
            urls_list.append(url)
            
        artwork = Artwork(
            artwork_id=artwork_id,
            submitter=gl.message.sender_address,
            artwork_url=artwork_url,
            source_urls=json.dumps(urls_list),
            status="PENDING",
            verdict=""
        )
        self.artworks[artwork_id] = artwork
        self.artwork_url_to_id[normalized_url] = artwork_id
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
    def getVerificationResult(self, artwork_id: str) -> str:
        if artwork_id not in self.artworks:
            raise Exception("Artwork not found")
            
        artwork = self.artworks[artwork_id]
        
        # Parse source_urls from storage JSON
        source_urls_list = json.loads(artwork.source_urls)
        
        # Parse verdict if it exists
        verdict_data = None
        if artwork.verdict:
            verdict_data = json.loads(artwork.verdict)
            
        result = {
            "artwork_id": artwork.artwork_id,
            "submitter": artwork.submitter.as_hex,
            "artwork_url": artwork.artwork_url,
            "source_urls": source_urls_list,
            "status": artwork.status,
            "verdict": verdict_data
        }
        return json.dumps(result)
