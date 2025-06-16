/**
 * NEAR Off-chain Metrics Calculator
 * 
 * Processes raw GitHub metrics and calculates normalized scores
 * without applying final reward weights. This provides the base
 * data for the main rewards calculator.
 */

import { GitHubMetrics } from "../types/metrics";
import { OffchainScoreBreakdown, OffchainCalculationResult } from "../types/rewards";
import { Logger } from "../utils/logger";

/**
 * NEAR Off-chain Calculator Class
 */
export class OffchainCalculator {
  private readonly logger?: Logger;

  // Thresholds for maximum points (based on cohort 2 requirements)
  private readonly thresholds = {
    commits: 100,      // 100 meaningful commits for max points
    pullRequests: 25,  // 25 merged PRs for max points
    reviews: 30,       // 30 substantive reviews for max points
    issues: 30         // 30 closed issues for max points
  };

  // Maximum points per category (total 80 points for off-chain)
  private readonly maxPoints = {
    commits: 28,        // 28 points max
    pullRequests: 22,   // 22 points max
    reviews: 16,        // 16 points max
    issues: 14,         // 14 points max
    total: 80           // 80 points total for off-chain
  };

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Logs a message if logger is available
   */
  private log(message: string, data?: any): void {
    if (this.logger) {
      this.logger.info(message, data);
    }
  }

  /**
   * Calculates commits score based on total commits and author diversity
   */
  private calculateCommitsScore(commits: GitHubMetrics["commits"]): number {
    // Base score from commit count
    const countScore = Math.min(commits.count / this.thresholds.commits, 1);
    
    // Bonus for author diversity (up to 10% bonus)
    const authorDiversityBonus = Math.min(commits.authors.length / 10, 0.1);
    
    // Final score with diversity bonus
    const score = (countScore + authorDiversityBonus) * this.maxPoints.commits;
    const finalScore = Math.min(score, this.maxPoints.commits);
    
    this.log(`📝 Commits Score:`, {
      totalCommits: commits.count,
      authors: commits.authors.length,
      threshold: this.thresholds.commits,
      countScore: countScore.toFixed(3),
      diversityBonus: authorDiversityBonus.toFixed(3),
      score: finalScore.toFixed(2)
    });

    return finalScore;
  }

  /**
   * Calculates pull requests score based on merged PRs and author diversity
   */
  private calculatePullRequestsScore(pullRequests: GitHubMetrics["pullRequests"]): number {
    // Focus on merged PRs as they represent completed work
    const mergedPRs = pullRequests.merged;
    const countScore = Math.min(mergedPRs / this.thresholds.pullRequests, 1);
    
    // Bonus for author diversity (up to 10% bonus)
    const authorDiversityBonus = Math.min(pullRequests.authors.length / 8, 0.1);
    
    // Final score with diversity bonus
    const score = (countScore + authorDiversityBonus) * this.maxPoints.pullRequests;
    const finalScore = Math.min(score, this.maxPoints.pullRequests);
    
    this.log(`🔀 Pull Requests Score:`, {
      merged: mergedPRs,
      open: pullRequests.open,
      closed: pullRequests.closed,
      authors: pullRequests.authors.length,
      threshold: this.thresholds.pullRequests,
      countScore: countScore.toFixed(3),
      diversityBonus: authorDiversityBonus.toFixed(3),
      score: finalScore.toFixed(2)
    });

    return finalScore;
  }

  /**
   * Calculates reviews score based on review count and reviewer diversity
   */
  private calculateReviewsScore(reviews: GitHubMetrics["reviews"]): number {
    const countScore = Math.min(reviews.count / this.thresholds.reviews, 1);
    
    // Bonus for reviewer diversity (up to 10% bonus)
    const reviewerDiversityBonus = Math.min(reviews.authors.length / 6, 0.1);
    
    // Final score with diversity bonus
    const score = (countScore + reviewerDiversityBonus) * this.maxPoints.reviews;
    const finalScore = Math.min(score, this.maxPoints.reviews);
    
    this.log(`👀 Reviews Score:`, {
      totalReviews: reviews.count,
      reviewers: reviews.authors.length,
      threshold: this.thresholds.reviews,
      countScore: countScore.toFixed(3),
      diversityBonus: reviewerDiversityBonus.toFixed(3),
      score: finalScore.toFixed(2)
    });

    return finalScore;
  }

  /**
   * Calculates issues score based on closed issues and participant diversity
   */
  private calculateIssuesScore(issues: GitHubMetrics["issues"]): number {
    // Focus on closed issues as they represent resolved problems
    const closedIssues = issues.closed;
    const countScore = Math.min(closedIssues / this.thresholds.issues, 1);
    
    // Bonus for participant diversity (up to 10% bonus)
    const participantDiversityBonus = Math.min(issues.participants.length / 6, 0.1);
    
    // Final score with diversity bonus
    const score = (countScore + participantDiversityBonus) * this.maxPoints.issues;
    const finalScore = Math.min(score, this.maxPoints.issues);
    
    this.log(`🐛 Issues Score:`, {
      closed: closedIssues,
      open: issues.open,
      participants: issues.participants.length,
      threshold: this.thresholds.issues,
      countScore: countScore.toFixed(3),
      diversityBonus: participantDiversityBonus.toFixed(3),
      score: finalScore.toFixed(2)
    });

    return finalScore;
  }

  /**
   * Combines multiple repository metrics into a single metrics object
   */
  combineRepositoryMetrics(repositoriesMetrics: GitHubMetrics[]): GitHubMetrics {
    this.log(`🔄 Combining data from ${repositoriesMetrics.length} repositories`);

    if (repositoriesMetrics.length === 0) {
      this.log("⚠️ No repository data to combine");
      return {
        commits: { count: 0, frequency: { daily: new Array(7).fill(0), weekly: 0, monthly: 0 }, authors: [] },
        pullRequests: { open: 0, merged: 0, closed: 0, authors: [] },
        reviews: { count: 0, authors: [] },
        issues: { open: 0, closed: 0, participants: [] },
        metadata: {
          collectionTimestamp: Date.now(),
          source: "github",
          projectId: "combined"
        }
      };
    }

    // Initialize combined metrics
    const combinedMetrics: GitHubMetrics = {
      commits: {
        count: 0,
        frequency: { daily: new Array(7).fill(0), weekly: 0, monthly: 0 },
        authors: []
      },
      pullRequests: { open: 0, merged: 0, closed: 0, authors: [] },
      reviews: { count: 0, authors: [] },
      issues: { open: 0, closed: 0, participants: [] },
      metadata: {
        collectionTimestamp: Date.now(),
        source: "github",
        projectId: "combined"
      }
    };

    // Track unique authors across all repositories
    const commitAuthorsMap = new Map<string, number>();
    const prAuthorsSet = new Set<string>();
    const reviewAuthorsSet = new Set<string>();
    const issueParticipantsSet = new Set<string>();

    // Combine metrics from all repositories
    for (const repoMetrics of repositoriesMetrics) {
      // Combine commits
      combinedMetrics.commits.count += repoMetrics.commits.count;
      combinedMetrics.commits.frequency.weekly += repoMetrics.commits.frequency.weekly;
      combinedMetrics.commits.frequency.monthly += repoMetrics.commits.frequency.monthly;
      
      // Combine daily frequency
      for (let i = 0; i < 7; i++) {
        combinedMetrics.commits.frequency.daily[i] += repoMetrics.commits.frequency.daily[i];
      }
      
      // Combine commit authors
      for (const author of repoMetrics.commits.authors) {
        commitAuthorsMap.set(
          author.login,
          (commitAuthorsMap.get(author.login) || 0) + author.count
        );
      }

      // Combine pull requests
      combinedMetrics.pullRequests.open += repoMetrics.pullRequests.open;
      combinedMetrics.pullRequests.merged += repoMetrics.pullRequests.merged;
      combinedMetrics.pullRequests.closed += repoMetrics.pullRequests.closed;
      repoMetrics.pullRequests.authors.forEach(author => prAuthorsSet.add(author));

      // Combine reviews
      combinedMetrics.reviews.count += repoMetrics.reviews.count;
      repoMetrics.reviews.authors.forEach(author => reviewAuthorsSet.add(author));

      // Combine issues
      combinedMetrics.issues.open += repoMetrics.issues.open;
      combinedMetrics.issues.closed += repoMetrics.issues.closed;
      repoMetrics.issues.participants.forEach(participant => issueParticipantsSet.add(participant));
    }

    // Convert maps/sets back to arrays
    combinedMetrics.commits.authors = Array.from(commitAuthorsMap.entries()).map(([login, count]) => ({
      login,
      count
    }));
    combinedMetrics.pullRequests.authors = Array.from(prAuthorsSet);
    combinedMetrics.reviews.authors = Array.from(reviewAuthorsSet);
    combinedMetrics.issues.participants = Array.from(issueParticipantsSet);

    this.log("📊 Combined metrics summary:", {
      commits: `${combinedMetrics.commits.count} commits from ${combinedMetrics.commits.authors.length} authors`,
      pullRequests: `${combinedMetrics.pullRequests.merged} merged PRs from ${combinedMetrics.pullRequests.authors.length} authors`,
      reviews: `${combinedMetrics.reviews.count} reviews from ${combinedMetrics.reviews.authors.length} reviewers`,
      issues: `${combinedMetrics.issues.closed} closed issues with ${combinedMetrics.issues.participants.length} participants`
    });

    return combinedMetrics;
  }

  /**
   * Processes off-chain GitHub metrics and calculates normalized scores
   * 
   * @param metrics Raw GitHub metrics from collector(s)
   * @returns Calculation result with scores and metadata
   */
  calculateOffchainScores(metrics: GitHubMetrics): OffchainCalculationResult {
    this.log("🧮 Calculating off-chain scores (GitHub metrics)");
    
    // Calculate individual scores
    const commitsScore = this.calculateCommitsScore(metrics.commits);
    const pullRequestsScore = this.calculatePullRequestsScore(metrics.pullRequests);
    const reviewsScore = this.calculateReviewsScore(metrics.reviews);
    const issuesScore = this.calculateIssuesScore(metrics.issues);

    // Calculate total score
    const totalScore = commitsScore + pullRequestsScore + reviewsScore + issuesScore;

    const scoreBreakdown: OffchainScoreBreakdown = {
      commits: commitsScore,
      pullRequests: pullRequestsScore,
      reviews: reviewsScore,
      issues: issuesScore
    };

    this.log("📊 Off-chain scores calculated:", {
      commits: `${commitsScore.toFixed(2)}/${this.maxPoints.commits}`,
      pullRequests: `${pullRequestsScore.toFixed(2)}/${this.maxPoints.pullRequests}`,
      reviews: `${reviewsScore.toFixed(2)}/${this.maxPoints.reviews}`,
      issues: `${issuesScore.toFixed(2)}/${this.maxPoints.issues}`,
      total: `${totalScore.toFixed(2)}/${this.maxPoints.total}`
    });

    return {
      scoreBreakdown,
      totalScore,
      metadata: {
        calculationTimestamp: Date.now(),
        maxPoints: this.maxPoints
      }
    };
  }

  /**
   * Validates GitHub metrics data
   */
  validateMetrics(metrics: GitHubMetrics): boolean {
    const requiredFields = ['commits', 'pullRequests', 'reviews', 'issues', 'metadata'];

    for (const field of requiredFields) {
      if (!(field in metrics)) {
        this.log(`❌ Validation failed: Missing field '${field}'`);
        return false;
      }
    }

    // Validate commits
    if (typeof metrics.commits.count !== 'number' || metrics.commits.count < 0) {
      this.log("❌ Validation failed: Invalid commits count");
      return false;
    }

    // Validate pull requests
    if (typeof metrics.pullRequests.merged !== 'number' || metrics.pullRequests.merged < 0 ||
        typeof metrics.pullRequests.open !== 'number' || metrics.pullRequests.open < 0 ||
        typeof metrics.pullRequests.closed !== 'number' || metrics.pullRequests.closed < 0) {
      this.log("❌ Validation failed: Invalid pull requests data");
      return false;
    }

    // Validate reviews
    if (typeof metrics.reviews.count !== 'number' || metrics.reviews.count < 0) {
      this.log("❌ Validation failed: Invalid reviews count");
      return false;
    }

    // Validate issues
    if (typeof metrics.issues.open !== 'number' || metrics.issues.open < 0 ||
        typeof metrics.issues.closed !== 'number' || metrics.issues.closed < 0) {
      this.log("❌ Validation failed: Invalid issues data");
      return false;
    }

    return true;
  }

  /**
   * Gets the thresholds used for calculations
   */
  getThresholds(): typeof this.thresholds {
    return this.thresholds;
  }

  /**
   * Gets the maximum points per category
   */
  getMaxPoints(): typeof this.maxPoints {
    return this.maxPoints;
  }
} 