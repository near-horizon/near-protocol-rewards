"""
Data models for on-chain NEAR data collection.

This module contains all data structures used for collecting and organizing
NEAR blockchain metrics including transaction volume, smart contract calls, and unique wallets.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class TransactionAction:
    """Represents a single action within a transaction."""
    action: str
    method: Optional[str] = None
    deposit: float = 0.0
    fee: float = 0.0
    args: str = ""


@dataclass
class TransactionOutcome:
    """Represents the outcome of a transaction."""
    status: bool
    gas_burnt: Optional[int] = None
    tokens_burnt: Optional[float] = None


@dataclass
class Transaction:
    """Represents a NEAR transaction with all its details."""
    id: str
    transaction_hash: str
    signer_account_id: str
    receiver_account_id: str
    block_timestamp: str
    block_height: int
    actions: List[TransactionAction]
    outcomes: TransactionOutcome
    deposit_total: float = 0.0
    transaction_fee: float = 0.0


@dataclass
class TransactionVolumeMetrics:
    """Represents transaction volume metrics for an account."""
    total_volume_near: float
    total_volume_usdc: float
    transaction_count: int


@dataclass
class SmartContractMetrics:
    """Represents smart contract interaction metrics."""
    unique_contract_calls: int
    total_function_calls: int
    unique_methods: List[str]


@dataclass
class UniqueWalletMetrics:
    """Represents unique wallet interaction metrics."""
    unique_wallets: int
    wallet_addresses: List[str]


@dataclass
class OnchainMetrics:
    """Complete on-chain metrics for a NEAR account."""
    account_id: str
    transaction_volume: TransactionVolumeMetrics
    smart_contracts: SmartContractMetrics
    unique_wallets: UniqueWalletMetrics
    collection_date: datetime
    period_start: datetime
    period_end: datetime


@dataclass
class NearBlocksApiResponse:
    """Represents a NearBlocks API response with pagination info."""
    cursor: Optional[str]
    transactions: List[Dict[str, Any]]
    has_more: bool = False


@dataclass
class DateRange:
    """Represents a date range for data collection."""
    start_date: datetime
    end_date: datetime
    
    def to_timestamp_nanoseconds(self) -> tuple[int, int]:
        """Convert dates to nanosecond timestamps for NearBlocks API."""
        return (
            int(self.start_date.timestamp() * 1e9),
            int(self.end_date.timestamp() * 1e9)
        )


@dataclass
class AccountInfo:
    """Basic NEAR account information."""
    account_id: str
    
    def is_valid(self) -> bool:
        """Check if account ID follows NEAR naming conventions."""
        return self.account_id.endswith('.near') or len(self.account_id) == 64 