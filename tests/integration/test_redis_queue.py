"""Integration tests for Redis event queue."""

import pytest
import redis.asyncio as redis
from src.events.queue import EventQueue

@pytest.fixture
async def redis_client():
    """Create a Redis client for testing."""
    client = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True
    )
    yield client
    await client.flushdb()  # Clean up after tests
    await client.close()

@pytest.fixture
async def event_queue(redis_client):
    """Create an event queue instance with Redis client."""
    queue = EventQueue()
    queue.redis = redis_client
    return queue

@pytest.mark.integration
@pytest.mark.asyncio
async def test_enqueue_dequeue_event(event_queue):
    """Test enqueueing and dequeueing events."""
    test_event = {
        "id": "test-1",
        "data": {
            "pull_request": {
                "number": 1,
                "title": "Test PR",
                "description": "Test description"
            }
        }
    }
    
    # Enqueue event
    success = await event_queue.enqueue_event(test_event)
    assert success is True
    
    # Dequeue event
    result = await event_queue.dequeue_event()
    assert result is not None
    assert result["id"] == test_event["id"]
    assert result["data"]["pull_request"]["number"] == test_event["data"]["pull_request"]["number"]

@pytest.mark.integration
@pytest.mark.asyncio
async def test_complete_event(event_queue):
    """Test marking events as completed."""
    test_event = {
        "id": "test-1",
        "data": {
            "pull_request": {
                "number": 1
            }
        }
    }
    
    # Enqueue and complete event
    await event_queue.enqueue_event(test_event)
    success = await event_queue.complete_event(test_event["id"], success=True)
    assert success is True
    
    # Verify event is removed from queue
    result = await event_queue.dequeue_event()
    assert result is None

@pytest.mark.integration
@pytest.mark.asyncio
async def test_concurrent_events(event_queue):
    """Test handling multiple events concurrently."""
    test_events = [
        {
            "id": f"test-{i}",
            "data": {
                "pull_request": {
                    "number": i,
                    "title": f"Test PR {i}"
                }
            }
        }
        for i in range(5)
    ]
    
    # Enqueue multiple events
    for event in test_events:
        await event_queue.enqueue_event(event)
    
    # Dequeue and verify order
    for i in range(5):
        result = await event_queue.dequeue_event()
        assert result is not None
        assert result["id"] == f"test-{i}"
        assert result["data"]["pull_request"]["number"] == i

@pytest.mark.integration
@pytest.mark.asyncio
async def test_failed_event_handling(event_queue):
    """Test handling of failed events."""
    test_event = {
        "id": "test-fail",
        "data": {
            "pull_request": {
                "number": 1
            }
        }
    }
    
    # Enqueue event and mark as failed
    await event_queue.enqueue_event(test_event)
    await event_queue.complete_event(test_event["id"], success=False)
    
    # Verify event is moved to failed queue
    failed_events = await event_queue.redis.lrange("failed_events", 0, -1)
    assert len(failed_events) == 1
    assert test_event["id"] in failed_events[0] 