import { GitHubValidator } from '../../src/validators/github';
import { Logger } from '../../src/utils/logger';
import { createMockGitHubMetrics } from '../helpers/mock-data';
import { ErrorCode } from '../../src/utils/errors';

describe('Validators Unit Tests', () => {
  let logger: Logger;
  let validator: GitHubValidator;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as Logger;

    validator = new GitHubValidator({ logger });
  });

  it('should detect suspicious commit patterns', () => {
    const metrics = createMockGitHubMetrics({
      commits: {
        count: 100,
        frequency: 50,
        authors: ['user1']  // Single author to trigger warning
      }
    });

    const result = validator.validate(metrics);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: ErrorCode.LOW_AUTHOR_DIVERSITY
      })
    );
  });
});
