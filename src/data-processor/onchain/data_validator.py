"""
Data validator for on-chain NEAR metrics calculation.

This module processes raw transaction data from NearBlocks API and calculates
transaction volume, smart contract interactions, and unique wallet metrics.
"""

import logging
from typing import Dict, Any, List, Set
from datetime import datetime

from models import (
    OnchainMetrics, TransactionVolumeMetrics, SmartContractMetrics, 
    UniqueWalletMetrics, DateRange
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OnchainDataValidator:
    """Validator for processing and calculating on-chain metrics."""
    
    # NEAR token conversion constants
    YOCTO_NEAR_TO_NEAR = 1e24  # 1 NEAR = 10^24 yoctoNEAR
    USDC_DECIMALS = 6  # USDC typically has 6 decimal places
    
    # Known USDC contract addresses on NEAR
    USDC_CONTRACT_ADDRESSES = [
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        "usdc.fakes.testnet"  # Testnet USDC for testing
    ]
    
    def __init__(self):
        """Initialize the data validator."""
        logger.info("OnchainDataValidator initialized")
    
    def calculateMetrics(
        self, 
        account_id: str,
        transactions: List[Dict[str, Any]], 
        receipts: List[Dict[str, Any]],
        date_range: DateRange
    ) -> OnchainMetrics:
        """
        Calculate comprehensive on-chain metrics from transaction and receipt data.
        
        Args:
            account_id: The NEAR account ID being analyzed
            transactions: List of transaction data from NearBlocks API
            receipts: List of receipt data from NearBlocks API
            date_range: Date range for the analysis period
            
        Returns:
            OnchainMetrics with calculated values
        """
        logger.info(f"Calculating on-chain metrics for account: {account_id}")
        logger.info(f"Processing {len(transactions)} transactions and {len(receipts)} receipts")
        
        # Combine transactions and receipts for comprehensive analysis
        all_data = transactions + receipts
        
        # Calculate individual metric components
        volume_metrics = self._calculateTransactionVolume(all_data, account_id)
        contract_metrics = self._calculateSmartContractMetrics(all_data, account_id)
        wallet_metrics = self._calculateUniqueWalletMetrics(all_data, account_id)
        
        # Create comprehensive metrics object
        metrics = OnchainMetrics(
            account_id=account_id,
            transaction_volume=volume_metrics,
            smart_contracts=contract_metrics,
            unique_wallets=wallet_metrics,
            collection_date=datetime.now(),
            period_start=date_range.start_date,
            period_end=date_range.end_date
        )
        
        self._logMetricsSummary(metrics)
        return metrics
    
    def _calculateTransactionVolume(
        self, 
        data: List[Dict[str, Any]], 
        account_id: str
    ) -> TransactionVolumeMetrics:
        """
        Calculate transaction volume metrics for NEAR and USDC.
        
        Args:
            data: Combined transaction and receipt data
            account_id: The account being analyzed
            
        Returns:
            TransactionVolumeMetrics with volume calculations
        """
        logger.info("Calculating transaction volume metrics")
        
        total_near_volume = 0.0
        total_usdc_volume = 0.0
        transaction_count = 0
        
        for item in data:
            try:
                # Count all transactions
                transaction_count += 1
                
                # Calculate NEAR volume from deposits and fees
                if 'actions_agg' in item and 'deposit' in item['actions_agg']:
                    deposit = float(item['actions_agg']['deposit'])
                    total_near_volume += deposit / self.YOCTO_NEAR_TO_NEAR
                
                # Check individual actions for deposits
                if 'actions' in item:
                    for action in item['actions']:
                        if 'deposit' in action and action['deposit'] is not None:
                            deposit = float(action['deposit'])
                            total_near_volume += deposit / self.YOCTO_NEAR_TO_NEAR
                        
                        # Look for USDC transfers in function call arguments
                        if (action.get('action') == 'FUNCTION_CALL' and 
                            action.get('method') in ['ft_transfer', 'withdrawUsdc']):
                            usdc_amount = self._extractUsdcAmount(action.get('args', ''))
                            if usdc_amount > 0:
                                total_usdc_volume += usdc_amount / (10 ** self.USDC_DECIMALS)
                
                # Check for USDC amounts in receipt actions
                if 'receiver_account_id' in item:
                    receiver = item['receiver_account_id']
                    if any(usdc_addr in receiver for usdc_addr in self.USDC_CONTRACT_ADDRESSES):
                        if 'actions' in item:
                            for action in item['actions']:
                                usdc_amount = self._extractUsdcAmount(action.get('args', ''))
                                if usdc_amount > 0:
                                    total_usdc_volume += usdc_amount / (10 ** self.USDC_DECIMALS)
                
            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"Error processing transaction volume data: {str(e)}")
                continue
        
        metrics = TransactionVolumeMetrics(
            total_volume_near=total_near_volume,
            total_volume_usdc=total_usdc_volume,
            transaction_count=transaction_count
        )
        
        logger.info(f"Volume metrics - NEAR: {metrics.total_volume_near:.6f}, USDC: {metrics.total_volume_usdc:.6f}")
        return metrics
    
    def _calculateSmartContractMetrics(
        self, 
        data: List[Dict[str, Any]], 
        account_id: str
    ) -> SmartContractMetrics:
        """
        Calculate smart contract interaction metrics.
        
        Args:
            data: Combined transaction and receipt data
            account_id: The account being analyzed
            
        Returns:
            SmartContractMetrics with contract interaction data
        """
        logger.info("Calculating smart contract metrics")
        
        unique_methods: Set[str] = set()
        total_function_calls = 0
        contract_interactions = 0
        
        for item in data:
            try:
                if 'actions' in item:
                    for action in item['actions']:
                        if action.get('action') == 'FUNCTION_CALL':
                            total_function_calls += 1
                            
                            method = action.get('method')
                            if method:
                                unique_methods.add(method)
                                contract_interactions += 1
                
            except (KeyError, TypeError) as e:
                logger.warning(f"Error processing smart contract data: {str(e)}")
                continue
        
        metrics = SmartContractMetrics(
            unique_contract_calls=contract_interactions,
            total_function_calls=total_function_calls,
            unique_methods=list(unique_methods)
        )
        
        logger.info(f"Contract metrics - Unique calls: {metrics.unique_contract_calls}, Total calls: {metrics.total_function_calls}")
        return metrics
    
    def _calculateUniqueWalletMetrics(
        self, 
        data: List[Dict[str, Any]], 
        account_id: str
    ) -> UniqueWalletMetrics:
        """
        Calculate unique wallet interaction metrics.
        
        Args:
            data: Combined transaction and receipt data
            account_id: The account being analyzed
            
        Returns:
            UniqueWalletMetrics with unique wallet data
        """
        logger.info("Calculating unique wallet metrics")
        
        unique_wallets: Set[str] = set()
        
        for item in data:
            try:
                # Add signer account (if different from target account)
                if 'signer_account_id' in item:
                    signer = item['signer_account_id']
                    if signer != account_id and signer:
                        unique_wallets.add(signer)
                
                # Add predecessor account (for receipts)
                if 'predecessor_account_id' in item:
                    predecessor = item['predecessor_account_id']
                    if predecessor != account_id and predecessor:
                        unique_wallets.add(predecessor)
                
                # Add receiver account (if different from target account)
                if 'receiver_account_id' in item:
                    receiver = item['receiver_account_id']
                    if receiver != account_id and receiver:
                        unique_wallets.add(receiver)
                
                # Look for wallet addresses in function call arguments
                if 'actions' in item:
                    for action in item['actions']:
                        args = action.get('args', '')
                        if args:
                            wallet_from_args = self._extractWalletFromArgs(args)
                            if wallet_from_args and wallet_from_args != account_id:
                                unique_wallets.add(wallet_from_args)
                
            except (KeyError, TypeError) as e:
                logger.warning(f"Error processing unique wallet data: {str(e)}")
                continue
        
        # Filter out contract addresses and keep only valid wallet addresses
        valid_wallets = [
            wallet for wallet in unique_wallets 
            if self._isValidWalletAddress(wallet)
        ]
        
        metrics = UniqueWalletMetrics(
            unique_wallets=len(valid_wallets),
            wallet_addresses=valid_wallets
        )
        
        logger.info(f"Unique wallet metrics - Count: {metrics.unique_wallets}")
        return metrics
    
    def _extractUsdcAmount(self, args_string: str) -> float:
        """
        Extract USDC amount from function call arguments.
        
        Args:
            args_string: JSON string containing function arguments
            
        Returns:
            USDC amount as float, 0 if not found or invalid
        """
        try:
            import json
            
            if not args_string:
                return 0.0
            
            # Try to parse JSON arguments
            if args_string.startswith('{'):
                args = json.loads(args_string)
                
                # Look for amount field
                if 'amount' in args:
                    return float(args['amount'])
            
            # Look for amount in string format
            if '"amount"' in args_string:
                import re
                match = re.search(r'"amount":\s*"(\d+)"', args_string)
                if match:
                    return float(match.group(1))
            
            return 0.0
            
        except (json.JSONDecodeError, ValueError, TypeError):
            return 0.0
    
    def _extractWalletFromArgs(self, args_string: str) -> str:
        """
        Extract wallet address from function call arguments.
        
        Args:
            args_string: JSON string containing function arguments
            
        Returns:
            Wallet address if found, empty string otherwise
        """
        try:
            import json
            
            if not args_string:
                return ""
            
            # Try to parse JSON arguments
            if args_string.startswith('{'):
                args = json.loads(args_string)
                
                # Look for common wallet field names
                for field in ['receiver_id', 'account_id', 'sender_id']:
                    if field in args and isinstance(args[field], str):
                        return args[field]
            
            return ""
            
        except (json.JSONDecodeError, TypeError):
            return ""
    
    def _isValidWalletAddress(self, address: str) -> bool:
        """
        Check if an address is a valid NEAR wallet address.
        
        Args:
            address: Address to validate
            
        Returns:
            True if valid wallet address, False otherwise
        """
        if not address or not isinstance(address, str):
            return False
        
        # Filter out known contract addresses
        if any(contract in address for contract in self.USDC_CONTRACT_ADDRESSES):
            return False
        
        # Valid NEAR addresses end with .near or are 64-character hex strings
        return address.endswith('.near') or (len(address) == 64 and address.isalnum())
    
    def _logMetricsSummary(self, metrics: OnchainMetrics) -> None:
        """
        Log a summary of calculated metrics.
        
        Args:
            metrics: OnchainMetrics to log
        """
        logger.info(f"📊 On-chain metrics summary for {metrics.account_id}:")
        logger.info(f"   💰 Transaction Volume:")
        logger.info(f"      - NEAR: {metrics.transaction_volume.total_volume_near:.6f}")
        logger.info(f"      - USDC: {metrics.transaction_volume.total_volume_usdc:.6f}")
        logger.info(f"      - Total transactions: {metrics.transaction_volume.transaction_count}")
        logger.info(f"   🔧 Smart Contracts:")
        logger.info(f"      - Unique contract calls: {metrics.smart_contracts.unique_contract_calls}")
        logger.info(f"      - Total function calls: {metrics.smart_contracts.total_function_calls}")
        logger.info(f"      - Unique methods: {len(metrics.smart_contracts.unique_methods)}")
        logger.info(f"   👥 Unique Wallets: {metrics.unique_wallets.unique_wallets}") 