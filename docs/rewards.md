# NEAR Protocol Rewards Structure (Beta)

> A transparent, merit-based rewards system that incentivizes sustainable development practices.

## Beta Program Context

This is the initial version of our rewards system, designed to be:

- **Simple**: Easy to understand and predict
- **Transparent**: Clear rules and thresholds
- **Iterative**: Will evolve based on community feedback

We acknowledge current limitations:

- Basic metrics that don't capture all contribution types
- Fixed thresholds that might not suit all project types
- Team size considerations that need refinement

We're starting simple to:

1. Gather real-world usage data
2. Understand different project needs
3. Develop more sophisticated metrics
4. Build fair, project-specific scoring

Your feedback during this beta phase will help shape future improvements.

## Overview

Protocol Rewards uses a scoring system that evaluates development activity across multiple dimensions. Rather than simply counting raw numbers, we employ a balanced approach that rewards both quantity and quality of contributions.

## Scoring Components

The total score (0-100) is calculated from four main components:

| Component     | Weight | Description                   | Max Points |
|--------------|--------|-------------------------------|------------|
| Commits      | 35%    | Code contributions           | 35        |
| Pull Requests| 25%    | Code review and integration  | 25        |
| Reviews      | 20%    | Community participation      | 20        |
| Issues       | 20%    | Project management          | 20        |

### Thresholds for Maximum Points

To achieve maximum points in each category:

- **Commits**: 100 meaningful commits
- **Pull Requests**: 20 merged PRs
- **Reviews**: 30 substantive reviews
- **Issues**: 30 closed issues

## Anti-Gaming Measures

We implement several safeguards to ensure the integrity of the rewards system. These measures are actively enforced through our validation system:

### 1. Activity Validation (Implemented)

Our validator enforces balanced development practices:

```typescript
validator = new GitHubValidator({
  minCommits: 10,           // Ensures minimum meaningful activity
  maxCommitsPerDay: 15,     // Prevents commit spamming
  minAuthors: 1,            // Supports solo developers
  minReviewPrRatio: 0.5     // Ensures review participation
});
```

#### Single-Author Projects

We support solo developers while encouraging best practices:

- Single-author repositories are fully supported
- Additional validations ensure quality:
  - Stricter commit frequency limits
  - Emphasis on PR-based workflows
  - Encouragement to seek contributors
- Warning notifications provide guidance on:
  - Project sustainability
  - Development best practices
  - Community building opportunities

### 2. Balanced Scoring (Implemented)

The scoring system is weighted to prevent gaming through any single metric:

```typescript
calculator = new GitHubRewardsCalculator({
  commits: 0.35,        // Code contributions
  pullRequests: 0.25,   // Integration work
  reviews: 0.20,        // Community participation
  issues: 0.20          // Project management
});
```

### 3. Quality Thresholds (Implemented)

Maximum points require meeting specific thresholds:

```typescript
thresholds = {
  commits: 100,      // Meaningful development pace
  pullRequests: 20,  // Substantial integration work
  reviews: 30,       // Active code review participation
  issues: 30         // Project management engagement
};
```

### 4. Time-Based Controls (Implemented)

- Metrics are collected every 5 minutes via GitHub Actions
- Weekly aggregation smooths out activity spikes
- Continuous monitoring enables pattern detection

### 5. Future Enhancements

We are actively developing additional anti-gaming measures:

1. **Enhanced Pattern Detection**
   - Automated commit quality analysis
   - Review depth evaluation
   - Cross-repository behavior monitoring

2. **Penalty System**
   - Structured response to gaming attempts
   - Clear recovery paths
   - Graduated enforcement

3. **Advanced Scoring Algorithm**

   ```typescript
   // Future scoring implementation
   interface AdvancedMetrics extends BaseMetrics {
     velocity: {
       commitFrequency: number;      // Commits per active day
       prCycleTime: number;          // Time to merge PRs
       issueResolutionTime: number;  // Time to close issues
     };
     quality: {
       testCoverage: number;         // Code test coverage %
       codeReviewDepth: number;      // Lines reviewed/total
       documentationScore: number;   // Doc completeness
     };
     impact: {
       codeComplexity: number;       // Cyclomatic complexity
       bugFixRate: number;           // Bugs fixed/introduced
       featureAdoption: number;      // Feature usage metrics
     };
     collaboration: {
       crossTeamWork: number;        // Cross-team PRs
       mentorship: number;           // Junior dev interaction
       communityEngagement: number;  // External contribution
     };
   }

   class AdvancedRewardsCalculator {
     calculateScore(metrics: AdvancedMetrics): number {
       return weightedSum([
         [metrics.velocity, 0.25],      // Speed of development
         [metrics.quality, 0.35],       // Code and review quality
         [metrics.impact, 0.25],        // Business value delivered
         [metrics.collaboration, 0.15]   // Team and community work
       ]);
     }

     applyModifiers(baseScore: number, context: Context): number {
       return baseScore
         * getConsistencyModifier(context.timespan)
         * getDifficultyModifier(context.complexity)
         * getInnovationModifier(context.novelty)
         * getAdoptionModifier(context.usage);
     }
   }
   ```

This enhanced scoring system will:

- Consider development velocity and consistency
- Measure code quality and test coverage
- Track business impact and feature adoption
- Reward team collaboration and mentorship
- Apply contextual modifiers for fairness

Note: These enhancements are in development and will be released in future updates.

## Reward Tiers

Projects are classified into tiers based on their total score:

| Tier     | Score Range | Description                                |
|----------|-------------|--------------------------------------------|
| Diamond  | 90-100     | Exceptional development activity           |
| Platinum | 80-89      | Strong, consistent contributions          |
| Gold     | 70-79      | Above average project activity            |
| Silver   | 60-69      | Good baseline development                 |
| Bronze   | <60        | Emerging or part-time development         |

## Example Calculation

Here's how a high-performing project might achieve a Diamond tier score:

```typescript
const metrics = {
  commits: {
    count: 100,          // 35 points (max)
    frequency: {
      daily: balanced,   // Passes validation
      weekly: steady     // Shows consistency
    },
    authors: diverse     // Multiple contributors
  },
  pullRequests: {
    merged: 20,          // 25 points (max)
    quality: high        // Substantive changes
  },
  reviews: {
    count: 30,          // 20 points (max)
    engagement: active   // Regular participation
  },
  issues: {
    closed: 30,         // 20 points (max)
    impact: significant // Real project improvements
  }
}

// Total Score: 100 points
```

## Best Practices

To maximize your rewards while maintaining development quality:

1. **Commit Regularly**
   - Make small, meaningful commits
   - Include clear commit messages
   - Maintain a steady development pace

2. **Review Thoroughly**
   - Provide substantive feedback
   - Engage in technical discussions
   - Help improve code quality

3. **Manage Issues Effectively**
   - Create detailed bug reports
   - Document feature requests clearly
   - Close resolved issues promptly

4. **Collaborate Actively**
   - Engage with other contributors
   - Participate in discussions
   - Help onboard new developers

## Monitoring Your Progress

1. Track your metrics in real-time on the [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app/)
2. Review weekly and monthly trends
3. Adjust development practices based on metrics

## FAQ

**Q: How often are rewards calculated?**
A: Metrics are collected every 5 minutes, but rewards are calculated on a weekly basis to ensure consistency.

**Q: What happens if we have a spike in activity?**
A: Sudden spikes trigger additional validation. Consistent, sustainable development is rewarded over burst activity.

**Q: How can we improve our score?**
A: Focus on balanced contributions across all categories and maintain steady development activity with multiple contributors.

**Q: Are all repositories treated the same?**
A: Yes, but the system accounts for team size and project maturity in its validation thresholds.

## Support

Need help understanding your metrics or improving your score?

- [View Documentation](https://github.com/jbarnes850/near-protocol-rewards#readme)
- [Report Issues](https://github.com/jbarnes850/near-protocol-rewards/issues)
- [Dashboard Support](https://github.com/jbarnes850/protocol-rewards-dashboard/issues)
