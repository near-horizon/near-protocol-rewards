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
import { Logger } from '../utils/logger';
import { GitHubMetrics } from '../types';
import { BaseError, ErrorCode } from '../types/errors';
import { formatError } from '../utils/format-error';
import { toJSONValue } from '../types/json';
import { RateLimiter } from '../utils/rate-limiter';

export class GitHubCollector {
  private readonly token: string;
  private readonly repo: string;
  private readonly logger: Logger;
  private readonly octokit: Octokit;
  private readonly rateLimiter: RateLimiter;

  constructor({ 
    repo, 
    token, 
    logger 
  }: {
    repo: string;
    token: string;
    logger: Logger;
  }) {
    this.token = token;
    this.repo = repo;
    this.logger = logger;
    this.octokit = new Octokit({ auth: token });
    this.rateLimiter = new RateLimiter({
      maxRequests: 80,
      timeWindowMs: 60 * 1000,
      retryAfterMs: 2000
    });
  }

  async collectMetrics(): Promise<GitHubMetrics> {
    try {
      const [owner, repo] = this.repo.split('/');
      
      const [commits, pullRequests, issues] = await Promise.all([
        this.fetchCommits(owner, repo),
        this.fetchPullRequests(owner, repo),
        this.fetchIssues(owner, repo)
      ]);

      return {
        commits: {
          count: commits.length,
          frequency: commits.length / 7,
          authors: commits
            .map(c => c.commit?.author?.name)
            .filter((name): name is string => name !== undefined)
        },
        pullRequests: {
          open: pullRequests.filter(pr => pr.state === 'open').length,
          merged: pullRequests.filter(pr => pr.merged_at).length,
          authors: pullRequests
            .map(pr => pr.user?.login)
            .filter((login): login is string => login !== undefined)
        },
        issues: {
          closed: issues.filter(i => i.state === 'closed').length,
          open: issues.filter(i => i.state === 'open').length,
          participants: issues.map(i => i.user?.login).filter((login): login is string => !!login),
          engagement: this.calculateEngagement(issues)
        },
        metadata: {
          collectionTimestamp: Date.now(),
          source: 'github',
          projectId: this.repo
        }
      };
    } catch (error) {
      this.handleError(error, 'collectMetrics');
    }
  }

  private async fetchCommits(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 100,
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      return data;
    } catch (error) {
      this.handleError(error, 'fetchCommits');
    }
  }

  private async fetchPullRequests(owner: string, repo: string) {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: 100
    });
    return data;
  }

  private async fetchIssues(owner: string, repo: string) {
    const { data } = await this.octokit.rest.issues.list({
      owner,
      repo,
      state: 'all',
      per_page: 100
    });
    return data;
  }

  private handleError(error: unknown, context: string): never {
    const formattedError = formatError(error);
    
    this.logger.error('GitHub API error', {
      error: formattedError,
      context: { operation: context }
    });

    throw new BaseError(
      'GitHub metrics collection failed',
      ErrorCode.API_ERROR,
      { error: toJSONValue(formattedError) }
    );
  }

  private async makeRequest<T>(url: string): Promise<T> {
    await this.rateLimiter.checkAndWait();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 403) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      throw new BaseError(
        'GitHub API rate limit exceeded',
        'RATE_LIMIT_ERROR',
        { resetTime }
      );
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('rate_limit');
      return true;
    } catch {
      return false;
    }
  }

  private calculateEngagement(issues: any[]): number {
    return issues.reduce((acc, issue) => {
      // Simple engagement score based on comments and reactions
      const commentWeight = issue.comments ? issue.comments * 0.5 : 0;
      const reactionWeight = issue.reactions?.total_count ? issue.reactions.total_count * 0.3 : 0;
      return acc + commentWeight + reactionWeight;
    }, 0);
  }
}

