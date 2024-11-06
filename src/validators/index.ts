import { ConsoleLogger } from '../utils/logger';
import { NEARValidator, NEARValidatorConfig } from './near';
import { GitHubValidator, GitHubValidatorConfig } from './github';

export function createValidators(logger: ConsoleLogger) {
  return {
    near: new NEARValidator({
      logger,
      minTransactions: 100,
      maxTransactionsPerDay: 1000
    } as NEARValidatorConfig),
    
    github: new GitHubValidator({
      logger,
      minCommits: 10,
      maxCommitsPerDay: 100
    } as GitHubValidatorConfig)
  };
}
