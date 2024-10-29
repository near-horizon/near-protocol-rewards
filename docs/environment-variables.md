# Environment Variables Guide

This guide details all environment variables used by the NEAR Protocol Rewards SDK.

## Required Variables

### Core Configuration

```env
# Unique project identifier
PROJECT_ID=my-project

# Your NEAR account (must end with .near or .testnet)
NEAR_ACCOUNT=your-project.near

# GitHub repository (format: owner/repo)
GITHUB_REPO=near/protocol-rewards

# GitHub personal access token (must start with 'ghp_')
GITHUB_TOKEN=ghp_your_token_here

# NEAR API Key (from NEARBlocks API)
NEAR_API_KEY=your_api_key_here
```

### Database Configuration

```env
# PostgreSQL connection details
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=near_rewards
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
```

## Optional Variables

### API Configuration

```env
# NEAR API endpoint (default: https://api.nearblocks.io/v1)
NEAR_API_URL=https://api.nearblocks.io/v1

# NEAR network ID (default: mainnet)
NEAR_NETWORK_ID=mainnet

# GitHub API URL (default: https://api.github.com)
GITHUB_API_URL=https://api.github.com
```

### Performance Settings

```env
# Metrics collection interval in milliseconds (default: 300000 - 5 minutes)
METRICS_COLLECTION_INTERVAL=300000

# Maximum API requests per second (default: 5)
MAX_REQUESTS_PER_SECOND=5

# Storage retention period in days (default: 30)
STORAGE_RETENTION_DAYS=30
```

### Logging & Debug

```env
# Log level (default: info)
LOG_LEVEL=info  # Options: debug, info, warn, error

# Enable API mocking for testing
ENABLE_API_MOCKING=false

# Skip validation in tests
SKIP_VALIDATION=false
```

## Environment-Specific Files

### Production (.env)

```env
PROJECT_ID=production-project
NEAR_ACCOUNT=myproject.near
GITHUB_REPO=myorg/myproject
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
NEAR_API_KEY=xxxxxxxxxxxxxxxxxxxx

POSTGRES_HOST=production-db.example.com
POSTGRES_PORT=5432
POSTGRES_DB=near_rewards_prod
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=secure_password

LOG_LEVEL=info
METRICS_COLLECTION_INTERVAL=300000
```

### Testing (.env.test)

```env
PROJECT_ID=test-project
NEAR_ACCOUNT=test.near
GITHUB_REPO=myorg/test-repo
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
NEAR_API_KEY=xxxxxxxxxxxxxxxxxxxx

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=near_rewards_test
POSTGRES_USER=test_user
POSTGRES_PASSWORD=test_password

LOG_LEVEL=debug
TEST_TIMEOUT=60000
ENABLE_API_MOCKING=true
```

## Validation Rules

The SDK validates environment variables according to these rules:

1. **NEAR Account Format**
   - Must end with `.near` or `.testnet`
   - Example: `myproject.near`

2. **GitHub Token Format**
   - Must start with `ghp_`
   - Must be 40 characters long

3. **GitHub Repository Format**
   - Must follow `owner/repo` format
   - Example: `near/protocol-rewards`

4. **Database Configuration**
   - All PostgreSQL variables must be set when using database storage
   - Port must be a valid number

## Usage in SDK

```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: process.env.PROJECT_ID!,
  nearAccount: process.env.NEAR_ACCOUNT!,
  githubRepo: process.env.GITHUB_REPO!,
  githubToken: process.env.GITHUB_TOKEN!,
  storage: {
    type: 'postgres',
    config: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!, 10),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!
    }
  }
});
```

## Security Best Practices

1. **Never commit sensitive values**
   - Add `.env` and `.env.*` to `.gitignore`
   - Use environment-specific files

2. **Use secure values**
   - Generate strong passwords
   - Use tokens with minimal required permissions
   - Rotate secrets regularly

3. **Production deployment**
   - Use secrets management service
   - Encrypt sensitive values
   - Limit access to production variables

## Troubleshooting

Common issues and solutions:

1. **Database Connection Failed**

   ```bash
   Error: Failed to connect to database
   ```

   - Verify PostgreSQL is running
   - Check credentials and host
   - Ensure database exists

2. **GitHub API Error**

   ```bash
   Error: Bad credentials
   ```

   - Verify token starts with `ghp_`
   - Check token permissions
   - Ensure token hasn't expired

3. **NEAR API Error**

   ```bash
   Error: Invalid API key
   ```

   - Verify NEAR_API_KEY is set
   - Check key validity at NEARBlocks
