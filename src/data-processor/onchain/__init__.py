"""
On-chain data processor module for NEAR Protocol.

This module provides functionality to collect and analyze on-chain metrics
from the NEAR blockchain using the NearBlocks API.

Main components:
- OnchainController: Main orchestrator for data collection
- NearBlocksApiClient: API client for NearBlocks integration
- OnchainDataValidator: Data processor and metrics calculator
- Models: Data structures for on-chain metrics

Usage:
    from src.data_processor.onchain import OnchainController
    
    controller = OnchainController(api_key="your_api_key")
    metrics = controller.collectAccountData("aigamblingclub.near", 2024, 1)
"""

from .onchain_controller import OnchainController
from .nearblocks_api_client import NearBlocksApiClient
from .data_validator import OnchainDataValidator
from .models import (
    OnchainMetrics,
    TransactionVolumeMetrics,
    SmartContractMetrics,
    UniqueWalletMetrics,
    AccountInfo,
    DateRange
)

__version__ = "1.0.0"

__all__ = [
    "OnchainController",
    "NearBlocksApiClient", 
    "OnchainDataValidator",
    "OnchainMetrics",
    "TransactionVolumeMetrics",
    "SmartContractMetrics",
    "UniqueWalletMetrics",
    "AccountInfo",
    "DateRange"
] 