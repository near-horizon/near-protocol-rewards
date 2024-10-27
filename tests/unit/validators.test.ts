import { GitHubValidator } from '../../validators/github';
import { NEARValidator } from '../../validators/near';
import { Logger } from '../../utils/logger';

describe('Validators Unit Tests', () => {
  const logger = new Logger({ projectId: 'test' });

  describe('GitHubValidator', () => {
    const validator = new GitHubValidator({ logger });

    it('should detect suspicious commit patterns', () => {
      const metrics = {
        commits: {
          count: 100,
          frequency: 50,
          authors: ['user1'],
          timestamp: Date.now()
        }
        // ... other required fields
      };

      const result = validator.validate(metrics);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'LOW_AUTHOR_DIVERSITY'
        })
      );
    });
  });
});
