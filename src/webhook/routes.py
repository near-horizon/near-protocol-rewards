"""FastAPI routes for GitHub webhook handling."""

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
import hmac
import hashlib
import json
from typing import Optional

from ..config.settings import settings
from .handler import WebhookHandler
from ..events.queue import EventQueue

router = APIRouter()

@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None)
):
    """Handle GitHub webhook events."""
    
    # Verify webhook signature
    if not x_hub_signature_256:
        raise HTTPException(status_code=400, detail="No signature provided")
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook secret
    if not verify_signature(body, x_hub_signature_256, settings.GITHUB_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse event type
    if not x_github_event:
        raise HTTPException(status_code=400, detail="No event type provided")
    
    # Parse payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Only process pull request events
    if x_github_event == "pull_request":
        # Only process merged PRs
        if payload.get("action") == "closed" and payload.get("pull_request", {}).get("merged"):
            # Initialize handler and queue
            handler = WebhookHandler()
            queue = EventQueue()
            
            # Process the event
            event_data = handler.process_pr_merge(payload)
            
            # Queue the event for processing
            await queue.enqueue_event(event_data)
            
            return JSONResponse(content={"status": "Event queued for processing"})
    
    return JSONResponse(content={"status": "Event ignored - not a merged PR"})

def verify_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
    """Verify the webhook signature."""
    if not signature_header.startswith("sha256="):
        return False
    
    expected_signature = signature_header.split("=")[1]
    
    # Calculate signature
    hmac_gen = hmac.new(
        secret.encode(),
        payload_body,
        hashlib.sha256
    )
    digest = hmac_gen.hexdigest()
    
    return hmac.compare_digest(digest, expected_signature)
