"""Event queue system using Redis."""

import json
from typing import Dict, Any, Optional
from redis.asyncio import Redis
from ..config.settings import settings

class EventQueue:
    """Manages event queue using Redis."""
    
    def __init__(self):
        """Initialize Redis connection."""
        if settings.REDIS_ENABLED:
            self.redis = Redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        else:
            self.redis = None
            self.queue = []
            self.processing = []
            self.events = {}
        
        self.queue_key = "doc_agent:event_queue"
        self.processing_key = "doc_agent:processing"
    
    async def enqueue_event(self, event_data: Dict[str, Any]) -> str:
        """Add event to queue."""
        # Generate event ID
        event_id = f"event:{event_data['repository']['name']}:{event_data['pull_request']['number']}"
        
        if settings.REDIS_ENABLED and self.redis:
            # Store event data
            await self.redis.hset(
                f"doc_agent:events:{event_id}",
                mapping={
                    "data": json.dumps(event_data),
                    "status": "queued"
                }
            )
            
            # Add to queue
            await self.redis.lpush(self.queue_key, event_id)
        else:
            # Store in memory
            self.events[event_id] = {
                "data": event_data,
                "status": "queued"
            }
            self.queue.append(event_id)
        
        return event_id
    
    async def dequeue_event(self) -> Optional[Dict[str, Any]]:
        """Get next event from queue."""
        if not settings.REDIS_ENABLED or not self.redis:
            if not self.queue:
                return None
            
            event_id = self.queue.pop()
            self.processing.append(event_id)
            
            event_data = self.events.get(event_id, {}).get("data")
            if event_data:
                return {
                    "id": event_id,
                    "data": event_data
                }
            return None
        
        # Move event from queue to processing using multi-exec
        async with self.redis.pipeline(transaction=True) as pipe:
            while True:
                try:
                    # Watch the queue key
                    await pipe.watch(self.queue_key)
                    
                    # Get the next event
                    event_id = await self.redis.rpop(self.queue_key)
                    if not event_id:
                        return None
                    
                    # Start transaction
                    pipe.multi()
                    
                    # Add to processing list
                    pipe.lpush(self.processing_key, event_id)
                    
                    # Execute transaction
                    await pipe.execute()
                    break
                except Exception:
                    continue
                finally:
                    await pipe.reset()
        
        # Get event data
        event_data = await self.redis.hget(f"doc_agent:events:{event_id}", "data")
        if event_data:
            return {
                "id": event_id,
                "data": json.loads(event_data)
            }
        
        return None
    
    async def complete_event(self, event_id: str, success: bool = True) -> None:
        """Mark event as completed and remove from processing."""
        if settings.REDIS_ENABLED and self.redis:
            # Update status
            await self.redis.hset(
                f"doc_agent:events:{event_id}",
                "status",
                "completed" if success else "failed"
            )
            
            # Remove from processing
            await self.redis.lrem(self.processing_key, 0, event_id)
        else:
            # Update in memory
            if event_id in self.events:
                self.events[event_id]["status"] = "completed" if success else "failed"
            if event_id in self.processing:
                self.processing.remove(event_id)
    
    async def get_queue_length(self) -> int:
        """Get number of events in queue."""
        if settings.REDIS_ENABLED and self.redis:
            return await self.redis.llen(self.queue_key)
        return len(self.queue)
    
    async def get_processing_count(self) -> int:
        """Get number of events being processed."""
        if settings.REDIS_ENABLED and self.redis:
            return await self.redis.llen(self.processing_key)
        return len(self.processing)
    
    async def get_event_status(self, event_id: str) -> Optional[str]:
        """Get status of specific event."""
        if settings.REDIS_ENABLED and self.redis:
            return await self.redis.hget(f"doc_agent:events:{event_id}", "status")
        return self.events.get(event_id, {}).get("status")
