import { JSONValue } from './json';
import { ErrorDetail } from './errors';
import { Logger } from '../utils/logger';

export interface LogContext {
  [key: string]: JSONValue | undefined;
}

export interface ErrorContext extends LogContext {
  error: JSONValue;
}

export interface ValidationThresholds {
  github: {
    minCommits: number;
    maxCommitsPerDay: number;
    minAuthors: number;
  };
  near: {
    minTransactions: number;
    maxTransactionsPerDay: number;
    minUniqueUsers: number;
    minContractCalls: number;
    maxVolumePerTx: string;
  };
}
export { JSONValue };

