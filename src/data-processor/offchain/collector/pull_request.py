"""
Pull request data collector for GitHub repositories.

This module is responsible for collecting pull request-related metrics
from GitHub repositories within specified date ranges.
"""

import logging
from typing import List, Dict, Any, Set
from datetime import datetime

from ..models import PullRequestMetrics, RepositoryInfo, DateRange
from ..github_api_client import GitHubApiClient

logger = logging.getLogger(__name__)


class PullRequestCollector:
    """Collector for pull request-related data from GitHub repositories."""
    
    def __init__(self, api_client: GitHubApiClient):
        """
        Initialize pull request collector.
        
        Args:
            api_client: GitHub API client instance
        """
        self.api_client = api_client
    
    def collectPullRequestData(self, repository: RepositoryInfo, date_range: DateRange) -> PullRequestMetrics:
        """
        Collect pull request data for a repository within a date range.
        
        Args:
            repository: Repository information
            date_range: Date range for data collection
            
        Returns:
            PullRequestMetrics with collected data
        """
        logger.info(f"Collecting pull request data for {repository.full_name}")
        
        base_url = f"{self.api_client.base_url}/repos/{repository.owner}/{repository.name}"
        pulls_url = f"{base_url}/pulls?state=all"
        
        try:
            response = self.api_client.makePaginatedRequest(pulls_url)
            pulls_data = response.data
            
            logger.info(f"Found {len(pulls_data)} total pull requests for {repository.full_name}")
            
            # Filter and process pull requests within date range
            metrics = self._processPullRequestData(pulls_data, date_range)
            
            logger.info(f"Processed PRs - Open: {metrics.open}, Merged: {metrics.merged}, Closed: {metrics.closed}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting pull request data for {repository.full_name}: {str(e)}")
            return PullRequestMetrics(open=0, merged=0, closed=0, authors=[])
    
    def _processPullRequestData(self, pulls_data: List[Dict[str, Any]], date_range: DateRange) -> PullRequestMetrics:
        """
        Process pull request data to extract metrics within date range.
        
        Args:
            pulls_data: Raw pull request data from GitHub API
            date_range: Date range for filtering
            
        Returns:
            PullRequestMetrics with processed data
        """
        open_count = 0
        merged_count = 0
        closed_count = 0
        authors: Set[str] = set()
        
        since, until = date_range.to_iso_format()
        
        for pr in pulls_data:
            # Check if PR was created within the date range
            if not self._isPullRequestInDateRange(pr, since, until):
                continue
            
            # Add author to set
            if pr.get("user") and pr["user"].get("login"):
                authors.add(pr["user"]["login"])
            
            # Categorize PR by state
            if pr["state"] == "open":
                open_count += 1
            elif pr.get("merged_at"):  # PR was merged
                merged_count += 1
            else:  # PR was closed without merging
                closed_count += 1
        
        logger.info(f"Filtered {len(authors)} unique PR authors within date range")
        
        return PullRequestMetrics(
            open=open_count,
            merged=merged_count,
            closed=closed_count,
            authors=list(authors)
        )
    
    def _isPullRequestInDateRange(self, pr: Dict[str, Any], since: str, until: str) -> bool:
        """
        Check if a pull request was created within the specified date range.
        
        Args:
            pr: Pull request data
            since: Start date in ISO format
            until: End date in ISO format
            
        Returns:
            True if PR is within date range, False otherwise
        """
        created_at = pr.get("created_at")
        if not created_at:
            return False
        
        return since <= created_at <= until 