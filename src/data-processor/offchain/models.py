"""
Data models for off-chain GitHub data collection.

This module contains all data structures used for collecting and organizing
GitHub repository metrics including commits, pull requests, reviews, and issues.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class CommitAuthor:
    """Represents a commit author with their contribution count."""
    login: str
    count: int


@dataclass
class CommitMetrics:
    """Represents commit-related metrics for a repository."""
    count: int
    authors: List[CommitAuthor]


@dataclass
class PullRequestMetrics:
    """Represents pull request metrics for a repository."""
    open: int
    merged: int
    closed: int
    authors: List[str]


@dataclass
class ReviewMetrics:
    """Represents code review metrics for a repository."""
    count: int
    authors: List[str]


@dataclass
class IssueMetrics:
    """Represents issue metrics for a repository."""
    open: int
    closed: int
    participants: List[str]


@dataclass
class RepositoryMetrics:
    """Complete metrics for a single repository."""
    repository_name: str
    commits: CommitMetrics
    pull_requests: PullRequestMetrics
    reviews: ReviewMetrics
    issues: IssueMetrics
    collection_date: datetime


@dataclass
class CombinedMetrics:
    """Combined metrics from multiple repositories."""
    commits: CommitMetrics
    pull_requests: PullRequestMetrics
    reviews: ReviewMetrics
    issues: IssueMetrics
    repositories_count: int
    collection_date: datetime


@dataclass
class GitHubApiResponse:
    """Represents a GitHub API response with pagination info."""
    data: List[Dict[str, Any]]
    has_next_page: bool
    current_page: int
    total_items: int


@dataclass
class DateRange:
    """Represents a date range for data collection."""
    start_date: datetime
    end_date: datetime
    
    def to_iso_format(self) -> tuple[str, str]:
        """Convert dates to ISO format for GitHub API."""
        return (
            self.start_date.isoformat() + "Z",
            self.end_date.isoformat() + "Z"
        )


@dataclass
class RepositoryInfo:
    """Basic repository information."""
    owner: str
    name: str
    full_name: str
    
    @classmethod
    def from_full_name(cls, full_name: str) -> 'RepositoryInfo':
        """Create RepositoryInfo from full repository name (owner/repo)."""
        owner, name = full_name.split("/", 1)
        return cls(owner=owner, name=name, full_name=full_name) 