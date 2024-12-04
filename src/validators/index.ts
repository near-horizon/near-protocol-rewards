import { ConsoleLogger } from '../utils/logger';
import { GitHubValidator } from './github';

export function createValidators(logger: ConsoleLogger) {
  return {
    github: new GitHubValidator({
      logger,
      maxDailyCommits: 15,
      minAuthors: 2,
      minReviewPrRatio: 0.5
    })
  };
}

export { GitHubValidator } from './github';
