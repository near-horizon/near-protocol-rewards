# API Examples

## Get Latest Metrics

```typescript
GET /metrics/:projectId

// Response
{
  "success": true,
  "data": {
    "metrics": {
      "timestamp": 1709084800000,
      "github": {
        "commits": {
          "count": 25,
          "frequency": 3.5,
          "authors": ["dev1", "dev2"]
        },
        "pullRequests": {
          "open": 5,
          "merged": 15,
          "authors": ["dev1", "dev2"]
        },
        "issues": {
          "open": 3,
          "closed": 12,
          "participants": ["dev1", "dev2", "dev3"]
        }
      },
      "near": {
        "transactions": {
          "count": 150,
          "volume": "5000",
          "uniqueUsers": ["user1.near", "user2.near"]
        },
        "contract": {
          "calls": 75,
          "uniqueCallers": ["user1.near"]
        }
      },
      "score": {
        "total": 85,
        "breakdown": {
          "github": 80,
          "near": 90
        }
      },
      "validation": {
        "isValid": true,
        "errors": [],
        "warnings": [],
        "timestamp": 1709084800000
      }
    }
  }
}
```

## Get Project Status

```typescript
GET /projects/:projectId/status

// Response
{
  "success": true,
  "data": {
    "projectId": "example-project",
    "status": {
      "isActive": true,
      "lastSync": 1709084800000,
      "hasErrors": false
    }
  }
}
```

## Error Responses

```typescript
// Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No metrics found"
  }
}

// Internal Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```
