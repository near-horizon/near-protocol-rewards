"""Tests for commit analysis agent."""

import pytest
from src.agents.commit_agent import CommitAnalysisAgent, ChangeType, DocumentationNeed

@pytest.mark.asyncio
async def test_analyze_api_changes(mock_github_service):
    """Test analysis of API changes."""
    agent = CommitAnalysisAgent()
    agent.github_service = mock_github_service
    
    event_data = {
        "pull_request": {
            "title": "Add new API endpoint",
            "description": "This PR adds a new REST API endpoint"
        },
        "changes": {
            "added_files": ["src/api/endpoint.py"],
            "modified_files": [],
            "removed_files": []
        }
    }
    
    result = await agent.analyze_changes(event_data)
    
    assert ChangeType.API in result["change_types"]
    assert result["doc_needs"] == DocumentationNeed.FULL
    assert result["significance"] == "minor"
    assert len(result["breaking_changes"]) == 0
    assert "backend" in result["areas_affected"]

@pytest.mark.asyncio
async def test_analyze_ui_changes(mock_github_service):
    """Test analysis of UI changes."""
    agent = CommitAnalysisAgent()
    agent.github_service = mock_github_service
    
    event_data = {
        "pull_request": {
            "title": "Update UI components",
            "description": "This PR updates the UI components"
        },
        "changes": {
            "added_files": [],
            "modified_files": ["src/components/Button.tsx"],
            "removed_files": []
        }
    }
    
    result = await agent.analyze_changes(event_data)
    
    assert ChangeType.UI in result["change_types"]
    assert result["doc_needs"] in [DocumentationNeed.PARTIAL, DocumentationNeed.MINIMAL]
    assert "frontend" in result["areas_affected"]

@pytest.mark.asyncio
async def test_analyze_breaking_changes(mock_github_service):
    """Test analysis of breaking changes."""
    agent = CommitAnalysisAgent()
    agent.github_service = mock_github_service
    
    event_data = {
        "pull_request": {
            "title": "BREAKING CHANGE: Update API response format",
            "description": "This PR changes the API response format"
        },
        "changes": {
            "added_files": [],
            "modified_files": ["src/api/response.py"],
            "removed_files": []
        }
    }
    
    result = await agent.analyze_changes(event_data)
    
    assert ChangeType.API in result["change_types"]
    assert result["doc_needs"] == DocumentationNeed.FULL
    assert result["significance"] == "major"
    assert len(result["breaking_changes"]) > 0

@pytest.mark.asyncio
async def test_analyze_multiple_changes(mock_github_service):
    """Test analysis of multiple types of changes."""
    agent = CommitAnalysisAgent()
    agent.github_service = mock_github_service
    
    event_data = {
        "pull_request": {
            "title": "Update API and UI",
            "description": "This PR updates both API and UI components"
        },
        "changes": {
            "added_files": ["src/api/new.py"],
            "modified_files": ["src/components/UI.tsx"],
            "removed_files": []
        }
    }
    
    result = await agent.analyze_changes(event_data)
    
    assert ChangeType.API in result["change_types"]
    assert ChangeType.UI in result["change_types"]
    assert result["doc_needs"] in [DocumentationNeed.FULL, DocumentationNeed.PARTIAL]
    assert set(result["areas_affected"]) >= {"frontend", "backend"} 