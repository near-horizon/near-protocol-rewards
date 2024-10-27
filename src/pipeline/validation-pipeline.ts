import { RawMetrics, ValidatedMetrics } from '../types';
import { Logger } from '../utils/logger';
import { CrossValidator } from '../validators/cross-validator';

export class ValidationPipeline {
  constructor(
    private readonly validator: CrossValidator,
    private readonly logger: Logger
  ) {}

  async validate(metrics: RawMetrics): Promise<ValidatedMetrics> {
    this.logger.debug('Starting validation', { projectId: metrics.projectId });

    const validationResult = this.validator.validate(
      metrics.github,
      metrics.near
    );

    return {
      ...metrics,
      validation: validationResult
    };
  }
}
