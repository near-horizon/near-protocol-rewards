"""Tests for GitHub webhook handler."""

import pytest
from fastapi.testclient import TestClient
from src.webhook.github import app
from src.events.queue import EventQueue

@pytest.fixture
def test_client(mock_event_queue):
    """Create a test client with mocked dependencies."""
    app.dependency_overrides[EventQueue] = lambda: mock_event_queue
    return TestClient(app)

@pytest.mark.asyncio
async def test_webhook_pull_request_merged(test_client, sample_pr_event):
    """Test webhook handler for merged pull request."""
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
    assert response.json() == {"message": "Event processed successfully"}

@pytest.mark.asyncio
async def test_webhook_invalid_event(test_client):
    """Test webhook handler with invalid event type."""
    response = test_client.post(
        "/webhook/github",
        json={"action": "created"},
        headers={"X-GitHub-Event": "invalid"}
    )
    
    assert response.status_code == 400
    assert "Unsupported event type" in response.json()["detail"]

@pytest.mark.asyncio
async def test_webhook_missing_header(test_client):
    """Test webhook handler with missing event header."""
    response = test_client.post(
        "/webhook/github",
        json={"action": "closed"}
    )
    
    assert response.status_code == 400
    assert "Missing X-GitHub-Event header" in response.json()["detail"]

@pytest.mark.asyncio
async def test_webhook_unmerged_pr(test_client, sample_pr_event):
    """Test webhook handler for unmerged pull request."""
    response = test_client.post(
        "/webhook/github",
        json={
            "action": "closed",
            "pull_request": {
                "merged": False,
                "number": sample_pr_event["pull_request"]["number"],
                "title": sample_pr_event["pull_request"]["title"],
                "body": sample_pr_event["pull_request"]["description"],
                "base": {"ref": sample_pr_event["pull_request"]["base_branch"]}
            }
        },
        headers={"X-GitHub-Event": "pull_request"}
    )
    
    assert response.status_code == 200
    assert response.json() == {"message": "Event skipped - PR not merged"} 