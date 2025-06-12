import { GitHubValidator, GitHubValidatorConfig } from "../../../src/validators/github";
import { GitHubMetrics } from "../../../src/types/metrics";
import { ErrorCode } from "../../../src/types/errors";

describe('GitHubValidator', () => {
    let validator: GitHubValidator;

    beforeEach(() => {
        const config: GitHubValidatorConfig = {
            minCommits: 10,
            maxCommitsPerDay: 15,
            minAuthors: 1,
            minReviewPrRatio: 0.5,
        };
        validator = new GitHubValidator(config);
    });

    it('should validate a repository with a single author and excessive commits', () => {
        const metrics: GitHubMetrics = {
            commits: {
                count: 100,
                authors: [{ login: 'author1', count: 100 }],
                frequency: {
                    daily: [5, 5, 5, 5, 5],
                    weekly: 100,
                    monthly: 400,
                },
            },
            pullRequests: {
                merged: 0,
                open: 0,
                closed: 0,
                authors: []
            },
            reviews: {
                count: 0,
                authors: []
            },
            issues: {
                open: 0,
                closed: 0,
                participants: []
            },
            metadata: {
                collectionTimestamp: 0,
                source: "github",
                projectId: ""
            }
        };

        const result = validator.validate(metrics);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(result.errors[0].message).toBe("Excessive commits for single-author repository");
        expect(result.warnings).toHaveLength(2);
    });

    it('should validate a repository with daily commit limit exceeded', () => {
        const metrics: GitHubMetrics = {
            commits: {
                count: 50,
                authors: [{ login: 'author1', count: 25 }, { login: 'author2', count: 25 }],
                frequency: {
                    daily: [20, 20, 20, 20, 20],
                    weekly: 100,
                    monthly: 400,
                },
            },
            pullRequests: {
                merged: 5,
                open: 0,
                closed: 0,
                authors: []
            },
            reviews: {
                count: 0,
                authors: []
            },
            issues: {
                open: 0,
                closed: 0,
                participants: []
            },
            metadata: {
                collectionTimestamp: 0,
                source: "github",
                projectId: ""
            }
        };

        const result = validator.validate(metrics);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(result.errors[0].message).toBe("Daily commit limit exceeded");
        expect(result.errors[0].context).toEqual({
            maxAllowed: 15,
            found: 20,
        });
    });

    it('should validate a repository with no errors or warnings', () => {
        const metrics: GitHubMetrics = {
            commits: {
                count: 30,
                authors: [{ login: 'author1', count: 30 }],
                frequency: {
                    daily: [5, 5, 5, 5, 5],
                    weekly: 30,
                    monthly: 30,
                },
            },
            pullRequests: {
                merged: 10,
                open: 0,
                closed: 0,
                authors: []
            },
            reviews: {
                count: 0,
                authors: []
            },
            issues: {
                open: 0,
                closed: 0,
                participants: []
            },
            metadata: {
                collectionTimestamp: 0,
                source: "github",
                projectId: ""
            }
        };

        const result = validator.validate(metrics);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should validate a repository with a single author and no pull requests', () => {
        const metrics: GitHubMetrics = {
            commits: {
                count: 60,
                authors: [{ login: 'author1', count: 100 }],
                frequency: {
                    daily: [20, 20, 20, 20, 20],
                    weekly: 100,
                    monthly: 400,
                },
            },
            pullRequests: {
                merged: 0,
                open: 0,
                closed: 0,
                authors: []
            },
            reviews: {
                count: 0,
                authors: []
            },
            issues: {
                open: 0,
                closed: 0,
                participants: []
            },
            metadata: {
                collectionTimestamp: 0,
                source: "github",
                projectId: ""
            }
        };

        const result = validator.validate(metrics);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(result.warnings[0].message).toBe("Single-author repository detected. Consider seeking contributors for project sustainability.");
    });
});