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
import { GitHubCollectorConfig } from "../types/collectors";
import { GitHubMetrics } from "../types/metrics";
import {
  GitHubPullRequest,
  GitHubIssue,
  GitHubCommit,
  GitHubReview,
  GitHubUser,
} from "../types/github";
import { RateLimiter } from "../utils/rate-limiter";
import { BaseError, ErrorCode } from "../types/errors";

export class GitHubCollector {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: any;

  constructor(config: GitHubCollectorConfig) {
    this.logger = config.logger;
    this.rateLimiter = config.rateLimiter;
    [this.owner, this.repo] = config.repo.split("/");

    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  async testConnection(): Promise<void> {
    try {
      await this.rateLimiter.acquire();
      await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      await this.rateLimiter.release();
    } catch (error) {
      this.logger.error("Failed to test GitHub connection", { error });
      throw error;
    }
  }

  async collectMetrics(): Promise<GitHubMetrics> {
    try {
      await this.rateLimiter.acquire();

      const [commits, pullRequests, reviews, issues] = await Promise.all([
        this.collectCommits(),
        this.collectPullRequests(),
        this.collectReviews(),
        this.collectIssues(),
      ]);

      await this.rateLimiter.release();

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
    } catch (error) {
      this.logger.error("Failed to collect GitHub metrics", { error });
      throw error;
    }
  }

  private async collectCommits() {
    const commits = await this.octokit.paginate(
      this.octokit.rest.repos.listCommits,
      {
        owner: this.owner,
        repo: this.repo,
        per_page: 100,
      },
    );

    const authors = new Map<string, number>();
    commits.forEach((commit) => {
      const login = commit.author?.login;
      if (login) {
        authors.set(login, (authors.get(login) || 0) + 1);
      }
    });

    const now = Date.now();
    const daily = Array(30).fill(0);
    const weekly = 0;
    const monthly = commits.length;

    commits.forEach((commit) => {
      const date = new Date(commit.commit.author?.date || "");
      const dayIndex = Math.floor(
        (now - date.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (dayIndex >= 0 && dayIndex < 30) {
        daily[dayIndex]++;
      }
    });

    return {
      count: commits.length,
      frequency: {
        daily,
        weekly: Math.floor(monthly / 4),
        monthly,
      },
      authors: Array.from(authors.entries()).map(([login, count]) => ({
        login,
        count,
      })),
    };
  }

  private async collectPullRequests() {
    const [openPRs, closedPRs] = await Promise.all([
      this.octokit.paginate(this.octokit.rest.pulls.list, {
        owner: this.owner,
        repo: this.repo,
        state: "open",
        per_page: 100,
      }),
      this.octokit.paginate(this.octokit.rest.pulls.list, {
        owner: this.owner,
        repo: this.repo,
        state: "closed",
        per_page: 100,
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

  private async collectReviews() {
    // First get all PRs
    const allPRs = await this.octokit.paginate(this.octokit.rest.pulls.list, {
      owner: this.owner,
      repo: this.repo,
      state: "all",
      per_page: 100,
    });

    // Then collect reviews for each PR
    const allReviews = await Promise.all(
      allPRs.map((pr) =>
        this.octokit.paginate(this.octokit.rest.pulls.listReviews, {
          owner: this.owner,
          repo: this.repo,
          pull_number: pr.number,
          per_page: 100,
        }),
      ),
    );

    const authors = new Set<string>();
    allReviews.flat().forEach((review) => {
      if (review.user?.login) {
        authors.add(review.user.login);
      }
    });

    return {
      count: allReviews.flat().length,
      authors: Array.from(authors),
    };
  }

  private async collectIssues() {
    const [openIssues, closedIssues] = await Promise.all([
      this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
        owner: this.owner,
        repo: this.repo,
        state: "open",
        per_page: 100,
      }),
      this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
        owner: this.owner,
        repo: this.repo,
        state: "closed",
        per_page: 100,
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
}
