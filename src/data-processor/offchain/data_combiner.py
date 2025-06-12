"""
Data combiner for aggregating GitHub metrics from multiple repositories.

This module is responsible for combining metrics from multiple repositories
into a single consolidated dataset.
"""

import logging
from collections import Counter
from typing import List
from datetime import datetime

from models import (
    RepositoryMetrics, CombinedMetrics, CommitMetrics, CommitAuthor,
    PullRequestMetrics, ReviewMetrics, IssueMetrics
)

logger = logging.getLogger(__name__)


class DataCombiner:
    """Service for combining metrics from multiple repositories."""
    
    def combineRepositoryMetrics(self, repositories_metrics: List[RepositoryMetrics]) -> CombinedMetrics:
        """
        Combine metrics from multiple repositories into a single dataset.
        
        Args:
            repositories_metrics: List of metrics from individual repositories
            
        Returns:
            CombinedMetrics with aggregated data
        """
        if not repositories_metrics:
            logger.warning("No repository metrics provided for combination")
            return self._createEmptyCombinedMetrics()
        
        logger.info(f"Combining metrics from {len(repositories_metrics)} repositories")
        
        # Initialize aggregation containers
        commit_authors = Counter()
        pr_authors = set()
        reviewers = set()
        issue_participants = set()
        
        # Initialize counters
        total_commits = 0
        total_open_prs = 0
        total_merged_prs = 0
        total_closed_prs = 0
        total_reviews = 0
        total_open_issues = 0
        total_closed_issues = 0
        
        # Aggregate data from all repositories
        for repo_metrics in repositories_metrics:
            # Combine commit data
            total_commits += repo_metrics.commits.count
            for author in repo_metrics.commits.authors:
                commit_authors[author.login] += author.count
            
            # Combine pull request data
            total_open_prs += repo_metrics.pull_requests.open
            total_merged_prs += repo_metrics.pull_requests.merged
            total_closed_prs += repo_metrics.pull_requests.closed
            pr_authors.update(repo_metrics.pull_requests.authors)
            
            # Combine review data
            total_reviews += repo_metrics.reviews.count
            reviewers.update(repo_metrics.reviews.authors)
            
            # Combine issue data
            total_open_issues += repo_metrics.issues.open
            total_closed_issues += repo_metrics.issues.closed
            issue_participants.update(repo_metrics.issues.participants)
        
        # Create combined metrics
        combined_metrics = CombinedMetrics(
            commits=self._createCombinedCommitMetrics(total_commits, commit_authors),
            pull_requests=self._createCombinedPullRequestMetrics(
                total_open_prs, total_merged_prs, total_closed_prs, pr_authors
            ),
            reviews=ReviewMetrics(count=total_reviews, authors=list(reviewers)),
            issues=IssueMetrics(
                open=total_open_issues,
                closed=total_closed_issues,
                participants=list(issue_participants)
            ),
            repositories_count=len(repositories_metrics),
            collection_date=datetime.now()
        )
        
        self._logCombinedMetrics(combined_metrics)
        return combined_metrics
    
    def _createCombinedCommitMetrics(self, total_commits: int, commit_authors: Counter) -> CommitMetrics:
        """
        Create combined commit metrics from aggregated data.
        
        Args:
            total_commits: Total number of commits
            commit_authors: Counter with author contributions
            
        Returns:
            CommitMetrics with combined data
        """
        authors = [
            CommitAuthor(login=login, count=count)
            for login, count in commit_authors.items()
        ]
        
        return CommitMetrics(count=total_commits, authors=authors)
    
    def _createCombinedPullRequestMetrics(
        self, 
        open_prs: int, 
        merged_prs: int, 
        closed_prs: int, 
        pr_authors: set
    ) -> PullRequestMetrics:
        """
        Create combined pull request metrics from aggregated data.
        
        Args:
            open_prs: Number of open pull requests
            merged_prs: Number of merged pull requests
            closed_prs: Number of closed pull requests
            pr_authors: Set of pull request authors
            
        Returns:
            PullRequestMetrics with combined data
        """
        return PullRequestMetrics(
            open=open_prs,
            merged=merged_prs,
            closed=closed_prs,
            authors=list(pr_authors)
        )
    
    def _createEmptyCombinedMetrics(self) -> CombinedMetrics:
        """
        Create empty combined metrics for cases with no data.
        
        Returns:
            CombinedMetrics with zero values
        """
        return CombinedMetrics(
            commits=CommitMetrics(count=0, authors=[]),
            pull_requests=PullRequestMetrics(open=0, merged=0, closed=0, authors=[]),
            reviews=ReviewMetrics(count=0, authors=[]),
            issues=IssueMetrics(open=0, closed=0, participants=[]),
            repositories_count=0,
            collection_date=datetime.now()
        )
    
    def _logCombinedMetrics(self, metrics: CombinedMetrics) -> None:
        """
        Log the combined metrics summary.
        
        Args:
            metrics: Combined metrics to log
        """
        logger.info("📊 Combined metrics summary:")
        logger.info(f"   - Repositories processed: {metrics.repositories_count}")
        logger.info(f"   - Total commits: {metrics.commits.count}")
        logger.info(f"   - Unique commit authors: {len(metrics.commits.authors)}")
        logger.info(f"   - PRs (open/merged/closed): {metrics.pull_requests.open}/{metrics.pull_requests.merged}/{metrics.pull_requests.closed}")
        logger.info(f"   - Unique PR authors: {len(metrics.pull_requests.authors)}")
        logger.info(f"   - Total reviews: {metrics.reviews.count}")
        logger.info(f"   - Unique reviewers: {len(metrics.reviews.authors)}")
        logger.info(f"   - Issues (open/closed): {metrics.issues.open}/{metrics.issues.closed}")
        logger.info(f"   - Unique issue participants: {len(metrics.issues.participants)}") 