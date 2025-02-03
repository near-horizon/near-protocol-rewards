"""Tests for event processor."""

import pytest
from src.events.processor import EventProcessor

@pytest.mark.asyncio
async def test_process_event_success(event_processor, sample_pr_event):
    """Test successful event processing."""
    # Process the event
    await event_processor.process_event({
        "id": "test-1",
        "data": sample_pr_event
    })
    
    # Verify commit analysis was called
    event_processor.commit_agent.analyze_changes.assert_called_once_with(sample_pr_event)
    
    # Verify documentation was generated
    event_processor.docs_agent.generate_documentation.assert_called_once()
    
    # Verify tutorial was created
    event_processor.tutorial_agent.create_tutorial.assert_called_once()
    
    # Verify review was performed
    event_processor.review_agent.review_content.assert_called_once()
    
    # Verify PR was created
    event_processor.github_service.create_branch.assert_called_once()
    event_processor.github_service.create_pull_request.assert_called_once()
    
    # Verify event was marked as completed
    event_processor.queue.complete_event.assert_called_once_with("test-1", success=True)

@pytest.mark.asyncio
async def test_process_event_no_docs_needed(event_processor, sample_pr_event, mock_commit_agent):
    """Test event processing when no documentation is needed."""
    # Configure commit agent to indicate no docs needed
    mock_commit_agent.analyze_changes.return_value = {
        "change_types": ["test"],
        "doc_needs": "none",
        "significance": "patch",
        "breaking_changes": [],
        "areas_affected": ["tests"],
        "dependencies": []
    }
    
    # Process the event
    await event_processor.process_event({
        "id": "test-1",
        "data": sample_pr_event
    })
    
    # Verify docs were not generated
    event_processor.docs_agent.generate_documentation.assert_not_called()
    event_processor.tutorial_agent.create_tutorial.assert_not_called()
    event_processor.review_agent.review_content.assert_not_called()
    event_processor.github_service.create_pull_request.assert_not_called()

@pytest.mark.asyncio
async def test_process_event_review_rejected(event_processor, sample_pr_event, mock_review_agent):
    """Test event processing when review is rejected."""
    # Configure review agent to reject the content
    mock_review_agent.review_content.return_value = {
        "approved": False,
        "raw_review": "Documentation needs improvement"
    }
    
    # Process the event
    await event_processor.process_event({
        "id": "test-1",
        "data": sample_pr_event
    })
    
    # Verify PR was not created
    event_processor.github_service.create_pull_request.assert_not_called()

@pytest.mark.asyncio
async def test_process_event_error_handling(event_processor, sample_pr_event, mock_docs_agent):
    """Test error handling during event processing."""
    # Configure docs agent to raise an exception
    mock_docs_agent.generate_documentation.side_effect = Exception("Test error")
    
    # Process the event
    await event_processor.process_event({
        "id": "test-1",
        "data": sample_pr_event
    })
    
    # Verify event was marked as failed
    event_processor.queue.complete_event.assert_called_once_with("test-1", success=False)

@pytest.mark.asyncio
async def test_determine_docs_to_generate(event_processor):
    """Test documentation type determination logic."""
    from src.agents.commit_agent import ChangeType, DocumentationNeed
    
    # Test full documentation need
    docs = event_processor._determine_docs_to_generate(
        [ChangeType.API],
        DocumentationNeed.FULL
    )
    assert set(docs) == {"api", "guide", "tutorial"}
    
    # Test partial documentation need
    docs = event_processor._determine_docs_to_generate(
        [ChangeType.UI],
        DocumentationNeed.PARTIAL
    )
    assert set(docs) == {"guide"}
    
    # Test minimal documentation need
    docs = event_processor._determine_docs_to_generate(
        [ChangeType.CONFIG],
        DocumentationNeed.MINIMAL
    )
    assert set(docs) == {"guide"} 