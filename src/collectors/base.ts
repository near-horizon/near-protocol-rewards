import { Logger } from '../utils/logger';
import { formatError } from '../utils/format-error';
import { BaseError, ErrorCode } from '../types/errors';
import { JSONValue, toJSONValue } from '../types/json';

export interface BaseCollectorConfig {
  logger: Logger;
  maxRequestsPerSecond?: number;
}

export abstract class BaseCollector {
  protected readonly logger: Logger;
  protected readonly maxRequestsPerSecond: number;

  constructor(config: BaseCollectorConfig) {
    this.logger = config.logger;
    this.maxRequestsPerSecond = config.maxRequestsPerSecond || 5;
  }

  protected handleError(error: unknown, context: string): never {
    const formattedError = formatError(error);
    
    this.logger.error('Collection error', {
      error: formattedError,
      context: { operation: context }
    });

    throw new BaseError(
      'Collection failed',
      ErrorCode.COLLECTION_ERROR,
      { error: toJSONValue(formattedError) }
    );
  }
}
