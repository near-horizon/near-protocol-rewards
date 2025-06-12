"""
Off-chain data collection controller.

This module orchestrates the collection of GitHub metrics from multiple repositories,
coordinating all collectors and combining the results into a unified dataset.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from calendar import monthrange

from models import (
    RepositoryInfo, DateRange, RepositoryMetrics, CombinedMetrics
)
from github_api_client import GitHubApiClient
from .collector import CommitCollector, PullRequestCollector, ReviewCollector, IssueCollector
from data_combiner import DataCombiner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OffchainController:
    """Main controller for orchestrating off-chain data collection."""
    
    def __init__(self, github_token: Optional[str] = None):
        """
        Initialize the off-chain data collection controller.
        
        Args:
            github_token: GitHub personal access token
        """
        try:
            self.api_client = GitHubApiClient(github_token)
            self.commit_collector = CommitCollector(self.api_client)
            self.pr_collector = PullRequestCollector(self.api_client)
            self.review_collector = ReviewCollector(self.api_client)
            self.issue_collector = IssueCollector(self.api_client)
            self.data_combiner = DataCombiner()
            
            logger.info("OffchainController initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OffchainController: {str(e)}")
            raise
    
    def collectRepositoryData(
        self, 
        repository_names: List[str], 
        year: int, 
        month: int
    ) -> CombinedMetrics:
        """
        Collect data from multiple repositories for a specific month.
        
        Args:
            repository_names: List of repository names in format "owner/repo"
            year: Year for data collection
            month: Month for data collection (1-12)
            
        Returns:
            CombinedMetrics with aggregated data from all repositories
        """
        logger.info(f"Starting data collection for {len(repository_names)} repositories")
        logger.info(f"Collection period: {year}-{month:02d}")
        
        # Create date range for the specified month
        date_range = self._createMonthDateRange(year, month)
        
        # Collect data from each repository
        repositories_metrics = []
        successful_collections = 0
        
        for repo_name in repository_names:
            try:
                repo_metrics = self._collectSingleRepositoryData(repo_name, date_range)
                repositories_metrics.append(repo_metrics)
                successful_collections += 1
                
            except Exception as e:
                logger.error(f"Failed to collect data for {repo_name}: {str(e)}")
                # Continue with other repositories
                continue
        
        logger.info(f"Successfully collected data from {successful_collections}/{len(repository_names)} repositories")
        
        # Combine all repository metrics
        combined_metrics = self.data_combiner.combineRepositoryMetrics(repositories_metrics)
        
        logger.info("Data collection completed successfully")
        return combined_metrics
    
    def collectSingleRepositoryData(
        self, 
        repository_name: str, 
        year: int, 
        month: int
    ) -> RepositoryMetrics:
        """
        Collect data from a single repository for a specific month.
        
        Args:
            repository_name: Repository name in format "owner/repo"
            year: Year for data collection
            month: Month for data collection (1-12)
            
        Returns:
            RepositoryMetrics with collected data
        """
        logger.info(f"Collecting data for single repository: {repository_name}")
        
        date_range = self._createMonthDateRange(year, month)
        return self._collectSingleRepositoryData(repository_name, date_range)
    
    def _collectSingleRepositoryData(
        self, 
        repository_name: str, 
        date_range: DateRange
    ) -> RepositoryMetrics:
        """
        Collect all metrics for a single repository.
        
        Args:
            repository_name: Repository name in format "owner/repo"
            date_range: Date range for data collection
            
        Returns:
            RepositoryMetrics with all collected data
        """
        repository = RepositoryInfo.from_full_name(repository_name)
        
        # Check if repository exists
        if not self.api_client.checkRepositoryExists(repository.owner, repository.name):
            logger.warning(f"Repository {repository_name} not found or not accessible")
            return self._createEmptyRepositoryMetrics(repository_name)
        
        logger.info(f"Collecting metrics for {repository_name}")
        
        try:
            # Collect all types of metrics
            commit_metrics = self.commit_collector.collectCommitData(repository, date_range)
            pr_metrics = self.pr_collector.collectPullRequestData(repository, date_range)
            review_metrics = self.review_collector.collectReviewData(repository, date_range)
            issue_metrics = self.issue_collector.collectIssueData(repository, date_range)
            
            repository_metrics = RepositoryMetrics(
                repository_name=repository_name,
                commits=commit_metrics,
                pull_requests=pr_metrics,
                reviews=review_metrics,
                issues=issue_metrics,
                collection_date=datetime.now()
            )
            
            self._logRepositoryMetrics(repository_metrics)
            return repository_metrics
            
        except Exception as e:
            logger.error(f"Error collecting metrics for {repository_name}: {str(e)}")
            return self._createEmptyRepositoryMetrics(repository_name)
    
    def _createMonthDateRange(self, year: int, month: int) -> DateRange:
        """
        Create a date range for a specific month.
        
        Args:
            year: Year
            month: Month (1-12)
            
        Returns:
            DateRange for the specified month
        """
        start_date = datetime(year, month, 1)
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day, 23, 59, 59)
        
        return DateRange(start_date=start_date, end_date=end_date)
    
    def _createEmptyRepositoryMetrics(self, repository_name: str) -> RepositoryMetrics:
        """
        Create empty repository metrics for failed collections.
        
        Args:
            repository_name: Name of the repository
            
        Returns:
            RepositoryMetrics with zero values
        """
        from models import CommitMetrics, PullRequestMetrics, ReviewMetrics, IssueMetrics
        
        return RepositoryMetrics(
            repository_name=repository_name,
            commits=CommitMetrics(count=0, authors=[]),
            pull_requests=PullRequestMetrics(open=0, merged=0, closed=0, authors=[]),
            reviews=ReviewMetrics(count=0, authors=[]),
            issues=IssueMetrics(open=0, closed=0, participants=[]),
            collection_date=datetime.now()
        )
    
    def _logRepositoryMetrics(self, metrics: RepositoryMetrics) -> None:
        """
        Log repository metrics summary.
        
        Args:
            metrics: Repository metrics to log
        """
        logger.info(f"📊 Metrics for {metrics.repository_name}:")
        logger.info(f"   - Commits: {metrics.commits.count}")
        logger.info(f"   - PRs (open/merged/closed): {metrics.pull_requests.open}/{metrics.pull_requests.merged}/{metrics.pull_requests.closed}")
        logger.info(f"   - Reviews: {metrics.reviews.count}")
        logger.info(f"   - Issues (open/closed): {metrics.issues.open}/{metrics.issues.closed}") 