# Contributing to NEAR Protocol Rewards SDK

Thank you for your interest in contributing to the NEAR Protocol Rewards SDK! This document provides guidelines and instructions for contributing.

## Development Setup

1.Fork and clone the repository:

```bash
git clone https://github.com/your-username/near-protocol-rewards.git
cd near-protocol-rewards
```

2.Install dependencies:

```bash
npm install
```

3.Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Development Workflow

1.Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2.Make your changes following our coding standards

3.Write/update tests

4.Run the test suite:

```bash
npm test
npm run lint
```

## Project Structure

```markdown
src/
├── api/              # REST API implementation
├── collectors/       # Data collectors (GitHub, NEAR)
├── validators/       # Data validation logic
├── components/       # React dashboard components
├── storage/          # Database interactions
├── utils/           # Shared utilities
└── types/           # TypeScript type definitions
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Maintain strict type safety
- Document complex types
- Use interfaces over types when possible

### React Components

- Use functional components with hooks
- Follow NEAR design system guidelines
- Implement proper error boundaries
- Include accessibility attributes

### Testing

- Write unit tests for new functionality
- Include integration tests for API endpoints
- Test error handling cases
- Maintain test coverage above 80%

### Documentation

- Update README.md for new features
- Include JSDoc comments for public APIs
- Update CHANGELOG.md
- Document breaking changes

## Pull Request Process

1. Update documentation
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Submit PR with clear description
6. Address review feedback
7. Squash commits before merge

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```markdown
type(scope): description

[optional body]

[optional footer]
```markdown

Types:

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
```markdown
feat(collectors): add GitHub commit frequency tracking

- Implements daily commit frequency calculation
- Adds tests for frequency validation
- Updates documentation
```markdown

## Database Changes

When making changes to the PostgreSQL schema:

1. Create a new migration file
2. Test migration up/down scripts
3. Update relevant documentation
4. Include migration in PR description

## API Changes

When modifying the REST API:

1. Update OpenAPI documentation
2. Version breaking changes
3. Update client examples
4. Test backward compatibility

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "GitHub Collector"

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Local Development

1.Start PostgreSQL:

```bash
docker-compose up -d postgres
```

2.Run development server:

```bash
npm run dev
```

3.Build dashboard:

```bash
npm run build:dashboard
```

## Reporting Issues

- Use issue templates
- Include reproduction steps
- Attach relevant logs
- Specify environment details

## Code of Conduct

This project follows the [NEAR Protocol Code of Conduct](https://docs.near.org/docs/community/contribute/code-of-conduct).

## Questions?

- Join [NEAR Discord](https://near.chat)
- Check [Documentation](https://docs.near.org)
- Open a [GitHub Discussion](https://github.com/near/protocol-rewards/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
