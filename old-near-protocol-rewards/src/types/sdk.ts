import { Logger } from "../utils/logger";
import { BaseError } from "./errors";
import { ProcessedMetrics, Score } from "./metrics";

export interface StorageConfig {
  type: "postgres";
  config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

export interface SDKConfig {
  githubToken: string;
  githubRepo: string;
  timeframe?: "day" | "week" | "month";
  logger?: Logger;
  maxRequestsPerSecond?: number;
  storage?: StorageConfig;
  isTestMode?: boolean;
}

export type RequiredSDKConfig = Required<Omit<SDKConfig, 'logger' | 'storage' | 'isTestMode'>>;

export interface RewardCalculation {
  score: Score;
  breakdown: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
  };
  metadata: {
    timestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}

export interface SDKEvents {
  "metrics:collected": (metrics: ProcessedMetrics) => void;
  "reward:calculated": (reward: RewardCalculation) => void;
  error: (error: BaseError) => void;
  "tracking:started": () => void;
  "tracking:stopped": () => void;
}

export interface GitHubRewardsSDK {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  getMetrics(): Promise<ProcessedMetrics | null>;
  on<E extends keyof SDKEvents>(event: E, listener: SDKEvents[E]): this;
  emit<E extends keyof SDKEvents>(
    event: E,
    ...args: Parameters<SDKEvents[E]>
  ): boolean;
}
