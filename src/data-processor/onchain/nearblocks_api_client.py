"""
NearBlocks API client for on-chain data collection.

This module provides a client interface for interacting with the NearBlocks API
to fetch transaction data from the NEAR blockchain.
"""

import requests
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from collections import deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter implementation for API calls."""
    
    def __init__(self, max_calls_per_minute: int = 400):
        """
        Initialize rate limiter.
        
        Args:
            max_calls_per_minute: Maximum number of API calls allowed per minute
        """
        self.max_calls_per_minute = max_calls_per_minute
        self.call_times = deque()
        self.current_minute_calls = 0
        self.last_reset_time = time.time()
        
        # Buffer for safety - use 90% of the limit to avoid hitting the exact limit
        self.safe_max_calls = int(self.max_calls_per_minute * 0.9)
        
        logger.info(f"Rate limiter initialized: {self.safe_max_calls}/{self.max_calls_per_minute} calls per minute")
    
    def can_make_request(self) -> bool:
        """
        Check if a request can be made without exceeding rate limits.
        
        Returns:
            True if request can be made, False otherwise
        """
        now = time.time()
        
        # Remove calls older than 1 minute
        while self.call_times and now - self.call_times[0] > 60:
            self.call_times.popleft()
        
        return len(self.call_times) < self.safe_max_calls
    
    def record_request(self):
        """Record that a request was made."""
        now = time.time()
        self.call_times.append(now)
        
        # Log current usage
        if len(self.call_times) % 50 == 0:  # Log every 50 requests
            logger.info(f"Rate limiter status: {len(self.call_times)}/{self.safe_max_calls} calls in current window")
    
    def wait_if_needed(self):
        """Wait if necessary to respect rate limits."""
        if not self.can_make_request():
            # Calculate wait time based on oldest request in the window
            if self.call_times:
                oldest_call = self.call_times[0]
                wait_time = 60 - (time.time() - oldest_call) + 1  # +1 second buffer
                
                if wait_time > 0:
                    logger.warning(f"Rate limit approaching. Waiting {wait_time:.1f} seconds...")
                    time.sleep(wait_time)
                    
                    # Clean up old calls after waiting
                    now = time.time()
                    while self.call_times and now - self.call_times[0] > 60:
                        self.call_times.popleft()


class NearBlocksApiClient:
    """Client for interacting with NearBlocks API."""
    
    BASE_URL = "https://api.nearblocks.io/v1"
    
    def __init__(self, api_key: Optional[str] = None, max_calls_per_minute: int = 400):
        """
        Initialize the NearBlocks API client.
        
        Args:
            api_key: Optional API key for authenticated requests
            max_calls_per_minute: Maximum API calls per minute (default: 400)
        """
        self.api_key = api_key
        self.session = requests.Session()
        self.rate_limiter = RateLimiter(max_calls_per_minute)
        
        # Set default headers
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'NEAR-Protocol-Rewards/1.0'
        })
        
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}'
            })
            logger.info("NearBlocks API client initialized with authentication")
        else:
            logger.info("NearBlocks API client initialized without authentication")
    
    def _make_request(self, url: str, params: Dict[str, Any] = None) -> requests.Response:
        """
        Make a rate-limited request to the API.
        
        Args:
            url: The URL to request
            params: Query parameters
            
        Returns:
            Response object
        """
        # Wait if needed to respect rate limits
        self.rate_limiter.wait_if_needed()
        
        # Make the request
        response = self.session.get(url, params=params)
        
        # Record the request
        self.rate_limiter.record_request()
        
        return response
    
    def fetchTransactionData(
        self, 
        account_id: str, 
        start_timestamp: int, 
        end_timestamp: int,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch transaction data for a specific account within a time range.
        
        Args:
            account_id: NEAR account ID
            start_timestamp: Start timestamp in nanoseconds
            end_timestamp: End timestamp in nanoseconds
            limit: Number of transactions per page
            
        Returns:
            List of transaction dictionaries
            
        Raises:
            Exception: If API request fails or rate limit is exceeded
        """
        logger.info(f"Fetching transaction data for account: {account_id}")
        logger.info(f"Time range: {datetime.fromtimestamp(start_timestamp/1e9)} to {datetime.fromtimestamp(end_timestamp/1e9)}")
        
        all_transactions = []
        page = 1
        
        while True:
            endpoint = f"/account/{account_id}/txns-only"
            url = f"{self.BASE_URL}{endpoint}"
            
            params = {
                'page': page,
                'per_page': limit,
                'from_timestamp': start_timestamp,
                'to_timestamp': end_timestamp
            }
            
            logger.info(f"Requesting page {page} from: {url}")
            
            try:
                response = self._make_request(url, params)
                
                if response.status_code == 404:
                    logger.warning(f"Account not found: {account_id}")
                    break
                
                if response.status_code == 429:
                    logger.error("NearBlocks API rate limit exceeded")
                    # Wait longer and try to recover
                    logger.info("Waiting 65 seconds for rate limit reset...")
                    time.sleep(65)
                    continue  # Retry the same request
                
                if response.status_code == 403:
                    logger.error("NearBlocks API access forbidden - check API key")
                    raise Exception("API access forbidden - invalid or missing API key")
                
                if response.status_code != 200:
                    error_message = f"API Error {response.status_code}: {response.text}"
                    logger.error(error_message)
                    raise Exception(error_message)
                
                data = response.json()
                transactions = data.get('txns', [])
                
                logger.info(f"Found {len(transactions)} transactions on page {page}")
                
                if not transactions:
                    break
                
                all_transactions.extend(transactions)
                
                # Check if we have more pages
                if len(transactions) < limit:
                    break
                
                page += 1
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error while fetching transactions: {str(e)}")
                raise Exception(f"Network error: {str(e)}")
        
        logger.info(f"Total transactions collected: {len(all_transactions)}")
        return all_transactions
    
    def fetchReceiptData(
        self, 
        account_id: str, 
        start_timestamp: int, 
        end_timestamp: int,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch receipt data for a specific account within a time range.
        
        Args:
            account_id: NEAR account ID
            start_timestamp: Start timestamp in nanoseconds
            end_timestamp: End timestamp in nanoseconds
            limit: Number of receipts per page
            
        Returns:
            List of receipt dictionaries
            
        Raises:
            Exception: If API request fails or rate limit is exceeded
        """
        logger.info(f"Fetching receipt data for account: {account_id}")
        
        all_receipts = []
        page = 1
        
        while True:
            endpoint = f"/account/{account_id}/receipts"
            url = f"{self.BASE_URL}{endpoint}"
            
            params = {
                'page': page,
                'per_page': limit,
                'from_timestamp': start_timestamp,
                'to_timestamp': end_timestamp
            }
            
            logger.info(f"Requesting receipts page {page} from: {url}")
            
            try:
                response = self._make_request(url, params)
                
                if response.status_code == 404:
                    logger.warning(f"Account not found: {account_id}")
                    break
                
                if response.status_code == 429:
                    logger.error("NearBlocks API rate limit exceeded")
                    # Wait longer and try to recover
                    logger.info("Waiting 65 seconds for rate limit reset...")
                    time.sleep(65)
                    continue  # Retry the same request
                
                if response.status_code == 403:
                    logger.error("NearBlocks API access forbidden - check API key")
                    raise Exception("API access forbidden - invalid or missing API key")
                
                if response.status_code != 200:
                    error_message = f"API Error {response.status_code}: {response.text}"
                    logger.error(error_message)
                    raise Exception(error_message)
                
                data = response.json()
                receipts = data.get('txns', [])  # NearBlocks uses 'txns' for receipts too
                
                logger.info(f"Found {len(receipts)} receipts on page {page}")
                
                if not receipts:
                    break
                
                all_receipts.extend(receipts)
                
                # Check if we have more pages
                if len(receipts) < limit:
                    break
                
                page += 1
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error while fetching receipts: {str(e)}")
                raise Exception(f"Network error: {str(e)}")
        
        logger.info(f"Total receipts collected: {len(all_receipts)}")
        return all_receipts
    
    def checkAccountExists(self, account_id: str) -> bool:
        """
        Check if a NEAR account exists.
        
        Args:
            account_id: NEAR account ID to check
            
        Returns:
            True if account exists, False otherwise
        """
        logger.info(f"Checking if account exists: {account_id}")
        
        endpoint = f"/account/{account_id}"
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            response = self._make_request(url)
            exists = response.status_code == 200
            
            if exists:
                logger.info(f"Account {account_id} exists")
            else:
                logger.info(f"Account {account_id} does not exist or is not accessible")
            
            return exists
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error checking account existence: {str(e)}")
            return False 