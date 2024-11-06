import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from './metrics';
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

export interface ProcessingPipeline {
  process(raw: RawMetrics): Promise<ProcessedMetrics>;
}
export { ProcessedMetrics };

