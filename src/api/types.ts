import { GitHubMetrics, NEARMetrics } from '../types';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface MetricsResponse {
  current: {
    github: GitHubMetrics;
    near: NEARMetrics;
    score: {
      total: number;
      breakdown: {
        githubActivity: number;
        nearActivity: number;
        userGrowth: number;
      };
    };
  };
  history: {
    timestamps: number[];
    scores: number[];
    githubActivity: number[];
    nearActivity: number[];
  };
}

export interface ProjectStatusResponse {
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  status: {
    githubIntegration: 'active' | 'error' | 'inactive';
    nearIntegration: 'active' | 'error' | 'inactive';
    lastSync: number;
    validationStatus: 'valid' | 'warning' | 'error';
  };
}

export interface ValidationStatusResponse {
  github: {
    status: 'valid' | 'warning' | 'error';
    messages: Array<{
      type: 'error' | 'warning';
      code: string;
      message: string;
    }>;
  };
  near: {
    status: 'valid' | 'warning' | 'error';
    messages: Array<{
      type: 'error' | 'warning';
      code: string;
      message: string;
    }>;
  };
  lastChecked: number;
}
