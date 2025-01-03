# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2025-01-03

### Fixed

- Removed circular dependency in package.json
- Fixed npm package installation issues
- Updated CLI version number

## [0.3.2] - 2024-12-09

### Changed

- Renamed GitHub Actions workflow job from `track-metrics` to `calculate-rewards`
- Updated workflow step name for clarity
- Added required permissions block to workflow file
- Standardized command terminology across documentation

### Fixed

- Fixed GitHub Actions workflow using deprecated `track` command
- Added missing permissions in workflow file
- Updated all documentation references to use `calculate` instead of `track`
- Ensured consistent terminology across all documentation

### Migration

- Existing users should update their `.github/workflows/near-rewards.yml`:

  ```yaml
  jobs:
    calculate-rewards:    # Changed from track-metrics
      permissions:        # Added permissions block
        contents: read
        issues: read
        pull-requests: read
      steps:
        # ... other steps ...
        - name: Calculate Rewards    # Updated name
          run: npx near-protocol-rewards calculate    # Changed from track
  ```

- No data loss: All historical metrics are preserved
- No token changes needed: Uses same GitHub security

## [0.3.1] - 2024-12-08

### Added

- New `calculate` command to display rewards calculation results
- Detailed rewards breakdown in CLI output
- Achievement tracking and display
- Weekly and monthly reward projections
- Comprehensive validation warnings

### Changed

- Refactored CLI command structure for better organization
- Enhanced error handling and messaging
- Improved test coverage for CLI commands
- Updated documentation for new calculate command

### Removed

- Deprecated `track` command in favor of `calculate`
- Legacy metrics display format

## [0.3.0] - 2024-12-07

### Changed

- Simplified SDK configuration by removing projectId requirement
- Removed nearAccount field requirement
- Enhanced error messages and validation
- Updated documentation for clearer setup instructions
- Improved CLI messaging for better user guidance

### Added

- Automatic GitHub authentication
- Enhanced troubleshooting guides
- Clearer Quick Start documentation

### Removed

- projectId requirement from configuration
- nearAccount field requirement
- Unnecessary configuration complexity

## [0.1.3-beta] - 2024-12-06

### Added

- ProjectId tracking in NEAR metrics
- Comprehensive error code system
- Improved type definitions
- Enhanced validation system
- Better PostgreSQL integration
- Complete CI/CD workflows
- Detailed documentation and examples

### Changed

- Updated metrics collection structure
- Improved error handling across collectors
- Enhanced type safety in core components
- Better rate limiting implementation
- Streamlined reward calculations

### Fixed

- Type mismatches in metrics processing
- Storage layer error handling
- Cross-validator implementation
- Event emission typing
- Configuration validation

### Security

- Added signature verification
- Enhanced error context handling
- Improved data validation
- Better rate limiting controls

## [0.1.2] - 2024-10-27

Added

- Improved type safety across all components
- Enhanced error handling in collectors
- Better configuration validation
- Comprehensive Quick Start guide

Changed

- Simplified API response structure
- Updated validation pipeline
- Streamlined metrics processing
- Improved PostgreSQL storage retry logic

Fixed

- Type mismatches in API responses
- Configuration validation issues
- Cross-validator error handling
- Storage layer transaction handling

Security

- Enhanced error code handling
- Improved type validation
- Better configuration validation
- Secure metrics storage

Documentation

- Added recommended implementation structure
- Updated API examples
- Enhanced Quick Start guide
- Improved error documentation

## [0.1.1] - 2024-10-27

Changed

- Updated metrics storage schema
- Fixed collector initialization issues

## [0.1.0] - 2024-10-26

Added

- Initial SDK design and architecture
- GitHub metrics collection
- NEAR blockchain metrics collection
- Data validation system
- PostgreSQL storage integration
- TypeScript support
- Basic documentation
- Error handling system

Security

- Rate limiting for API calls
- Data validation at collection points
- Secure credential handling

Known Issues

- Type safety improvements needed
- Rate limiting to be enhanced
- More comprehensive error handling coming
