import { GitHubRewardsCalculator } from "../../src/calculator/github-rewards";
import { GitHubMetrics, RewardCalculation } from "../../src/types/metrics";
import { ConsoleLogger } from "../../src/utils/logger";
import { GitHubValidator } from "../../src/validators/github";

describe("GitHubRewardsCalculator", () => {
  let calculator: GitHubRewardsCalculator;
  let validator: GitHubValidator;
  const logger = new ConsoleLogger("error");

  beforeEach(() => {
    validator = new GitHubValidator({
      logger,
      minCommits: 10,
      maxCommitsPerDay: 15,
      minAuthors: 2,
      minReviewPrRatio: 0.5,
    });

    calculator = new GitHubRewardsCalculator(
      {
        commits: 0.35,
        pullRequests: 0.25,
        reviews: 0.2,
        issues: 0.2,
      },
      {
        commits: 100,
        pullRequests: 20,
        reviews: 30,
        issues: 30,
      },
      logger,
      validator,
    );
  });

  describe("Reward Tiers", () => {
    it("should calculate Diamond tier (90-100)", () => {
      const metrics: GitHubMetrics = {
        commits: {
          count: 100,
          frequency: {
            daily: [10, 15, 20, 25, 15, 10, 5],
            weekly: 100,
            monthly: 400,
          },
          authors: [
            { login: "user1", count: 50 },
            { login: "user2", count: 30 },
            { login: "user3", count: 20 },
          ],
        },
        pullRequests: {
          open: 5,
          merged: 20,
          closed: 25,
          authors: ["user1", "user2", "user3"],
        },
        reviews: {
          count: 30,
          authors: ["user1", "user2", "user3"],
        },
        issues: {
          open: 10,
          closed: 30,
          participants: ["user1", "user2", "user3"],
        },
        metadata: {
          collectionTimestamp: Date.now(),
          source: "github",
          projectId: "test-org/test-repo",
        },
      };

      const result: RewardCalculation = calculator.calculateRewards(
        metrics,
        "month",
      );
      expect(result.score.total).toBeGreaterThanOrEqual(45);
      expect(result.score.total).toBeLessThanOrEqual(50);
    });
  });
});
