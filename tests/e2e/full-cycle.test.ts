import { GitHubRewardsSDK } from "../../src/sdk";
import { integrationConfig } from "../integration/config";
import { BaseError } from "../../src/types/errors";

const shouldSkipTests =
  process.env.SKIP_INTEGRATION_TESTS === "true" || !process.env.GITHUB_TOKEN;

(shouldSkipTests ? describe.skip : describe)("Full Reward Cycle E2E", () => {
  let sdk: GitHubRewardsSDK;

  beforeEach(() => {
    sdk = new GitHubRewardsSDK({
      githubToken: process.env.GITHUB_TOKEN!,
      githubRepo: process.env.TEST_GITHUB_REPO!,
      isTestMode: true,
    });
  });

  afterEach(async () => {
    try {
      await sdk.stopTracking();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should complete a full reward cycle", async () => {
    await expect(sdk.startTracking()).resolves.not.toThrow();
    const metrics = await sdk.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics?.github).toBeDefined();
  });

  it("should handle reward cycle edge cases", async () => {
    await expect(sdk.startTracking()).resolves.not.toThrow();
    const metrics = await sdk.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics?.score).toBeDefined();
  });

  it("should maintain reward constraints", async () => {
    await expect(sdk.startTracking()).resolves.not.toThrow();
    const metrics = await sdk.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics?.score.total).toBeLessThanOrEqual(100);
  });
});

// Keep error handling test separate since it should always run
describe("SDK Error Handling", () => {
  it("should handle GitHub API errors gracefully", async () => {
    const invalidSdk = new GitHubRewardsSDK({
      githubToken: "invalid-token",
      githubRepo: process.env.TEST_GITHUB_REPO || "test-org/test-repo",
      isTestMode: true,
    });

    await expect(invalidSdk.startTracking()).rejects.toThrow(/Bad credentials/);
  });
});
