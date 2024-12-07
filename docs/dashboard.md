# Dashboard Connection Guide

> Connect your repository to the Protocol Rewards Dashboard

## Quick Connect

1. Go to [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app)
2. Click "Sign in with GitHub"
3. Authorize the dashboard application
4. Select your repository from the list

## What to Expect

### First-Time Setup

- Initial metrics appear after your first push to main
- Historical data loads for the past week
- Updates every 12 hours automatically

### Dashboard Features

#### Repository Overview

- Total activity score
- Contribution breakdown
- Development trends
- Team collaboration metrics

#### Metrics Display

- **Commits**: Daily and weekly patterns
- **Pull Requests**: Open, merged, review stats
- **Code Reviews**: Engagement levels
- **Issues**: Resolution rates and tracking

## Troubleshooting

### Common Connection Issues

1. **Repository Not Listed?**
   - Verify you've run `npx near-protocol-rewards init`
   - Check that you've pushed the workflow file to main
   - Ensure you have admin access to the repository

2. **No Data Showing?**
   - GitHub Actions must complete at least one run
   - Check Actions tab for any workflow errors
   - Verify the workflow file exists in `.github/workflows/`

3. **Metrics Not Updating?**
   - Updates occur after pushes to main
   - Scheduled updates run every 12 hours
   - Check GitHub Actions status

### GitHub Permissions

The dashboard needs these permissions:

- Read access to code
- Read access to pull requests
- Read access to issues
- Read access to workflows

These are automatically requested during sign-in.

## Data Privacy

- Only public repository data is collected
- No code content is stored
- Only aggregate metrics are displayed
- Data is refreshed on a rolling 30-day basis

## Dashboard Support

Need help with the dashboard?

- [Report Dashboard Issues](https://github.com/jbarnes850/protocol-rewards-dashboard/issues)
- [Request New Features](https://github.com/jbarnes850/protocol-rewards-dashboard/issues/new)
- [View Source Code](https://github.com/jbarnes850/protocol-rewards-dashboard)

## Integration Status

Check your integration status:

1. Go to repository settings
2. Click "GitHub Apps" in the sidebar
3. Verify "Protocol Rewards" is listed
4. Check permissions are correct

## Best Practices

1. **Repository Setup**
   - Use meaningful commit messages
   - Create descriptive pull requests
   - Engage in code reviews
   - Track issues systematically

2. **Workflow Optimization**
   - Keep main branch up to date
   - Review GitHub Actions logs
   - Monitor metrics regularly
   - Address validation warnings

3. **Team Collaboration**
   - Share dashboard access with team
   - Review metrics in team meetings
   - Use insights to improve processes
   - Celebrate improvements together
