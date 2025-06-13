"""
Commit data collector for GitHub repositories.

This module is responsible for collecting commit-related metrics
from GitHub repositories within specified date ranges.
"""

import logging
from collections import Counter
from typing import List, Dict, Any
from datetime import datetime

from ..models import CommitMetrics, CommitAuthor, RepositoryInfo, DateRange
from ..github_api_client import GitHubApiClient

logger = logging.getLogger(__name__)


class CommitCollector:
    """Collector for commit-related data from GitHub repositories."""
    
    def __init__(self, api_client: GitHubApiClient):
        """
        Initialize commit collector.
        
        Args:
            api_client: GitHub API client instance
        """
        self.api_client = api_client
    
    def collectCommitData(self, repository: RepositoryInfo, date_range: DateRange) -> CommitMetrics:
        """
        Collect commit data for a repository within a date range.
        
        Args:
            repository: Repository information
            date_range: Date range for data collection
            
        Returns:
            CommitMetrics with collected data
        """
        logger.info(f"Collecting commit data for {repository.full_name}")
        
        since, until = date_range.to_iso_format()
        base_url = f"{self.api_client.base_url}/repos/{repository.owner}/{repository.name}"
        commits_url = f"{base_url}/commits?since={since}&until={until}"
        
        try:
            response = self.api_client.makePaginatedRequest(commits_url)
            commits_data = response.data
            
            logger.info(f"Found {len(commits_data)} commits for {repository.full_name}")
            
            # Process commit authors
            author_counts = self._processCommitAuthors(commits_data)
            
            return CommitMetrics(
                count=len(commits_data),
                authors=author_counts
            )
            
        except Exception as e:
            logger.error(f"Error collecting commit data for {repository.full_name}: {str(e)}")
            return CommitMetrics(count=0, authors=[])
    
    def _processCommitAuthors(self, commits_data: List[Dict[str, Any]]) -> List[CommitAuthor]:
        """
        Process commit data to extract author information.
        
        Args:
            commits_data: Raw commit data from GitHub API
            
        Returns:
            List of CommitAuthor objects with contribution counts
        """
        author_counter = Counter()
        
        for commit in commits_data:
            # Handle cases where author might be None or missing
            if commit.get("author") and commit["author"].get("login"):
                author_login = commit["author"]["login"]
            else:
                author_login = "unknown"
            
            author_counter[author_login] += 1
        
        # Convert to CommitAuthor objects
        authors = [
            CommitAuthor(login=login, count=count)
            for login, count in author_counter.items()
        ]
        
        logger.info(f"Processed {len(authors)} unique commit authors")
        return authors 