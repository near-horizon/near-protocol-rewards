# GitHub Actions Secrets Setup

## Required Secrets

For the CI/CD pipeline to work correctly, you need to set up the following secrets in your GitHub repository:

### 1. `GITHUB_TOKEN`

- **Description**: Automatically provided by GitHub Actions
- **Purpose**: Used for GitHub API operations
- **Setup**: No action needed - this is automatically available

### 2. `SNYK_TOKEN_SECRET`

- **Description**: API token for Snyk security scanning
- **Purpose**: Performs security vulnerability scanning
- **Setup**:
  1. Go to [Snyk](https://app.snyk.io)
  2. Navigate to Account Settings
  3. Find your API token
  4. Copy the token

### 3. `NEAR_ACCOUNT_SECRET`

- **Description**: Your NEAR testnet account
- **Purpose**: Used for running NEAR-related tests
- **Setup**: Use your testnet account (e.g., `your-project.testnet`)

## Setting Up Secrets

1. Go to your GitHub repository
2. Click on "Settings"
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret:
