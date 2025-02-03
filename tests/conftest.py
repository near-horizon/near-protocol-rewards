"""Test fixtures for the Orc-Agent test suite."""

import pytest
from unittest.mock import MagicMock, AsyncMock
from src.agents.commit_agent import CommitAnalysisAgent
from src.agents.docs_agent import DocumentationAgent
from src.agents.tutorial_agent import TutorialAgent
from src.agents.review_agent import ReviewAgent
from src.events.processor import EventProcessor
from src.events.queue import EventQueue
from src.services.github_service import GitHubService

@pytest.fixture
def mock_github_service():
    """Mock GitHub service for testing."""
    service = MagicMock(spec=GitHubService)
    service.create_branch = AsyncMock(return_value=True)
    service.create_file = AsyncMock(return_value=True)
    service.update_file = AsyncMock(return_value=True)
    service.create_pull_request = AsyncMock(return_value={"html_url": "https://github.com/org/repo/pull/1"})
    service.read_file = AsyncMock(return_value="file content")
    return service

@pytest.fixture
def mock_event_queue():
    """Mock event queue for testing."""
    queue = MagicMock(spec=EventQueue)
    queue.enqueue_event = AsyncMock(return_value=True)
    queue.dequeue_event = AsyncMock(return_value={
        "id": "test-event-1",
        "data": {
            "pull_request": {
                "number": 1,
                "title": "Test PR",
                "description": "Test description",
                "base_branch": "main"
            },
            "changes": {
                "added_files": ["test.py"],
                "modified_files": [],
                "removed_files": []
            },
            "tasks": ["generate_docs"]
        }
    })
    queue.complete_event = AsyncMock(return_value=True)
    return queue

@pytest.fixture
def mock_commit_agent():
    """Mock commit analysis agent for testing."""
    agent = MagicMock(spec=CommitAnalysisAgent)
    agent.analyze_changes = AsyncMock(return_value={
        "change_types": ["api"],
        "doc_needs": "full",
        "significance": "minor",
        "breaking_changes": [],
        "areas_affected": ["backend"],
        "dependencies": []
    })
    return agent

@pytest.fixture
def mock_docs_agent():
    """Mock documentation agent for testing."""
    agent = MagicMock(spec=DocumentationAgent)
    agent.generate_documentation = AsyncMock(return_value={
        "api": {
            "files": ["docs/api.md"],
            "content": "# API Documentation"
        }
    })
    return agent

@pytest.fixture
def mock_tutorial_agent():
    """Mock tutorial agent for testing."""
    agent = MagicMock(spec=TutorialAgent)
    agent.create_tutorial = AsyncMock(return_value={
        "file": "docs/tutorial.md",
        "content": "# Tutorial"
    })
    return agent

@pytest.fixture
def mock_review_agent():
    """Mock review agent for testing."""
    agent = MagicMock(spec=ReviewAgent)
    agent.review_content = AsyncMock(return_value={
        "approved": True,
        "raw_review": "Documentation looks good!"
    })
    return agent

@pytest.fixture
def sample_pr_event():
    """Sample pull request event data for testing."""
    return {
        "pull_request": {
            "number": 1,
            "title": "Add new feature",
            "description": "This PR adds a new feature",
            "base_branch": "main"
        },
        "changes": {
            "added_files": ["src/feature.py"],
            "modified_files": ["src/existing.py"],
            "removed_files": []
        },
        "tasks": ["generate_docs", "create_tutorial"]
    }

@pytest.fixture
def event_processor(
    mock_event_queue,
    mock_commit_agent,
    mock_docs_agent,
    mock_tutorial_agent,
    mock_review_agent,
    mock_github_service
):
    """Create an event processor with mocked dependencies."""
    processor = EventProcessor()
    processor.queue = mock_event_queue
    processor.commit_agent = mock_commit_agent
    processor.docs_agent = mock_docs_agent
    processor.tutorial_agent = mock_tutorial_agent
    processor.review_agent = mock_review_agent
    processor.github_service = mock_github_service
    return processor
