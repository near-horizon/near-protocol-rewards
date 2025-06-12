# Off-chain Data Collection System

A clean, modular system for collecting GitHub repository metrics following Clean Code principles and single responsibility design patterns.

## Overview

This system collects off-chain data from GitHub repositories including:
- **Commits**: Count and author information
- **Pull Requests**: Open, merged, and closed PRs with authors
- **Code Reviews**: Review count and reviewer information  
- **Issues**: Open and closed issues with participants

## Architecture

The system follows Clean Code principles with clear separation of concerns:

```
offchain/
├── models.py                 # Data models and structures
├── github_api_client.py      # GitHub API communication
├── commit_collector.py       # Commit data collection
├── pull_request_collector.py # Pull request data collection
├── review_collector.py       # Code review data collection
├── issue_collector.py        # Issue data collection
├── data_combiner.py          # Data aggregation service
├── offchain_controller.py    # Main orchestration controller
├── example_usage.py          # Usage examples
└── requirements.txt          # Dependencies
```

## Key Features

- **Single Responsibility**: Each module has one clear purpose
- **Clean Code**: CamelCase functions, comprehensive logging, English documentation
- **Error Handling**: Robust error handling with graceful degradation
- **Rate Limiting**: Built-in GitHub API rate limiting protection
- **Modular Design**: Easy to extend and maintain
- **Type Safety**: Full type hints throughout the codebase

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up GitHub token:
```bash
export GITHUB_TOKEN=your_github_personal_access_token
```

## Usage

### Basic Usage

```python
from offchain_controller import OffchainController

# Initialize controller
controller = OffchainController()

# Collect data from multiple repositories
repositories = ["near/nearcore", "near/near-cli"]
combined_metrics = controller.collectRepositoryData(repositories, 2024, 11)

# Collect data from single repository
repo_metrics = controller.collectSingleRepositoryData("near/nearcore", 2024, 11)
```

### Advanced Usage

```python
from models import RepositoryInfo, DateRange
from datetime import datetime

# Custom date range
date_range = DateRange(
    start_date=datetime(2024, 11, 1),
    end_date=datetime(2024, 11, 30, 23, 59, 59)
)

# Direct collector usage
from github_api_client import GitHubApiClient
from commit_collector import CommitCollector

api_client = GitHubApiClient()
commit_collector = CommitCollector(api_client)

repository = RepositoryInfo.from_full_name("near/nearcore")
commit_metrics = commit_collector.collectCommitData(repository, date_range)
```

## Data Models

### RepositoryMetrics
Complete metrics for a single repository:
- `repository_name`: Repository name
- `commits`: Commit metrics
- `pull_requests`: PR metrics  
- `reviews`: Review metrics
- `issues`: Issue metrics
- `collection_date`: When data was collected

### CombinedMetrics
Aggregated metrics from multiple repositories:
- All the same fields as RepositoryMetrics
- `repositories_count`: Number of repositories processed

## Error Handling

The system includes comprehensive error handling:
- **Repository not found**: Returns empty metrics, continues processing
- **API rate limits**: Automatic detection and graceful failure
- **Network errors**: Logged and handled gracefully
- **Authentication errors**: Clear error messages

## Logging

Comprehensive logging throughout the system:
- **INFO**: Progress updates and metrics summaries
- **WARNING**: Non-critical issues (e.g., repository not found)
- **ERROR**: Critical errors that prevent data collection

## Performance Considerations

- **Pagination**: Automatic handling of GitHub API pagination
- **Rate Limiting**: Built-in delays to respect API limits
- **Parallel Processing**: Collectors can be run independently
- **Memory Efficient**: Streaming data processing where possible

## Extending the System

To add new data collection capabilities:

1. Create a new collector class following the existing pattern
2. Add corresponding data models in `models.py`
3. Update the controller to use the new collector
4. Add the new metrics to the combiner

Example:
```python
class NewMetricCollector:
    def __init__(self, api_client: GitHubApiClient):
        self.api_client = api_client
    
    def collectNewMetricData(self, repository: RepositoryInfo, date_range: DateRange) -> NewMetrics:
        # Implementation here
        pass
```

## Testing

Run the example script to test the system:
```bash
python example_usage.py
```

## Dependencies

- `requests`: HTTP client for GitHub API
- `python-dateutil`: Date handling utilities

## Contributing

When contributing to this system:
1. Follow Clean Code principles
2. Use CamelCase for function names
3. Add comprehensive logging
4. Include type hints
5. Write English documentation and comments
6. Maintain single responsibility per class/function 