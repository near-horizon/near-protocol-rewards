"""
Data collectors package.

This package provides collectors for gathering GitHub repository metrics
including commits, pull requests, reviews, and issues.
"""

from .commit import CommitCollector
from .pull_request import PullRequestCollector
from .review import ReviewCollector
from .issue import IssueCollector

__all__ = [
    'CommitCollector',
    'PullRequestCollector',
    'ReviewCollector',
    'IssueCollector'
]

__version__ = '1.0.0' 