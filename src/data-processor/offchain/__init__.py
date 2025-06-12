"""
Off-chain data collection package.

This package provides tools for collecting GitHub repository metrics
including commits, pull requests, reviews, and issues.
"""

from .offchain_controller import OffchainController
from .models import (
    RepositoryMetrics,
    CombinedMetrics,
    CommitMetrics,
    PullRequestMetrics,
    ReviewMetrics,
    IssueMetrics,
    RepositoryInfo,
    DateRange
)

__all__ = [
    'OffchainController',
    'RepositoryMetrics',
    'CombinedMetrics',
    'CommitMetrics',
    'PullRequestMetrics',
    'ReviewMetrics',
    'IssueMetrics',
    'RepositoryInfo',
    'DateRange'
]

__version__ = '1.0.0' 