import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';
import {
  RawMetrics,
  ValidatedMetrics,
  AggregatedMetrics,
  ProcessedMetrics
} from '../types';

export interface MetricsPipeline {
  process(raw: RawMetrics): Promise<ProcessedMetrics>;
}

export class MetricsProcessingPipeline implements MetricsPipeline {
  constructor(
    private readonly logger: Logger,
    private readonly validator: {
      validate(metrics: RawMetrics): Promise<ValidatedMetrics>;
    },
    private readonly aggregator: {
      aggregate(metrics: ValidatedMetrics): Promise<AggregatedMetrics>;
    },
    private readonly transformer: {
      transform(metrics: AggregatedMetrics): Promise<ProcessedMetrics>;
    }
  ) {}

  async process(raw: RawMetrics): Promise<ProcessedMetrics> {
    try {
      // 1. Validation
      const validated = await this.validator.validate(raw);
      this.logger.debug('Metrics validated', { projectId: raw.projectId });

      // 2. Aggregation
      const aggregated = await this.aggregator.aggregate(validated);
      this.logger.debug('Metrics aggregated', { projectId: raw.projectId });

      // 3. Transformation
      const processed = await this.transformer.transform(aggregated);
      this.logger.debug('Metrics processed', { projectId: raw.projectId });

      return processed;
    } catch (error) {
      this.logger.error('Pipeline processing failed', { error });
      throw new BaseError(
        'Metrics processing failed',
        ErrorCode.PROCESSING_ERROR,
        { error }
      );
    }
  }
}
