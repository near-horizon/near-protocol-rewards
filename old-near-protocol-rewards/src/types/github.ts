import { components } from "@octokit/openapi-types";

export type GitHubRepository = components["schemas"]["repository"];
export type GitHubCommit = components["schemas"]["commit"];
export type GitHubPullRequest = components["schemas"]["pull-request"];
export type GitHubIssue = components["schemas"]["issue"];
export type GitHubUser = components["schemas"]["simple-user"];
export type GitHubReview = components["schemas"]["pull-request-review"];

export interface GitHubMetrics {
  repository: GitHubRepository;
  commits: GitHubCommit[];
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
  contributors: GitHubUser[];
  reviews: GitHubReview[];
}
