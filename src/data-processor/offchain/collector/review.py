"""
Code review data collector for GitHub repositories.

This module is responsible for collecting code review-related metrics
from GitHub repositories within specified date ranges.
"""

import logging
from typing import List, Dict, Any, Set
from datetime import datetime

from ..models import ReviewMetrics, RepositoryInfo, DateRange
from ..github_api_client import GitHubApiClient

logger = logging.getLogger(__name__)


class ReviewCollector:
    """Collector for code review-related data from GitHub repositories."""
    
    def __init__(self, api_client: GitHubApiClient):
        """
        Initialize review collector.
        
        Args:
            api_client: GitHub API client instance
        """
        self.api_client = api_client
    
    def collectReviewData(self, repository: RepositoryInfo, date_range: DateRange) -> ReviewMetrics:
        """
        Collect review data for a repository within a date range.
        
        Args:
            repository: Repository information
            date_range: Date range for data collection
            
        Returns:
            ReviewMetrics with collected data
        """
        logger.info(f"Collecting review data for {repository.full_name}")
        
        try:
            # First, get all pull requests
            pulls_data = self._getAllPullRequests(repository)
            
            # Then collect reviews for each PR
            total_reviews = 0
            reviewers: Set[str] = set()
            
            for pr in pulls_data:
                pr_reviews = self._getReviewsForPullRequest(repository, pr["number"])
                
                # Filter reviews by date range if needed
                filtered_reviews = self._filterReviewsByDateRange(pr_reviews, date_range)
                
                total_reviews += len(filtered_reviews)
                
                # Add reviewers to set
                for review in filtered_reviews:
                    if review.get("user") and review["user"].get("login"):
                        reviewers.add(review["user"]["login"])
            
            logger.info(f"Found {total_reviews} reviews from {len(reviewers)} unique reviewers")
            
            return ReviewMetrics(
                count=total_reviews,
                authors=list(reviewers)
            )
            
        except Exception as e:
            logger.error(f"Error collecting review data for {repository.full_name}: {str(e)}")
            return ReviewMetrics(count=0, authors=[])
    
    def _getAllPullRequests(self, repository: RepositoryInfo) -> List[Dict[str, Any]]:
        """
        Get all pull requests for a repository.
        
        Args:
            repository: Repository information
            
        Returns:
            List of pull request data
        """
        base_url = f"{self.api_client.base_url}/repos/{repository.owner}/{repository.name}"
        pulls_url = f"{base_url}/pulls?state=all"
        
        response = self.api_client.makePaginatedRequest(pulls_url)
        return response.data
    
    def _getReviewsForPullRequest(self, repository: RepositoryInfo, pr_number: int) -> List[Dict[str, Any]]:
        """
        Get all reviews for a specific pull request.
        
        Args:
            repository: Repository information
            pr_number: Pull request number
            
        Returns:
            List of review data
        """
        base_url = f"{self.api_client.base_url}/repos/{repository.owner}/{repository.name}"
        reviews_url = f"{base_url}/pulls/{pr_number}/reviews"
        
        try:
            response = self.api_client.makePaginatedRequest(reviews_url)
            return response.data
        except Exception as e:
            logger.warning(f"Error getting reviews for PR #{pr_number}: {str(e)}")
            return []
    
    def _filterReviewsByDateRange(self, reviews: List[Dict[str, Any]], date_range: DateRange) -> List[Dict[str, Any]]:
        """
        Filter reviews by date range.
        
        Args:
            reviews: List of review data
            date_range: Date range for filtering
            
        Returns:
            Filtered list of reviews
        """
        since, until = date_range.to_iso_format()
        filtered_reviews = []
        
        for review in reviews:
            submitted_at = review.get("submitted_at")
            if submitted_at and since <= submitted_at <= until:
                filtered_reviews.append(review)
        
        return filtered_reviews 