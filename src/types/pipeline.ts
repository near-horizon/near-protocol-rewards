import { RawMetrics, ValidatedMetrics, AggregatedMetrics, ProcessedMetrics } from './metrics';

export interface MetricsValidator {
  validate(metrics: RawMetrics): Promise<ValidatedMetrics>;
}

export interface MetricsAggregator {
  aggregate(metrics: ValidatedMetrics): Promise<AggregatedMetrics>;
}

export interface MetricsTransformer {
  transform(metrics: AggregatedMetrics): Promise<ProcessedMetrics>;
}

export interface MetricsPipeline {
  process(raw: RawMetrics): Promise<ProcessedMetrics>;
}
