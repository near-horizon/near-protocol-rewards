# Beta Testing Guide

## Setup Requirements

- Node.js 16+
- PostgreSQL database
- GitHub account with API token
- NEAR testnet account

## What to Test

1. Metrics Collection
   - GitHub activity tracking
   - NEAR transaction monitoring
   - Data accuracy

2. Performance
   - Collection intervals
   - Resource usage
   - API rate limits

3. Error Scenarios
   - Network issues
   - Invalid configurations
   - API failures

## Known Warnings

The SDK currently includes ESLint warnings that don't affect functionality but will be addressed in future releases:

1. **Type Safety Warnings**
   - `no-explicit-any`: Some type definitions use 'any'
   - `no-non-null-assertion`: Non-null assertions are used in certain cases
   - Impact: None on functionality, will be improved for type safety

2. **Unused Variables**
   - `no-unused-vars`: Some declared variables aren't used
   - Impact: None on performance or functionality
   - Will be cleaned up in future releases

## Improvement Roadmap

1. Phase 1 (Next Release)
   - Improve type definitions
   - Remove unnecessary type assertions
   - Clean up unused variables

2. Phase 2
   - Enhanced type safety
   - Better null checks
   - Improved error typing

3. Phase 3
   - Full type coverage
   - Stricter null checks
   - Comprehensive error handling

## Reporting Issues

Please include:

- Error messages
- Configuration used
- Steps to reproduce
- Expected vs actual behavior

### Priority Issues

1. Runtime errors
2. Data accuracy issues
3. Performance problems
4. Type safety concerns (for TypeScript users)

## Type Safety Notes

For TypeScript users:

- The SDK is fully typed but includes some 'any' types
- Non-null assertions are used where we're confident about null safety
- Future releases will improve type strictness
