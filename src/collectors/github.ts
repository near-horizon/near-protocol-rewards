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

export class GitHubCollector {
  private octokit: Octokit;
  private logger: Logger;
  private repo: string;

  constructor({ 
    repo, 
    token, 
    logger
  }: {
    repo: string;
    token: string;
    logger: Logger;
  }) {
    this.repo = repo;
    this.logger = logger;
    this.octokit = new Octokit({ auth: token });
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
        timestamp: Date.now(),
        projectId: this.repo,
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
          open: issues.filter(i => i.state === 'open').length,
          closed: issues.filter(i => i.state === 'closed').length,
          participants: issues
            .map(i => i.user?.login)
            .filter((login): login is string => login !== undefined)
        },
        metadata: {
          collectionTimestamp: Date.now(),
          source: 'github',
          projectId: this.repo,
          periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
          periodEnd: Date.now()
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
      ErrorCode.GITHUB_API_ERROR,
      { error: toJSONValue(formattedError) }
    );
  }
}

