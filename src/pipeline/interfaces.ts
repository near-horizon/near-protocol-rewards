import {
  RawMetrics,
  ValidatedMetrics,
  AggregatedMetrics,
  ProcessedMetrics
} from '../types/pipeline';

export interface MetricsValidator {
  validate(raw: RawMetrics): Promise<ValidatedMetrics>;
}

export interface MetricsAggregator {
  aggregate(validated: ValidatedMetrics): Promise<AggregatedMetrics>;
}

export interface MetricsTransformer {
  transform(aggregated: AggregatedMetrics): Promise<ProcessedMetrics>;
}

export interface MetricsStorage {
  store(processed: ProcessedMetrics): Promise<void>;
}

export interface MetricsPipeline {
  process(raw: RawMetrics): Promise<ProcessedMetrics>;
}
