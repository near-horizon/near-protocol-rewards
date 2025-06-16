/**
 * GitHub API response types
 */

export interface GitHubPullRequest {
  number: number;
  user: {
    login: string;
  } | null;
  state: string;
  created_at: string;
  merged_at: string | null;
}

export interface GitHubIssue {
  number: number;
  user: {
    login: string;
  } | null;
  state: string;
  created_at: string;
  pull_request?: any; // If this exists, it's a PR not an issue
}

export interface GitHubCommit {
  author: {
    login: string;
  } | null;
  commit: {
    author: {
      date: string;
      name: string;
      email: string;
    } | null;
  };
}

export interface GitHubReview {
  user: {
    login: string;
  } | null;
  submitted_at: string;
} 