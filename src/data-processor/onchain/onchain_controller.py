"""
On-chain data collection controller.

This module orchestrates the collection of NEAR blockchain metrics from specific accounts,
coordinating API calls and data processing to generate comprehensive on-chain analytics.
"""

import os
import logging
from typing import Optional
from datetime import datetime, timedelta
from calendar import monthrange
from pathlib import Path

from models import OnchainMetrics, DateRange, AccountInfo
from nearblocks_api_client import NearBlocksApiClient
from data_validator import OnchainDataValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OnchainController:
    """Main controller for orchestrating on-chain data collection."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the on-chain data collection controller.
        
        Args:
            api_key: NearBlocks API key for authenticated requests
        """
        try:
            # Use provided API key or get from environment
            self.api_key = api_key or os.getenv("NEARBLOCKS_API_KEY")
            
            if not self.api_key:
                logger.warning("No NearBlocks API key provided - using public API with rate limits")
            
            # Use 400 calls per minute if you have a paid plan, otherwise 60 for free tier
            max_calls = 400 if self.api_key else 60
            self.api_client = NearBlocksApiClient(self.api_key, max_calls_per_minute=max_calls)
            self.data_validator = OnchainDataValidator()
            
            logger.info("OnchainController initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OnchainController: {str(e)}")
            raise
    
    def collectAccountData(
        self, 
        account_id: str, 
        year: int, 
        month: int
    ) -> OnchainMetrics:
        """
        Collect on-chain data for a specific NEAR account for a given month.
        
        Args:
            account_id: NEAR account ID to analyze
            year: Year for data collection
            month: Month for data collection (1-12)
            
        Returns:
            OnchainMetrics with calculated metrics
        """
        logger.info(f"Starting on-chain data collection for account: {account_id}")
        logger.info(f"Collection period: {year}-{month:02d}")
        
        # Validate account
        account = AccountInfo(account_id=account_id)
        if not account.is_valid():
            logger.warning(f"Invalid account ID format: {account_id}")
        
        # Create date range for the specified month
        date_range = self._createMonthDateRange(year, month)
        
        try:
            # Check if account exists
            if not self.api_client.checkAccountExists(account_id):
                logger.warning(f"Account {account_id} not found or not accessible")
                return self._createEmptyMetrics(account_id, date_range)
            
            # Collect data from both endpoints
            metrics = self._collectAccountMetrics(account_id, date_range)
            
            logger.info("On-chain data collection completed successfully")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting data for {account_id}: {str(e)}")
            return self._createEmptyMetrics(account_id, date_range)
    
    def collectAccountDataByDateRange(
        self, 
        account_id: str, 
        start_date: datetime,
        end_date: datetime
    ) -> OnchainMetrics:
        """
        Collect on-chain data for a specific NEAR account within a custom date range.
        
        Args:
            account_id: NEAR account ID to analyze
            start_date: Start date for data collection
            end_date: End date for data collection
            
        Returns:
            OnchainMetrics with calculated metrics
        """
        logger.info(f"Starting on-chain data collection for account: {account_id}")
        logger.info(f"Collection period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Validate account
        account = AccountInfo(account_id=account_id)
        if not account.is_valid():
            logger.warning(f"Invalid account ID format: {account_id}")
        
        # Create date range
        date_range = DateRange(start_date=start_date, end_date=end_date)
        
        try:
            # Check if account exists
            if not self.api_client.checkAccountExists(account_id):
                logger.warning(f"Account {account_id} not found or not accessible")
                return self._createEmptyMetrics(account_id, date_range)
            
            # Collect data from both endpoints
            metrics = self._collectAccountMetrics(account_id, date_range)
            
            logger.info("On-chain data collection completed successfully")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting data for {account_id}: {str(e)}")
            return self._createEmptyMetrics(account_id, date_range)
    
    def _collectAccountMetrics(
        self, 
        account_id: str, 
        date_range: DateRange
    ) -> OnchainMetrics:
        """
        Collect and process metrics for a single account.
        
        Args:
            account_id: NEAR account ID
            date_range: Date range for data collection
            
        Returns:
            OnchainMetrics with processed data
        """
        logger.info(f"Collecting metrics for account: {account_id}")
        
        # Convert date range to timestamps
        start_timestamp, end_timestamp = date_range.to_timestamp_nanoseconds()
        
        # Fetch transaction data
        logger.info("Fetching transaction data...")
        transactions = self.api_client.fetchTransactionData(
            account_id=account_id,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp
        )
        
        # Fetch receipt data
        logger.info("Fetching receipt data...")
        receipts = self.api_client.fetchReceiptData(
            account_id=account_id,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp
        )
        
        # Calculate metrics using the validator
        logger.info("Processing and calculating metrics...")
        metrics = self.data_validator.calculateMetrics(
            account_id=account_id,
            transactions=transactions,
            receipts=receipts,
            date_range=date_range
        )
        
        self._logAccountMetrics(metrics)
        return metrics
    
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
    
    def _createEmptyMetrics(
        self, 
        account_id: str, 
        date_range: DateRange
    ) -> OnchainMetrics:
        """
        Create empty metrics for failed collections.
        
        Args:
            account_id: NEAR account ID
            date_range: Date range for the collection period
            
        Returns:
            OnchainMetrics with zero values
        """
        from models import TransactionVolumeMetrics, SmartContractMetrics, UniqueWalletMetrics
        
        return OnchainMetrics(
            account_id=account_id,
            transaction_volume=TransactionVolumeMetrics(
                total_volume_near=0.0,
                total_volume_usdc=0.0,
                transaction_count=0
            ),
            smart_contracts=SmartContractMetrics(
                unique_contract_calls=0,
                total_function_calls=0,
                unique_methods=[]
            ),
            unique_wallets=UniqueWalletMetrics(
                unique_wallets=0,
                wallet_addresses=[]
            ),
            collection_date=datetime.now(),
            period_start=date_range.start_date,
            period_end=date_range.end_date
        )
    
    def _logAccountMetrics(self, metrics: OnchainMetrics) -> None:
        """
        Log account metrics summary.
        
        Args:
            metrics: OnchainMetrics to log
        """
        logger.info(f"📊 Final metrics for {metrics.account_id}:")
        logger.info(f"   📅 Period: {metrics.period_start.strftime('%Y-%m-%d')} to {metrics.period_end.strftime('%Y-%m-%d')}")
        logger.info(f"   💰 Transaction Volume:")
        logger.info(f"      - NEAR: {metrics.transaction_volume.total_volume_near:.6f}")
        logger.info(f"      - USDC: {metrics.transaction_volume.total_volume_usdc:.6f}")
        logger.info(f"      - Total transactions: {metrics.transaction_volume.transaction_count}")
        logger.info(f"   🔧 Smart Contracts:")
        logger.info(f"      - Unique contract calls: {metrics.smart_contracts.unique_contract_calls}")
        logger.info(f"      - Total function calls: {metrics.smart_contracts.total_function_calls}")
        logger.info(f"      - Unique methods: {len(metrics.smart_contracts.unique_methods)}")
        logger.info(f"   👥 Unique Wallets: {metrics.unique_wallets.unique_wallets}")
    
    def validateDataStructure(self, account_id: str) -> bool:
        """
        Validate data structure by making a test request to NearBlocks API.
        
        Args:
            account_id: NEAR account ID to test with
            
        Returns:
            True if data structure is valid and accessible, False otherwise
        """
        logger.info(f"Validating data structure for account: {account_id}")
        
        try:
            # Check if account exists
            if not self.api_client.checkAccountExists(account_id):
                logger.warning(f"Test account {account_id} not found")
                return False
            
            # Try to fetch a small amount of recent data
            end_timestamp = int(datetime.now().timestamp() * 1e9)
            start_timestamp = end_timestamp - (7 * 24 * 60 * 60 * 1e9)  # 7 days ago
            
            # Test transaction endpoint
            transactions = self.api_client.fetchTransactionData(
                account_id=account_id,
                start_timestamp=start_timestamp,
                end_timestamp=end_timestamp,
                limit=10  # Small limit for testing
            )
            
            # Test receipt endpoint
            receipts = self.api_client.fetchReceiptData(
                account_id=account_id,
                start_timestamp=start_timestamp,
                end_timestamp=end_timestamp,
                limit=10  # Small limit for testing
            )
            
            logger.info(f"Data structure validation successful:")
            logger.info(f"   - Found {len(transactions)} transactions")
            logger.info(f"   - Found {len(receipts)} receipts")
            logger.info(f"   - API endpoints are accessible and returning expected data")
            
            return True
            
        except Exception as e:
            logger.error(f"Data structure validation failed: {str(e)}")
            return False 