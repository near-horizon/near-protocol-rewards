import { Octokit } from "@octokit/rest";
import { GitHubCollector } from "../../../src/collectors/github";
import { RateLimiter } from "../../../src/utils/rate-limiter";
import { BaseError, ErrorCode } from "../../../src/types/errors";

jest.mock("@octokit/rest");
jest.mock("../../../src/utils/rate-limiter");
jest.mock("@octokit/rest", () => {
    return {
      Octokit: jest.fn().mockImplementation(() => ({
        rest: {
          repos: {
            get: jest.fn(),
          },
        },
        paginate: jest.fn(),
      })),
    };
  });  
jest.mock('../../../src/utils/logger', () => {
    return {
      ConsoleLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
      })
    };
  });
import { ConsoleLogger } from '../../../src/utils/logger';

describe("GitHubCollector", () => {
  const token = "test-token";
  const repo = "owner/repo";
  let logger: any;
  let rateLimiter: RateLimiter;
  let collector: GitHubCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new ConsoleLogger();
    rateLimiter = new RateLimiter({ maxRequestsPerSecond: 10 });
    collector = new GitHubCollector({
      token,
      repo,
      logger,
      rateLimiter,
    });
  });

  it("should throw an error for invalid repository format", () => {
    expect(
      () => new GitHubCollector({ token, repo: "invalidRepo", logger })
    ).toThrow("Invalid repository format. Expected 'owner/repo'");
  });

  it("should test GitHub connection successfully", async () => {
    const mockReposGet = jest.fn().mockResolvedValue({});
    (collector as any).octokit.rest.repos.get = mockReposGet;

    await collector.testConnection();

    expect(mockReposGet).toHaveBeenCalledWith({ owner: "owner", repo: "repo" });
  });

  it("should handle GitHub connection failure", async () => {
    const mockReposGet = jest.fn().mockRejectedValue(new Error("Connection error"));
    (collector as any).octokit.rest.repos.get = mockReposGet;

    await expect(collector.testConnection()).rejects.toThrow("Connection error");
  });

  it("should collect commit metrics", async () => {
    const mockCommits = [
      { author: { login: "user1" }, commit: { author: { date: "2025-01-01T00:00:00Z" } } },
      { author: { login: "user2" }, commit: { author: { date: "2025-01-02T00:00:00Z" } } },
    ];
    const mockPaginate = jest.fn().mockResolvedValue(mockCommits);
    (collector as any).octokit.paginate = mockPaginate;

    const result = await collector.collectCommitMetrics();

    expect(result.count).toBe(2);
    expect(result.authors).toEqual([
      { login: "user1", count: 1 },
      { login: "user2", count: 1 },
    ]);
    expect(result.frequency.daily).toHaveLength(7);
  });

  it("should collect pull request metrics", async () => {
    const openPRs = [{ user: { login: "user1" } }];
    const closedPRs = [
      { user: { login: "user2" }, merged_at: "2025-01-01T00:00:00Z" },
      { user: { login: "user3" }, merged_at: null },
    ];
    const mockPaginate = jest.fn()
      .mockResolvedValueOnce(openPRs)
      .mockResolvedValueOnce(closedPRs);
    (collector as any).octokit.paginate = mockPaginate;

    const result = await collector.collectPullRequestMetrics();

    expect(result.open).toBe(1);
    expect(result.merged).toBe(1);
    expect(result.closed).toBe(1);
    expect(result.authors).toEqual(["user1", "user2", "user3"]);
  });

  it("should collect review metrics", async () => {
    const mockPRs = [{ number: 1 }];
    const mockReviews = [
      { user: { login: "reviewer1" } },
      { user: { login: "reviewer2" } },
    ];
    const mockPaginate = jest.fn()
      .mockResolvedValueOnce(mockPRs)
      .mockResolvedValueOnce(mockReviews);
    (collector as any).octokit.paginate = mockPaginate;

    const result = await collector.collectReviewMetrics();

    expect(result.count).toBe(2);
    expect(result.authors).toEqual(["reviewer1", "reviewer2"]);
  });

  it("should collect issue metrics", async () => {
    const openIssues = [
      { user: { login: "user1" }, assignee: null, assignees: [] },
    ];
    const closedIssues = [
      {
        user: { login: "user2" },
        assignee: { login: "assignee1" },
        assignees: [{ login: "assignee2" }],
      },
    ];
    const mockPaginate = jest.fn()
      .mockResolvedValueOnce(openIssues)
      .mockResolvedValueOnce(closedIssues);
    (collector as any).octokit.paginate = mockPaginate;

    const result = await collector.collectIssueMetrics();

    expect(result.open).toBe(1);
    expect(result.closed).toBe(1);
    expect(result.participants).toEqual(["user1", "user2", "assignee1", "assignee2"]);
  });

  it("should collect all metrics", async () => {
    const mockCommitMetrics = jest.spyOn(collector, "collectCommitMetrics").mockResolvedValue({
      count: 10,
      frequency: { daily: [1, 1, 1, 1, 1, 1, 1], weekly: 7, monthly: 30 },
      authors: [{ login: "user1", count: 10 }],
    });
    const mockPRMetrics = jest.spyOn(collector, "collectPullRequestMetrics").mockResolvedValue({
      open: 5,
      merged: 3,
      closed: 2,
      authors: ["user1", "user2"],
    });
    const mockReviewMetrics = jest.spyOn(collector, "collectReviewMetrics").mockResolvedValue({
      count: 4,
      authors: ["reviewer1"],
    });
    const mockIssueMetrics = jest.spyOn(collector, "collectIssueMetrics").mockResolvedValue({
      open: 3,
      closed: 7,
      participants: ["user1", "user2"],
    });

    const result = await collector.collectMetrics();

    expect(mockCommitMetrics).toHaveBeenCalled();
    expect(mockPRMetrics).toHaveBeenCalled();
    expect(mockReviewMetrics).toHaveBeenCalled();
    expect(mockIssueMetrics).toHaveBeenCalled();

    expect(result.commits.count).toBe(10);
    expect(result.pullRequests.open).toBe(5);
    expect(result.reviews.count).toBe(4);
    expect(result.issues.open).toBe(3);
    expect(result.metadata.source).toBe("github");
  });
});
