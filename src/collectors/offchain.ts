/**
 * GitHub Offchain Metrics Collector
 *
 * Collects metrics from GitHub repositories including:
 * - Commits
 * - Pull requests
 * - Reviews
 * - Issues
 *
 * Features built-in rate limiting and error handling for API calls.
 */

import { Octokit } from "@octokit/rest";
import { BaseCollector } from "./base";
import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rate-limiter";
import { getDateRangeForMonthIso } from "../utils/date-utils";
import { GitHubMetrics } from "../types/metrics";
import { BaseError, ErrorCode } from "../types/errors";
import { GitHubPullRequest, GitHubIssue, GitHubCommit, GitHubReview } from "../types/github";

export class OffchainCollector extends BaseCollector {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  /**
   * Creates a new GitHub collector
   * 
   * @param token GitHub API token
   * @param repo Repository in format "owner/repo"
   * @param logger Optional logger
   * @param rateLimiter Optional rate limiter
   */
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
      throw new BaseError(
        "Invalid repository format. Expected 'owner/repo'",
        ErrorCode.BAD_REQUEST
      );
    }

    this.owner = owner;
    this.repo = repoName;
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Tests the connection to GitHub API
   */
  async testConnection(): Promise<void> {
    try {
      this.log("Testing GitHub API connection");
      
      await this.withRateLimit(async () => {
        await this.octokit.rest.repos.get({
          owner: this.owner,
          repo: this.repo,
        });
      });
      
      this.log("GitHub API connection successful");
    } catch (error) {
      this.error("Failed to connect to GitHub API", { error });
      throw new BaseError(
        "Failed to connect to GitHub API. Please check your token and repository.",
        ErrorCode.NETWORK_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Collects commit metrics for the repository
   */
  async collectCommitMetrics(year: number, month: number): Promise<GitHubMetrics["commits"]> {
    const { since, until } = getDateRangeForMonthIso(year, month);
    
    this.log(`Collecting commits from ${since} to ${until}`);
    
    const commits = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        this.octokit.rest.repos.listCommits,
        {
          owner: this.owner,
          repo: this.repo,
          since,
          until,
          per_page: 100,
        }
      );
      return response as GitHubCommit[];
    });

    // Count authors and their contributions
    const authors = new Map<string, number>();
    const daily: number[] = new Array(7).fill(0);
    let weekly = 0;
    let monthly = 0;

    for (const commit of commits) {
      const login = commit.author?.login || 
        (commit.commit.author ? `${commit.commit.author.name} <${commit.commit.author.email}>` : "unknown");
      
      authors.set(login, (authors.get(login) || 0) + 1);

      if (commit.commit.author?.date) {
        const date = new Date(commit.commit.author.date);
        const dayIndex = date.getDay();
        daily[dayIndex]++;

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
    }

    this.log(`Collected ${commits.length} commits`);

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

  /**
   * Collects pull request metrics for the repository
   */
  async collectPullRequestMetrics(year: number, month: number): Promise<GitHubMetrics["pullRequests"]> {
    const { since, until } = getDateRangeForMonthIso(year, month);
    
    this.log(`Collecting pull requests from ${since} to ${until}`);
    
    const allPRs = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        this.octokit.rest.pulls.list,
        {
          owner: this.owner,
          repo: this.repo,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: 100,
        }
      );
      return response as GitHubPullRequest[];
    });

    // Filter PRs created in the specified time period
    const prs = allPRs.filter(pr => {
      const createdAt = new Date(pr.created_at);
      return createdAt >= new Date(since) && createdAt <= new Date(until);
    });

    const authors = new Set<string>();
    let open = 0;
    let merged = 0;
    let closed = 0;

    for (const pr of prs) {
      if (pr.user?.login) {
        authors.add(pr.user.login);
      }

      if (pr.state === "open") {
        open++;
      } else if (pr.merged_at) {
        merged++;
      } else {
        closed++;
      }
    }

    this.log(`Collected ${prs.length} pull requests`);

    return {
      open,
      merged,
      closed,
      authors: Array.from(authors),
    };
  }

  /**
   * Collects review metrics for the repository
   */
  async collectReviewMetrics(year: number, month: number): Promise<GitHubMetrics["reviews"]> {
    const { since, until } = getDateRangeForMonthIso(year, month);
    
    this.log(`Collecting reviews from ${since} to ${until}`);
    
    // First get all PRs that might have reviews in the time period
    const allPRs = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        this.octokit.rest.pulls.list,
        {
          owner: this.owner,
          repo: this.repo,
          state: "all",
          sort: "updated",
          direction: "desc",
          per_page: 100,
        }
      );
      return response as GitHubPullRequest[];
    });

    const authors = new Set<string>();
    let count = 0;

    // For each PR, get its reviews
    for (const pr of allPRs) {
      const reviews = await this.withRateLimit(async () => {
        const response = await this.octokit.paginate(
          this.octokit.rest.pulls.listReviews,
          {
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
            per_page: 100,
          }
        );
        return response as GitHubReview[];
      });

      // Filter reviews submitted in the specified time period
      const periodReviews = reviews.filter(review => {
        const submittedAt = new Date(review.submitted_at);
        return submittedAt >= new Date(since) && submittedAt <= new Date(until);
      });

      count += periodReviews.length;

      for (const review of periodReviews) {
        if (review.user?.login) {
          authors.add(review.user.login);
        }
      }
    }

    this.log(`Collected ${count} reviews`);

    return {
      count,
      authors: Array.from(authors),
    };
  }

  /**
   * Collects issue metrics for the repository
   */
  async collectIssueMetrics(year: number, month: number): Promise<GitHubMetrics["issues"]> {
    const { since, until } = getDateRangeForMonthIso(year, month);
    
    this.log(`Collecting issues from ${since} to ${until}`);
    
    const allIssues = await this.withRateLimit(async () => {
      const response = await this.octokit.paginate(
        this.octokit.rest.issues.listForRepo,
        {
          owner: this.owner,
          repo: this.repo,
          state: "all",
          since,
          per_page: 100,
        }
      );
      return response as GitHubIssue[];
    });

    // Filter out pull requests (GitHub's API returns PRs as issues)
    const issues = allIssues.filter(issue => !issue.pull_request);

    const participants = new Set<string>();
    let open = 0;
    let closed = 0;

    for (const issue of issues) {
      if (issue.user?.login) {
        participants.add(issue.user.login);
      }

      if (issue.state === "open") {
        open++;
      } else {
        closed++;
      }
    }

    this.log(`Collected ${issues.length} issues`);

    return {
      open,
      closed,
      participants: Array.from(participants),
    };
  }

  /**
   * Collects all raw data for the repository
   */
  async collectData(year: number, month: number): Promise<GitHubMetrics> {
    try {
      this.log(`Collecting metrics for ${this.owner}/${this.repo}`);
      
      const [commits, pullRequests, reviews, issues] = await Promise.all([
        this.collectCommitMetrics(year, month),
        this.collectPullRequestMetrics(year, month),
        this.collectReviewMetrics(year, month),
        this.collectIssueMetrics(year, month),
      ]);

      const metrics: GitHubMetrics = {
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

      this.log(`Successfully collected all metrics for ${this.owner}/${this.repo}`);
      
      return metrics;
    } catch (error: unknown) {
      if (
        error && 
        typeof error === 'object' && 
        'status' in error &&
        'message' in error &&
        error.status === 403 && 
        typeof error.message === 'string' && 
        error.message.includes('API rate limit exceeded')
      ) {
        throw new BaseError(
          'GitHub API rate limit exceeded. Please wait or use a different token.',
          ErrorCode.RATE_LIMITED,
          { originalError: error }
        );
      } else if (
        error && 
        typeof error === 'object' && 
        'status' in error &&
        'message' in error &&
        error.status === 404
      ) {
        throw new BaseError(
          `Repository ${this.owner}/${this.repo} not found or you don't have access to it.`,
          ErrorCode.NOT_FOUND,
          { originalError: error }
        );
      }
      
      this.error("Failed to collect GitHub metrics", { error });
      throw error;
    }
  }
}