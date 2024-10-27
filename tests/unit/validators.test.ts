import { GitHubValidator } from '../../src/validators/github';
import { NEARValidator } from '../../src/validators/near';
import { Logger } from '../../src/utils/logger';
import { createMockGitHubMetrics } from '../helpers/mock-data';

describe('Validators Unit Tests', () => {
  const logger = new Logger({ projectId: 'test' });

  describe('GitHubValidator', () => {
    const validator = new GitHubValidator({ logger });

    it('should detect suspicious commit patterns', () => {
      const metrics = createMockGitHubMetrics({
        commits: {
          count: 100,
          frequency: 50,
          authors: ['user1']
        }
      });

      const result = validator.validate(metrics);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'LOW_AUTHOR_DIVERSITY'
        })
      );
    });
  });
});
