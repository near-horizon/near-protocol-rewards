/**
 * GitHub Metrics Collector
 * 
 * Collects metrics from GitHub repositories including:
 * - Commits
 * - Pull requests
 * - Issues and comments  
 * 
 * Features built-in rate limiting and error handling for API calls.
 * Uses exponential backoff for retries on transient failures.
 */


import { Octokit } from '@octokit/rest';
import { GitHubMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';
import { formatError } from '../utils/format-error';

interface GitHubCollectorConfig {
  repo: string;
  token: string;
  logger: Logger;
}

export class GitHubCollector {
  private readonly octokit: Octokit;
  private readonly logger: Logger;
  private readonly owner: string;
  private readonly repo: string;

  constructor(config: GitHubCollectorConfig) {
    this.logger = config.logger;
    
    // Parse and validate repo format
    const [owner, repo] = config.repo.split('/');
    if (!owner || !repo) {
      throw new BaseError(
        'Invalid repository format',
        ErrorCode.VALIDATION_ERROR,
        { repo: config.repo }
      );
    }
    
    this.owner = owner;
    this.repo = repo;
    
    this.octokit = new Octokit({
      auth: config.token,
      retry: { enabled: true },
      throttle: {
        onRateLimit: (retryAfter: number) => {
          this.logger.warn('Rate limit hit', { retryAfter });
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number) => {
          this.logger.warn('Secondary rate limit hit', { retryAfter });
          return true;
        }
      }
    });
  }

  async collectMetrics(): Promise<GitHubMetrics> {
    try {
      const [commits, prs, issues] = await Promise.all([
        this.fetchCommits(),
        this.fetchPullRequests(),
        this.fetchIssues()
      ]);

      const timestamp = Date.now();

      return {
        timestamp,
        projectId: `${this.owner}/${this.repo}`,
        commits: {
          count: commits.length,
          frequency: this.calculateFrequency(commits),
          authors: [...new Set(commits.map(c => c.commit.author.name))]
        },
        pullRequests: {
          open: prs.filter(pr => pr.state === 'open').length,
          merged: prs.filter(pr => pr.merged_at !== null).length,
          authors: [...new Set(prs.map(pr => pr.user?.login).filter(Boolean))]
        },
        issues: {
          open: issues.filter(i => i.state === 'open').length,
          closed: issues.filter(i => i.state === 'closed').length,
          participants: [...new Set(issues.map(i => i.user?.login).filter(Boolean))]
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github',
          projectId: `${this.owner}/${this.repo}`,
          periodStart: timestamp - (30 * 24 * 60 * 60 * 1000),
          periodEnd: timestamp
        }
      };
    } catch (error) {
      this.logger.error('Failed to collect GitHub metrics', {
        error: formatError(error),
        context: {
          repo: `${this.owner}/${this.repo}`
        }
      });
      throw new BaseError(
        'GitHub metrics collection failed',
        ErrorCode.GITHUB_API_ERROR,
        { error: formatError(error) }
      );
    }
  }

  private calculateFrequency(commits: any[]): number {
    if (commits.length < 2) return 0;
    
    const oldestCommit = new Date(commits[commits.length - 1].commit.author.date);
    const newestCommit = new Date(commits[0].commit.author.date);
    const weeksDiff = (newestCommit.getTime() - oldestCommit.getTime()) / (7 * 24 * 60 * 60 * 1000);
    
    return commits.length / Math.max(weeksDiff, 1);
  }

  private async fetchCommits(): Promise<any[]> {
    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: 100,
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    return data;
  }

  private async fetchPullRequests(): Promise<any[]> {
    const { data } = await this.octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'all',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    return data;
  }

  private async fetchIssues(): Promise<any[]> {
    const { data } = await this.octokit.issues.list({
      owner: this.owner,
      repo: this.repo,
      state: 'all',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    return data;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn('Operation failed, retrying', { 
          error: formatError(error),
          context: {
            attempt,
            delay,
            repo: `${this.owner}/${this.repo}`
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Retry failed');
  }
}
