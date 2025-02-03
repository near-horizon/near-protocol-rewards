# API Documentation

## Overview

The Orc-Agent provides a webhook-based API for automated documentation generation from GitHub pull requests.

## Authentication

All requests must include appropriate authentication:

1. **GitHub Webhook**: Include the webhook secret in the `X-Hub-Signature-256` header
2. **API Endpoints**: Include a bearer token in the `Authorization` header

## Endpoints

### Webhook

#### POST /webhook/github

Handles GitHub webhook events for pull request merges.

**Headers:**
```
Content-Type: application/json
X-GitHub-Event: pull_request
X-Hub-Signature-256: sha256=...
```

**Request Body:**
```json
{
  "action": "closed",
  "pull_request": {
    "number": 123,
    "title": "Add new feature",
    "body": "Feature description",
    "merged": true,
    "base": {
      "ref": "main"
    }
  }
}
```

**Response:**
```json
{
  "message": "Event processed successfully"
}
```

**Error Responses:**
```json
{
  "detail": "Invalid webhook signature"
}
```
```json
{
  "detail": "Unsupported event type"
}
```

### Health Checks

#### GET /health

Check application health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-02-02T12:00:00Z"
}
```

#### GET /health/redis

Check Redis connection status.

**Response:**
```json
{
  "status": "connected",
  "latency_ms": 1.2
}
```

#### GET /health/github

Check GitHub API status.

**Response:**
```json
{
  "status": "operational",
  "rate_limit": {
    "remaining": 4998,
    "reset_at": "2024-02-02T13:00:00Z"
  }
}
```

### Metrics

#### GET /metrics

Get application metrics in Prometheus format.

**Response:**
```text
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",endpoint="/webhook/github"} 100

# HELP event_processing_duration_seconds Event processing duration
# TYPE event_processing_duration_seconds histogram
event_processing_duration_seconds_bucket{le="0.1"} 45
event_processing_duration_seconds_bucket{le="0.5"} 95
event_processing_duration_seconds_bucket{le="1.0"} 99
event_processing_duration_seconds_bucket{le="+Inf"} 100

# HELP queue_size Current number of events in queue
# TYPE queue_size gauge
queue_size 5
```

## Event Types

### Pull Request Event

```json
{
  "id": "event-123",
  "data": {
    "pull_request": {
      "number": 123,
      "title": "Add new feature",
      "description": "Feature description",
      "base_branch": "main"
    },
    "changes": {
      "added_files": ["src/feature.py"],
      "modified_files": ["src/existing.py"],
      "removed_files": []
    },
    "tasks": ["generate_docs", "create_tutorial"]
  }
}
```

## Documentation Types

### API Documentation

```json
{
  "type": "api",
  "files": ["docs/api.md"],
  "content": "# API Documentation\n..."
}
```

### Tutorial

```json
{
  "type": "tutorial",
  "file": "docs/tutorial.md",
  "content": "# Tutorial\n..."
}
```

### Configuration Guide

```json
{
  "type": "config",
  "files": ["docs/config.md"],
  "content": "# Configuration Guide\n..."
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SIGNATURE` | Invalid webhook signature |
| `INVALID_EVENT` | Unsupported event type |
| `QUEUE_FULL` | Event queue is full |
| `PROCESSING_ERROR` | Error during event processing |
| `GITHUB_ERROR` | GitHub API error |
| `REDIS_ERROR` | Redis connection error |

## Rate Limiting

- Webhook endpoint: 100 requests per minute
- Health check endpoints: 1000 requests per minute
- Metrics endpoint: 100 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1706880000
```

## Versioning

The API follows semantic versioning. The current version is included in all responses:

```
X-API-Version: 1.0.0
```

## Best Practices

1. **Webhook Security**
   - Validate webhook signatures
   - Use HTTPS endpoints
   - Rotate webhook secrets regularly

2. **Error Handling**
   - Implement exponential backoff
   - Handle rate limiting gracefully
   - Log detailed error information

3. **Performance**
   - Keep webhook processing under 10 seconds
   - Use conditional requests to GitHub API
   - Implement request caching where appropriate
