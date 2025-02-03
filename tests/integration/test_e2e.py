"""End-to-end tests for the complete workflow."""

import pytest
from fastapi.testclient import TestClient
import redis.asyncio as redis
from src.main import app
from src.events.processor import EventProcessor
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
    await client.flushdb()
    await client.close()

@pytest.fixture
def test_client(redis_client):
    """Create a test client with Redis dependency."""
    app.dependency_overrides[redis.Redis] = lambda: redis_client
    return TestClient(app)

@pytest.fixture
async def event_processor(
    mock_commit_agent,
    mock_docs_agent,
    mock_tutorial_agent,
    mock_review_agent,
    mock_github_service,
    redis_client
):
    """Create an event processor with mocked agents and Redis."""
    processor = EventProcessor()
    processor.queue = EventQueue()
    processor.queue.redis = redis_client
    processor.commit_agent = mock_commit_agent
    processor.docs_agent = mock_docs_agent
    processor.tutorial_agent = mock_tutorial_agent
    processor.review_agent = mock_review_agent
    processor.github_service = mock_github_service
    return processor

@pytest.mark.integration
@pytest.mark.asyncio
async def test_complete_workflow(test_client, event_processor, sample_pr_event):
    """Test the complete workflow from webhook to documentation PR."""
    # 1. Send webhook event
    response = test_client.post(
        "/webhook/github",
        json={
            "action": "closed",
            "pull_request": {
                "merged": True,
                "number": sample_pr_event["pull_request"]["number"],
                "title": sample_pr_event["pull_request"]["title"],
                "body": sample_pr_event["pull_request"]["description"],
                "base": {"ref": sample_pr_event["pull_request"]["base_branch"]}
            }
        },
        headers={"X-GitHub-Event": "pull_request"}
    )
    assert response.status_code == 200
    
    # 2. Process the event
    event = await event_processor.queue.dequeue_event()
    assert event is not None
    await event_processor.process_event(event)
    
    # 3. Verify commit analysis was performed
    event_processor.commit_agent.analyze_changes.assert_called_once()
    
    # 4. Verify documentation was generated
    event_processor.docs_agent.generate_documentation.assert_called_once()
    
    # 5. Verify tutorial was created
    event_processor.tutorial_agent.create_tutorial.assert_called_once()
    
    # 6. Verify review was performed
    event_processor.review_agent.review_content.assert_called_once()
    
    # 7. Verify PR was created
    event_processor.github_service.create_pull_request.assert_called_once()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_error_recovery(test_client, event_processor, sample_pr_event, mock_docs_agent):
    """Test error recovery in the workflow."""
    # Configure docs agent to fail
    mock_docs_agent.generate_documentation.side_effect = Exception("Test error")
    
    # 1. Send webhook event
    response = test_client.post(
        "/webhook/github",
        json={
            "action": "closed",
            "pull_request": {
                "merged": True,
                "number": sample_pr_event["pull_request"]["number"],
                "title": sample_pr_event["pull_request"]["title"],
                "body": sample_pr_event["pull_request"]["description"],
                "base": {"ref": sample_pr_event["pull_request"]["base_branch"]}
            }
        },
        headers={"X-GitHub-Event": "pull_request"}
    )
    assert response.status_code == 200
    
    # 2. Process the event
    event = await event_processor.queue.dequeue_event()
    assert event is not None
    await event_processor.process_event(event)
    
    # 3. Verify event was marked as failed
    failed_events = await event_processor.queue.redis.lrange("failed_events", 0, -1)
    assert len(failed_events) == 1
    
    # 4. Verify PR was not created
    event_processor.github_service.create_pull_request.assert_not_called()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_concurrent_workflows(test_client, event_processor):
    """Test handling multiple workflows concurrently."""
    # Create multiple PR events
    events = []
    for i in range(3):
        events.append({
            "action": "closed",
            "pull_request": {
                "merged": True,
                "number": i,
                "title": f"Test PR {i}",
                "body": f"Test description {i}",
                "base": {"ref": "main"}
            }
        })
    
    # Send webhook events
    for event in events:
        response = test_client.post(
            "/webhook/github",
            json=event,
            headers={"X-GitHub-Event": "pull_request"}
        )
        assert response.status_code == 200
    
    # Process all events
    for i in range(3):
        event = await event_processor.queue.dequeue_event()
        assert event is not None
        await event_processor.process_event(event)
    
    # Verify all PRs were created
    assert event_processor.github_service.create_pull_request.call_count == 3 