import axios, { AxiosInstance } from 'axios';
import { GitHubMetrics } from '../types';
import { Logger } from '../utils/logger';
import { APIError, CollectionError } from '../utils/errors';

interface GitHubCollectorConfig {
  repo: string;
  token: string;
  logger: Logger;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
  };
}

interface GitHubPR {
  number: number;
  state: string;
  user: {
    login: string;
  };
  merged_at: string | null;
}

interface GitHubIssue {
  number: number;
  state: string;
  user: {
    login: string;
  };
  closed_at: string | null;
}

interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
}

export class GitHubCollector {
  private readonly api: AxiosInstance;
  private readonly repo: string;

  constructor(config: GitHubCollectorConfig) {
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
      const timestamp = Date.now();
      const [commits, prs, issues, repoDetails] = await Promise.all([
        this.fetchCommits(),
        this.fetchPullRequests(),
        this.fetchIssues(),
        this.fetchRepoDetails()
      ]);

      return {
        commits: {
          count: commits.length,
          frequency: this.calculateCommitFrequency(commits),
          authors: this.extractUniqueAuthors(commits),
          timestamp
        },
        pullRequests: {
          open: prs.filter(pr => pr.state === 'open').length,
          merged: prs.filter(pr => pr.merged_at !== null).length,
          authors: this.extractPRAuthors(prs),
          timestamp
        },
        issues: {
          open: issues.filter(issue => issue.state === 'open').length,
          closed: issues.filter(issue => issue.closed_at !== null).length,
          participants: this.extractIssueParticipants(issues),
          timestamp
        },
        metadata: {
          collectionTimestamp: timestamp,
          repoDetails: {
            stars: repoDetails.stargazers_count,
            forks: repoDetails.forks_count
          }
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new APIError(
          'GitHub API request failed',
          error.response?.status || 500,
          {
            message: error.message,
            repo: this.repo
          }
        );
      }
      throw new CollectionError('Failed to collect GitHub metrics', {
        repo: this.repo,
        error
      });
    }
  }

  private async fetchCommits(): Promise<GitHubCommit[]> {
    const { data } = await this.api.get(`/repos/${this.repo}/commits`, {
      params: { per_page: 100 }
    });
    return data;
  }

  private async fetchPullRequests(): Promise<GitHubPR[]> {
    const { data } = await this.api.get(`/repos/${this.repo}/pulls`, {
      params: { state: 'all', per_page: 100 }
    });
    return data;
  }

  private async fetchIssues(): Promise<GitHubIssue[]> {
    const { data } = await this.api.get(`/repos/${this.repo}/issues`, {
      params: { state: 'all', per_page: 100 }
    });
    return data;
  }

  private async fetchRepoDetails(): Promise<GitHubRepo> {
    const { data } = await this.api.get(`/repos/${this.repo}`);
    return data;
  }

  private calculateCommitFrequency(commits: GitHubCommit[]): number {
    if (commits.length < 2) return 0;
    
    const dates = commits.map(c => new Date(c.commit.author.date).getTime());
    const newest = Math.max(...dates);
    const oldest = Math.min(...dates);
    const weeks = (newest - oldest) / (7 * 24 * 60 * 60 * 1000);
    
    return commits.length / Math.max(weeks, 1);
  }

  private extractUniqueAuthors(commits: GitHubCommit[]): string[] {
    return [...new Set(commits.map(c => c.commit.author.name))];
  }

  private extractPRAuthors(prs: GitHubPR[]): string[] {
    return [...new Set(prs.map(pr => pr.user.login))];
  }

  private extractIssueParticipants(issues: GitHubIssue[]): string[] {
    return [...new Set(issues.map(issue => issue.user.login))];
  }
}
