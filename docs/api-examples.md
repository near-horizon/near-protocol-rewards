# API Examples

## Status Endpoint
```typescript
GET /metrics/:projectId/status

// Response
{
  "projectId": "example-project",
  "lastCollection": {
    "timestamp": 1709084800000,
    "success": true
  },
  "isHealthy": true,
  "collectionErrors": [],
  "nextCollection": 1709088400000  // 1 hour later
}
```

## Validation Results
```typescript
GET /metrics/:projectId/validation

// Response
{
  "metrics": {
    "github": {
      "commits": {
        "count": 25,
        "frequency": 3.5,
        "authors": ["dev1", "dev2"]
      },
      // ... other metrics
    },
    "near": {
      "transactions": {
        "count": 150,
        "volume": "5000",
        "uniqueUsers": ["user1.near", "user2.near"]
      },
      // ... other metrics
    }
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "timestamp": 1709084800000
  }
}
```

## Rewards Calculation
```typescript
GET /metrics/:projectId/rewards

// Response
{
  "projectId": "example-project",
  "timestamp": 1709084800000,
  "score": {
    "total": 85,
    "breakdown": {
      "github": 80,
      "near": 90
    }
  },
  "reward": {
    "usdAmount": 850.00,
    "nearAmount": 85.00,
    "calculatedAt": 1709084800000
  }
}
```