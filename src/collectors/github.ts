import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base';
import { GitHubMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface GitHubCollectorConfig {
  repo: string;
  token: string;
  logger: Logger;
}

export class GitHubCollector extends BaseCollector {
  private readonly api: AxiosInstance;
  private readonly repo: string;

  constructor(config: GitHubCollectorConfig) {
    // GitHub API allows 5000 requests per hour = ~83 per minute
    super(config.logger, 80, 60 * 1000);
    
    this.repo = config.repo;
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
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
        commits: {
          count: commits.length,
          frequency: this.calculateCommitFrequency(commits),
          authors: this.extractUniqueAuthors(commits)
        },
        pullRequests: {
          open: prs.filter(pr => pr.state === 'open').length,
          merged: prs.filter(pr => pr.merged_at !== null).length,
          authors: this.extractPRAuthors(prs)
        },
        issues: {
          open: issues.filter(issue => issue.state === 'open').length,
          closed: issues.filter(issue => issue.state === 'closed').length,
          participants: this.extractIssueParticipants(issues)
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github',
          projectId: this.repo,
          periodStart: timestamp - (30 * 24 * 60 * 60 * 1000),
          periodEnd: timestamp
        }
      };
    } catch (error) {
      throw new BaseError(
        'Failed to collect GitHub metrics',
        ErrorCode.COLLECTION_ERROR,
        { error, repo: this.repo }
      );
    }
  }

  private async fetchCommits(days = 30): Promise<any[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return this.fetchAllPages(`/repos/${this.repo}/commits`, { since });
  }

  private async fetchPullRequests(): Promise<any[]> {
    return this.fetchAllPages(`/repos/${this.repo}/pulls`, {
      state: 'all',
      sort: 'updated',
      direction: 'desc'
    });
  }

  private async fetchIssues(): Promise<any[]> {
    return this.fetchAllPages(`/repos/${this.repo}/issues`, {
      state: 'all',
      sort: 'updated',
      direction: 'desc'
    });
  }

  private async fetchAllPages(endpoint: string, params: any = {}): Promise<any[]> {
    let page = 1;
    const perPage = this.batchSize;
    const allItems: any[] = [];

    while (true) {
      const response = await this.withRetry(
        () => this.api.get(endpoint, {
          params: {
            ...params,
            page,
            per_page: perPage
          }
        }),
        `Fetching ${endpoint} page ${page}`
      );

      const items = response.data;
      if (!items || items.length === 0) break;
      
      allItems.push(...items);
      if (items.length < perPage) break;
      
      page++;
    }

    return allItems;
  }

  private calculateCommitFrequency(commits: any[]): number {
    if (commits.length < 2) return 0;
    
    const dates = commits.map(c => new Date(c.commit.author.date).getTime());
    const newest = Math.max(...dates);
    const oldest = Math.min(...dates);
    const weeks = (newest - oldest) / (7 * 24 * 60 * 60 * 1000);
    
    return commits.length / Math.max(weeks, 1);
  }

  private extractUniqueAuthors(commits: any[]): string[] {
    return [...new Set(commits.map(c => c.commit.author.name))];
  }

  private extractPRAuthors(prs: any[]): string[] {
    return [...new Set(prs.map(pr => pr.user.login))];
  }

  private extractIssueParticipants(issues: any[]): string[] {
    return [...new Set(issues.map(issue => issue.user.login))];
  }
}
