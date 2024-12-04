# NEAR Protocol Rewards Dashboard Rules

## Project Context

This is a React/TypeScript dashboard for tracking and rewarding developer contributions in the NEAR ecosystem. The project uses Vite for building, TailwindCSS for styling, and implements a mock SDK for development/demo purposes.

## Architecture Patterns

- Singleton pattern for SDK and Cache managers
- Provider pattern for global state management
- Event-driven architecture for real-time updates
- Type-safe interfaces throughout the codebase

## Core Components Structure

```typescript
// Component hierarchy and responsibilities
App
├── AuthProvider (GitHub OAuth management)
├── MetricsProvider (SDK integration and metrics distribution)
└── Dashboard
    ├── NetworkStats (Global metrics visualization)
    ├── DeveloperMetrics (Individual contributor stats)
    ├── ActivityFeed (Real-time updates)
    └── RewardCalculator (Contribution-based rewards)
```

## Type System

```typescript
// Core interfaces as defined in types/*.ts
${Previous SDK integration guide type definitions}
```

## State Management Rules

1. Use React Context for global state
2. Implement custom hooks for business logic
3. Cache metrics data locally
4. Handle real-time updates via events

## Code Organization

```bash
src/
├── components/     # React components
├── providers/      # Context providers
├── lib/           # Core utilities
├── types/         # TypeScript definitions
└── hooks/         # Custom React hooks
```

## Styling Guidelines

1. Use TailwindCSS utility classes
2. Follow mobile-first responsive design
3. Maintain dark mode compatibility
4. Use CSS variables for theming

## Error Handling

1. Use typed error system
2. Implement error boundaries
3. Provide user feedback via toast notifications
4. Log errors with context

## Performance Guidelines

1. Memoize expensive calculations
2. Implement proper cleanup in useEffect
3. Lazy load components when possible
4. Optimize re-renders

## Testing Requirements

1. Unit test business logic
2. Integration test SDK interactions
3. Mock external dependencies
4. Test error scenarios

## Development Workflow

1. Use TypeScript strict mode
2. Follow ESLint rules
3. Format with Prettier
4. Use conventional commits

## Environment Configuration

```env
# Required environment variables
VITE_USE_MOCK_SDK=true
VITE_MOCK_UPDATE_INTERVAL=30000
VITE_GITHUB_CLIENT_ID=xxx
VITE_GITHUB_CLIENT_SECRET=xxx
VITE_GITHUB_TOKEN=xxx
```

## SDK Integration Rules

1. Always use SDK manager singleton
2. Handle all SDK events
3. Implement proper error handling
4. Cache metrics data

## Component Rules

1. Use TypeScript interfaces for props
2. Implement error boundaries
3. Handle loading states
4. Support dark mode

## Data Flow

```bash
GitHub API -> SDK -> MetricsProvider -> Components
                 └-> Cache Manager
```

## Security Rules

1. Never expose GitHub tokens
2. Validate all API responses
3. Sanitize displayed data
4. Handle auth securely

## Accessibility Guidelines

1. Use semantic HTML
2. Implement ARIA attributes
3. Support keyboard navigation
4. Maintain color contrast

## Build Process

1. Use Vite for development
2. Optimize for production
3. Handle environment variables
4. Generate source maps

## Documentation Requirements

1. Document complex logic
2. Maintain type definitions
3. Update README
4. Include code examples

## Deployment Rules

1. Use environment-specific configs
2. Handle SDK switching
3. Optimize bundle size
4. Configure error tracking

## Maintenance Guidelines

1. Keep dependencies updated
2. Monitor performance
3. Track error rates
4. Update documentation
