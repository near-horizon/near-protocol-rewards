# NEAR Protocol Rewards SDK

> A transparent, metric-based rewards system for NEAR projects that directly ties incentives to development activity.

<div align="center">
  
  [![npm version](https://img.shields.io/npm/v/near-protocol-rewards.svg)](https://www.npmjs.com/package/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jbarnes850/near-protocol-rewards/blob/main/CONTRIBUTING.md)

</div>

## What is Protocol Rewards?

Protocol Rewards is a developer-first funding solution for the NEAR ecosystem. We're solving a critical challenge in Web3: how to transform traditional one-time grants into sustainable, ongoing capital for developers - where funding automatically grows with their impact and contribution to NEAR.

### The Problem

- Traditional funding models (grants, VCs) require extensive time spent on proposals and pitches
- Developers want to focus on building, not fundraising
- Project impact is often measured subjectively
- Funding is typically front-loaded rather than tied to ongoing development

### Our Solution

Protocol Rewards provides:

- Automated tracking of development metrics and project impact
- Merit-based rewards tied directly to contributions
- Transparent, objective criteria for funding
- Sustainable, ongoing rewards that scale with project growth

By automating the entire process from tracking to distribution, we enable developers to focus on what they do best - building innovative solutions on NEAR.

## Get Started in 30 Seconds

1. Open terminal in your repository
2. Run this command:

```bash
npx near-protocol-rewards init
```

3. Push to main branch

That's it! 🎉 Your metrics will show up at [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app/)

## How It Works

![Architecture](public/assets/architecture.png)

We automatically track:

- **Commits**: How often you code
- **Pull Requests**: How you integrate changes
- **Reviews**: How you help others
- **Issues**: How you manage tasks

Everything runs through GitHub Actions:

- No setup needed
- Uses GitHub's built-in security
- Updates every 12 hours and on push

## Common Questions

### When do metrics update?

- Every push to main branch
- Every 12 hours automatically
- Check Actions tab for status

### Do I need any tokens?

No! We use GitHub's built-in security.

### Not seeing your metrics?

1. Push something to main branch
2. Wait ~2 minutes for Action to run
3. Check Actions tab for status
4. See our [Troubleshooting Guide](docs/troubleshooting.md)

## Documentation

- [Quick Start Guide](docs/quick-start.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
- [Dashboard Guide](docs/dashboard.md)
- [Rewards Structure](docs/rewards.md)
- [Development Roadmap](docs/roadmap.md)

## Need Help?

- [Report Issues](https://github.com/jbarnes850/near-protocol-rewards/issues)
- [Dashboard Support](https://github.com/jbarnes850/protocol-rewards-dashboard/issues)

## License

MIT © [NEAR Protocol](LICENSE)
