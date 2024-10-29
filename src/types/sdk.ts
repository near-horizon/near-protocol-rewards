import { Logger } from '../utils/logger';
import { PoolConfig } from 'pg';

export interface StorageConfig {
  type: 'postgres';
  config: PoolConfig;
}

export interface CollectorConfig {
  maxRequestsPerSecond?: number;
  logger: Logger;
}

export interface GitHubCollectorConfig extends CollectorConfig {
  repo: string;
  token: string;
  maxRequestsPerSecond?: number;
}

export interface NEARCollectorConfig extends CollectorConfig {
  account: string;
  apiKey?: string;
  apiUrl?: string;
  maxRequestsPerSecond?: number;
}

export interface SDKConfig {
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;
  storage?: StorageConfig;
  logger?: Logger;
  trackingInterval?: number;
  maxRequestsPerSecond?: number;
}

export type RequiredSDKConfig = Required<Omit<SDKConfig, 'storage'>> & {
  storage?: StorageConfig;
}; 