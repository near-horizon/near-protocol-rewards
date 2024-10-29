import { GitHubMetrics, NEARMetrics } from './metrics';
import { ValidationResult } from './validation';

export interface RawMetrics {
  github?: GitHubMetrics;
  near?: NEARMetrics;
  timestamp: number;
  projectId: string;
}

export interface ValidatedMetrics extends RawMetrics {
  validation: ValidationResult;
}

export interface AggregatedMetrics extends ValidatedMetrics {
  score: {
    total: number;
    breakdown: {
      github: number;
      near: number;
    };
  };
}

export interface ProcessedMetrics extends AggregatedMetrics {
  metadata: {
    collectionTimestamp: number;
    source: 'github' | 'near';
    projectId: string;
    periodStart: number;
    periodEnd: number;
  };
}

export interface PipelineStep<Input, Output> {
  process(input: Input): Promise<Output>;
}

export interface ValidationPipeline extends PipelineStep<RawMetrics, ValidatedMetrics> {}
export interface AggregationPipeline extends PipelineStep<ValidatedMetrics, AggregatedMetrics> {}
export interface ProcessingPipeline extends PipelineStep<AggregatedMetrics, ProcessedMetrics> {}
