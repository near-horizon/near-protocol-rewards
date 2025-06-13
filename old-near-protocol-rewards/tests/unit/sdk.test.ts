import { GitHubRewardsSDK } from "../../src/sdk";
import { GitHubCollector } from "../../src/collectors/github";
import { ConsoleLogger } from "../../src/utils/logger";
import { RateLimiter } from "../../src/utils/rate-limiter";
import { GitHubValidator } from "../../src/validators/github";
import { validateConfig } from "../../src/utils/config-validator";
import { BaseError, ErrorCode } from "../../src/types/errors";
import { SDKConfig } from "../../src/types/sdk";
import { ProcessedMetrics } from "../../src/types/metrics";

jest.mock("../../src/collectors/github", () => {
    return {
        GitHubCollector: jest.fn().mockImplementation(() => {
            return {
                collectMetrics: jest.fn(),
            };
        }),
    };
});
jest.mock("../../src/utils/logger");
jest.mock("../../src/utils/rate-limiter");
jest.mock("../../src/validators/github");
jest.mock("../../src/utils/config-validator");

describe("GitHubRewardsSDK", () => {
    let config: SDKConfig;

    beforeEach(() => {
        config = {
            githubToken: "fake-token",
            githubRepo: "fake-repo",
            maxRequestsPerSecond: 5,
            logger: new ConsoleLogger(),
        };

        (validateConfig as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if the configuration is invalid", () => {
        (validateConfig as jest.Mock).mockReturnValue({
            isValid: false,
            errors: [{ message: "Invalid configuration" }],
        });

        expect(() => new GitHubRewardsSDK(config)).toThrow(BaseError);
        expect(() => new GitHubRewardsSDK(config)).toThrowError("Invalid configuration");
    });

    it("should initialize with valid configuration", () => {
        const sdk = new GitHubRewardsSDK(config);

        expect(sdk).toBeInstanceOf(GitHubRewardsSDK);
        expect(validateConfig).toHaveBeenCalledWith(config);
        expect(GitHubCollector).toHaveBeenCalledWith(expect.objectContaining({
            token: config.githubToken,
            repo: config.githubRepo,
        }));
        expect(GitHubValidator).toHaveBeenCalled();
        expect(RateLimiter).toHaveBeenCalled();
    });
    
    it("should stop tracking", async () => {
        const sdk = new GitHubRewardsSDK(config);
        sdk["isTracking"] = true;

        await sdk.stopTracking();

        expect(sdk["isTracking"]).toBe(false);
    });
});