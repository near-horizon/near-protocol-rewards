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

import { Octokit } from "@octokit/rest";
import { RateLimiter } from "../utils/rate-limiter";
import { Logger } from "../utils/logger";
import { BaseCollector } from "./base";
import { GitHubMetrics } from "../types/metrics";
import { BaseError, ErrorCode } from "../types/errors";

interface GitHubPullRequest {
  number: number;
  user: {
    login: string;
  } | null;
  merged_at: string | null;
}

interface GitHubIssue {
  user: {
    login: string;
  } | null;
  assignee: {
    login: string;
  } | null;
  assignees: Array<{
    login: string;
  }>;
}

interface GitHubCommit {
  author: {
    login: string;
  } | null;
  commit: {
    author: {
      date: string;
    } | null;
  };
}

interface GitHubReview {
  user: {
    login: string;
  } | null;
}

export class GitHubCollector extends BaseCollector {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor({
    token,
    repo,
    logger,
    rateLimiter,
  }: {
    token: string;
    repo: string;
    logger?: Logger;
    rateLimiter?: RateLimiter;
  }) {
    super(logger, rateLimiter);

    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      throw new Error("Invalid repository format. Expected 'owner/repo'");
    }

    this.owner = owner;
    this.repo = repoName;
    this.octokit = new Octokit({ auth: token });
  }

  async testConnection(): Promise<void> {
    try {
      await this.withRateLimit(async () => {
        await this.octokit.rest.repos.get({
          owner: this.owner,
          repo: this.repo,
        });
      });
    } catch (error) {
      this.error("Failed to test GitHub connection", { error });
      throw error;
    }
  }

  async collectCommitMetrics(): Promise<GitHubMetrics["commits"]> {
    const commits = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        'GET /repos/{owner}/{repo}/commits',
        {
          owner: this.owner,
          repo: this.repo,
          per_page: 100,
        }
      );
      return response as GitHubCommit[];
    });

    const authors = new Map<string, number>();
    const daily: number[] = new Array(7).fill(0);
    let weekly = 0;
    let monthly = 0;

    for (const commit of commits) {
      const login = commit.author?.login;
      if (login) {
        authors.set(login, (authors.get(login) || 0) + 1);
      }

      const date = new Date(commit.commit.author?.date || "");
      const dayIndex = date.getDay();
      if (!isNaN(dayIndex)) {
        daily[dayIndex]++;
      }

      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 7) {
        weekly++;
      }
      if (daysDiff <= 30) {
        monthly++;
      }
    }

    return {
      count: commits.length,
      frequency: {
        daily,
        weekly,
        monthly,
      },
      authors: Array.from(authors.entries()).map(([login, count]) => ({
        login,
        count,
      })),
    };
  }

  async collectPullRequestMetrics(): Promise<GitHubMetrics["pullRequests"]> {
    const [openPRs, closedPRs] = await Promise.all([
      this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          'GET /repos/{owner}/{repo}/pulls',
          {
            owner: this.owner,
            repo: this.repo,
            state: "open",
            per_page: 100,
          }
        );
        return response as GitHubPullRequest[];
      }),
      this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          'GET /repos/{owner}/{repo}/pulls',
          {
            owner: this.owner,
            repo: this.repo,
            state: "closed",
            per_page: 100,
          }
        );
        return response as GitHubPullRequest[];
      }),
    ]);

    const authors = new Set<string>();

    [...openPRs, ...closedPRs].forEach((pr) => {
      if (pr.user?.login) {
        authors.add(pr.user.login);
      }
    });

    return {
      open: openPRs.length,
      merged: closedPRs.filter((pr) => pr.merged_at !== null).length,
      closed: closedPRs.filter((pr) => pr.merged_at === null).length,
      authors: Array.from(authors),
    };
  }

  async collectReviewMetrics(): Promise<GitHubMetrics["reviews"]> {
    const allPRs = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        'GET /repos/{owner}/{repo}/pulls',
        {
          owner: this.owner,
          repo: this.repo,
          state: "all",
          per_page: 100,
        }
      );
      return response as GitHubPullRequest[];
    });

    const authors = new Set<string>();
    let count = 0;

    for (const pr of allPRs) {
      const reviews = await this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
          {
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
            per_page: 100,
          }
        );
        return response as GitHubReview[];
      });

      count += reviews.length;

      reviews.forEach((review) => {
        if (review.user?.login) {
          authors.add(review.user.login);
        }
      });
    }

    return {
      count,
      authors: Array.from(authors),
    };
  }

  async collectIssueMetrics(): Promise<GitHubMetrics["issues"]> {
    const [openIssues, closedIssues] = await Promise.all([
      this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          'GET /repos/{owner}/{repo}/issues',
          {
            owner: this.owner,
            repo: this.repo,
            state: "open",
            per_page: 100,
          }
        );
        return response as GitHubIssue[];
      }),
      this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          'GET /repos/{owner}/{repo}/issues',
          {
            owner: this.owner,
            repo: this.repo,
            state: "closed",
            per_page: 100,
          }
        );
        return response as GitHubIssue[];
      }),
    ]);

    const participants = new Set<string>();

    [...openIssues, ...closedIssues].forEach((issue) => {
      if (issue.user?.login) {
        participants.add(issue.user.login);
      }
      if (issue.assignee?.login) {
        participants.add(issue.assignee.login);
      }
      issue.assignees?.forEach((assignee) => {
        if (assignee.login) {
          participants.add(assignee.login);
        }
      });
    });

    return {
      open: openIssues.length,
      closed: closedIssues.length,
      participants: Array.from(participants),
    };
  }

  async collectMetrics(): Promise<GitHubMetrics> {
    try {
      const [commits, pullRequests, reviews, issues] = await Promise.all([
        this.collectCommitMetrics(),
        this.collectPullRequestMetrics(),
        this.collectReviewMetrics(),
        this.collectIssueMetrics(),
      ]);

      return {
        commits,
        pullRequests,
        reviews,
        issues,
        metadata: {
          collectionTimestamp: Date.now(),
          source: "github",
          projectId: `${this.owner}/${this.repo}`,
        },
      };
    } catch (error: unknown) {
      if (
        error && 
        typeof error === 'object' && 
        'status' in error &&
        'message' in error &&
        error.status === 403 && 
        typeof error.message === 'string' && 
        error.message.includes('not accessible by integration')
      ) {
        throw new BaseError(
          'GitHub permissions error: Please ensure your workflow has the correct permissions. ' +
          'Add these permissions to your workflow file:\n\n' +
          'permissions:\n' +
          '  contents: read\n' +
          '  issues: read\n' +
          '  pull-requests: read\n',
          ErrorCode.UNAUTHORIZED,
          { originalError: error }
        );
      }
      throw error;
    }
  }
}
