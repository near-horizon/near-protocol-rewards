import { ValidationThresholds } from './common';
import { Logger } from '../utils/logger';
import { BaseError } from '../types/errors';
import { ProcessedMetrics } from './metrics';

export interface SDKConfig {
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;
  storage?: {
    type: 'postgres';
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  };
  logger?: Logger;
  trackingInterval?: number;
  maxRequestsPerSecond?: number;
  minRewardUsd?: number;
  maxRewardUsd?: number;
}

export type RequiredSDKConfig = Required<Omit<SDKConfig, 'storage'>> & {
  storage?: SDKConfig['storage'];
};

export interface RewardCalculation {
  amount: number;
  breakdown: {
    github: number;
    near: number;
  };
  metadata: {
    timestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}

export interface SDKEvents {
  'metrics:collected': (metrics: ProcessedMetrics) => void;
  'reward:calculated': (reward: RewardCalculation) => void;
  'error': (error: BaseError) => void;
  'tracking:started': () => void;
  'tracking:stopped': () => void;
}

// Update SDK class to use typed events
declare interface NEARProtocolRewardsSDK {
  on<E extends keyof SDKEvents>(event: E, listener: SDKEvents[E]): this;
  emit<E extends keyof SDKEvents>(event: E, ...args: Parameters<SDKEvents[E]>): boolean;
} 