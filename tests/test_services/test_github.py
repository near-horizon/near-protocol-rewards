"""Tests for GitHub service."""

import pytest
from unittest.mock import AsyncMock, patch
from src.services.github_service import GitHubService

@pytest.fixture
def github_service():
    """Create a GitHub service instance with mocked client."""
    service = GitHubService()
    service.client = AsyncMock()
    return service

@pytest.mark.asyncio
async def test_create_branch(github_service):
    """Test creating a new branch."""
    # Mock the get reference response
    github_service.client.get_ref = AsyncMock(return_value={
        "object": {"sha": "abc123"}
    })
    
    # Mock the create reference response
    github_service.client.create_ref = AsyncMock(return_value={
        "ref": "refs/heads/new-branch",
        "object": {"sha": "abc123"}
    })
    
    result = await github_service.create_branch(
        base_branch="main",
        new_branch="docs/pr-123"
    )
    
    assert result is True
    github_service.client.get_ref.assert_called_once_with("heads/main")
    github_service.client.create_ref.assert_called_once()

@pytest.mark.asyncio
async def test_create_file(github_service):
    """Test creating a new file."""
    github_service.client.create_file = AsyncMock(return_value={
        "content": {
            "html_url": "https://github.com/org/repo/blob/main/docs/api.md"
        }
    })
    
    result = await github_service.create_file(
        path="docs/api.md",
        content="# API Documentation",
        branch="docs/pr-123",
        message="Add API documentation"
    )
    
    assert result is True
    github_service.client.create_file.assert_called_once_with(
        path="docs/api.md",
        message="Add API documentation",
        content="# API Documentation",
        branch="docs/pr-123"
    )

@pytest.mark.asyncio
async def test_update_file(github_service):
    """Test updating an existing file."""
    # Mock get file response
    github_service.client.get_contents = AsyncMock(return_value={
        "sha": "abc123",
        "content": "old content"
    })
    
    # Mock update file response
    github_service.client.update_file = AsyncMock(return_value={
        "content": {
            "html_url": "https://github.com/org/repo/blob/main/docs/api.md"
        }
    })
    
    result = await github_service.update_file(
        path="docs/api.md",
        content="# Updated API Documentation",
        branch="docs/pr-123",
        message="Update API documentation"
    )
    
    assert result is True
    github_service.client.get_contents.assert_called_once()
    github_service.client.update_file.assert_called_once()

@pytest.mark.asyncio
async def test_create_pull_request(github_service):
    """Test creating a pull request."""
    github_service.client.create_pull = AsyncMock(return_value={
        "number": 123,
        "html_url": "https://github.com/org/repo/pull/123"
    })
    
    result = await github_service.create_pull_request(
        title="Documentation updates",
        body="This PR updates documentation",
        head_branch="docs/pr-123",
        base_branch="main"
    )
    
    assert result["number"] == 123
    assert "html_url" in result
    github_service.client.create_pull.assert_called_once_with(
        title="Documentation updates",
        body="This PR updates documentation",
        head="docs/pr-123",
        base="main"
    )

@pytest.mark.asyncio
async def test_read_file(github_service):
    """Test reading a file."""
    github_service.client.get_contents = AsyncMock(return_value={
        "content": "IyBBUEkgRG9jdW1lbnRhdGlvbgo=",  # base64 encoded "# API Documentation"
        "encoding": "base64"
    })
    
    content = await github_service.read_file(
        path="docs/api.md",
        ref="main"
    )
    
    assert content == "# API Documentation"
    github_service.client.get_contents.assert_called_once_with(
        path="docs/api.md",
        ref="main"
    )

@pytest.mark.asyncio
async def test_error_handling(github_service):
    """Test error handling in GitHub service."""
    # Mock an API error
    github_service.client.create_file = AsyncMock(side_effect=Exception("API Error"))
    
    result = await github_service.create_file(
        path="docs/api.md",
        content="# API Documentation",
        branch="docs/pr-123",
        message="Add API documentation"
    )
    
    assert result is False 