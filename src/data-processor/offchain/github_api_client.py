"""
GitHub API client for making authenticated requests.

This module handles all direct communication with the GitHub API,
including authentication, pagination, and error handling.
"""

import os
import time
import logging
import requests
from typing import List, Dict, Any, Optional
from models import GitHubApiResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GitHubApiClient:
    """Client for making authenticated requests to GitHub API."""
    
    def __init__(self, token: Optional[str] = None):
        """
        Initialize GitHub API client.
        
        Args:
            token: GitHub personal access token. If None, will try to get from environment.
        """
        self.token = token or os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("GitHub token is required. Set GITHUB_TOKEN environment variable.")
        
        self.headers = {"Authorization": f"token {self.token}"}
        self.base_url = "https://api.github.com"
        self.rate_limit_delay = 0.5  # Seconds between requests
    
    def makeRequest(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Make a single authenticated request to GitHub API.
        
        Args:
            url: The API endpoint URL
            
        Returns:
            JSON response data or None if request failed
            
        Raises:
            Exception: If rate limit is exceeded or authentication fails
        """
        logger.info(f"Making request to: {url}")
        
        try:
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 404:
                logger.warning(f"Resource not found: {url}")
                return None
            
            if response.status_code == 403:
                if "API rate limit exceeded" in response.text:
                    logger.error("GitHub API rate limit exceeded")
                    raise Exception("GitHub API rate limit exceeded")
                else:
                    logger.error(f"Authentication failed: {response.text}")
                    raise Exception(f"Authentication failed: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Request failed with status {response.status_code}: {response.text}")
                return None
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Request exception: {str(e)}")
            return None
    
    def makePaginatedRequest(self, base_url: str, per_page: int = 100) -> GitHubApiResponse:
        """
        Make paginated requests to collect all data from an endpoint.
        
        Args:
            base_url: Base URL for the API endpoint
            per_page: Number of items per page (max 100)
            
        Returns:
            GitHubApiResponse with all collected data
        """
        all_data = []
        page = 1
        total_items = 0
        
        logger.info(f"Starting paginated request for: {base_url}")
        
        while True:
            # Add pagination parameters
            separator = "&" if "?" in base_url else "?"
            paginated_url = f"{base_url}{separator}page={page}&per_page={per_page}"
            
            data = self.makeRequest(paginated_url)
            
            if data is None:
                break
            
            if not data:  # Empty response
                logger.info(f"No more data found at page {page}")
                break
            
            current_items = len(data)
            logger.info(f"Found {current_items} items on page {page}")
            
            all_data.extend(data)
            total_items += current_items
            
            # If we got less than the requested amount, we've reached the end
            if current_items < per_page:
                break
            
            page += 1
            
            # Rate limiting
            time.sleep(self.rate_limit_delay)
        
        logger.info(f"Collected total of {total_items} items")
        
        return GitHubApiResponse(
            data=all_data,
            has_next_page=False,
            current_page=page - 1,
            total_items=total_items
        )
    
    def checkRepositoryExists(self, owner: str, repo: str) -> bool:
        """
        Check if a repository exists and is accessible.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            True if repository exists and is accessible, False otherwise
        """
        url = f"{self.base_url}/repos/{owner}/{repo}"
        response = self.makeRequest(url)
        return response is not None 