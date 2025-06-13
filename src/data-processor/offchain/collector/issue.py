"""
Issue data collector for GitHub repositories.

This module is responsible for collecting issue-related metrics
from GitHub repositories within specified date ranges.
"""

import logging
from typing import List, Dict, Any, Set
from datetime import datetime

from ..models import IssueMetrics, RepositoryInfo, DateRange
from ..github_api_client import GitHubApiClient

logger = logging.getLogger(__name__)


class IssueCollector:
    """Collector for issue-related data from GitHub repositories."""
    
    def __init__(self, api_client: GitHubApiClient):
        """
        Initialize issue collector.
        
        Args:
            api_client: GitHub API client instance
        """
        self.api_client = api_client
    
    def collectIssueData(self, repository: RepositoryInfo, date_range: DateRange) -> IssueMetrics:
        """
        Collect issue data for a repository within a date range.
        
        Args:
            repository: Repository information
            date_range: Date range for data collection
            
        Returns:
            IssueMetrics with collected data
        """
        logger.info(f"Collecting issue data for {repository.full_name}")
        
        since, until = date_range.to_iso_format()
        base_url = f"{self.api_client.base_url}/repos/{repository.owner}/{repository.name}"
        issues_url = f"{base_url}/issues?state=all&since={since}"
        
        try:
            response = self.api_client.makePaginatedRequest(issues_url)
            issues_data = response.data
            
            logger.info(f"Found {len(issues_data)} total issues for {repository.full_name}")
            
            # Filter and process issues (excluding pull requests)
            metrics = self._processIssueData(issues_data, date_range)
            
            logger.info(f"Processed issues - Open: {metrics.open}, Closed: {metrics.closed}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting issue data for {repository.full_name}: {str(e)}")
            return IssueMetrics(open=0, closed=0, participants=[])
    
    def _processIssueData(self, issues_data: List[Dict[str, Any]], date_range: DateRange) -> IssueMetrics:
        """
        Process issue data to extract metrics within date range.
        
        Args:
            issues_data: Raw issue data from GitHub API
            date_range: Date range for filtering
            
        Returns:
            IssueMetrics with processed data
        """
        open_count = 0
        closed_count = 0
        participants: Set[str] = set()
        
        since, until = date_range.to_iso_format()
        
        for issue in issues_data:
            # Skip pull requests (GitHub API returns PRs as issues)
            if self._isPullRequest(issue):
                continue
            
            # Check if issue was created within the date range
            if not self._isIssueInDateRange(issue, since, until):
                continue
            
            # Add issue creator to participants
            if issue.get("user") and issue["user"].get("login"):
                participants.add(issue["user"]["login"])
            
            # Categorize issue by state
            if issue["state"] == "open":
                open_count += 1
            else:
                closed_count += 1
        
        logger.info(f"Filtered {len(participants)} unique issue participants within date range")
        
        return IssueMetrics(
            open=open_count,
            closed=closed_count,
            participants=list(participants)
        )
    
    def _isPullRequest(self, issue: Dict[str, Any]) -> bool:
        """
        Check if an issue is actually a pull request.
        
        Args:
            issue: Issue data from GitHub API
            
        Returns:
            True if the issue is a pull request, False otherwise
        """
        return "pull_request" in issue
    
    def _isIssueInDateRange(self, issue: Dict[str, Any], since: str, until: str) -> bool:
        """
        Check if an issue was created within the specified date range.
        
        Args:
            issue: Issue data
            since: Start date in ISO format
            until: End date in ISO format
            
        Returns:
            True if issue is within date range, False otherwise
        """
        created_at = issue.get("created_at")
        if not created_at:
            return False
        
        return since <= created_at <= until 