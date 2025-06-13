"""
Off-chain scoring calculator for Cohort 2.

This module calculates scores based on GitHub metrics following the new scoring guidelines:
- Total: 80 points (80% weight)
- Commits: 28 points (threshold: 100 commits)
- Pull Requests: 22 points (threshold: 25 merged PRs)  
- Reviews: 16 points (threshold: 30 reviews)
- Issues: 14 points (threshold: 30 closed issues)
"""

from typing import Dict, Any


def calculateOffchainScore(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate off-chain score based on GitHub metrics.
    
    Args:
        metrics: Dictionary containing GitHub metrics
        
    Returns:
        Dictionary with calculated scores and breakdown
    """
    print("\n📱 Calculating off-chain score (GitHub metrics):")
    
    # Define thresholds and max points for each component
    thresholds = {
        "commits": 100,      # 100 meaningful commits for max points
        "pullRequests": 25,  # 25 merged PRs for max points
        "reviews": 30,       # 30 substantive reviews for max points
        "issues": 30         # 30 closed issues for max points
    }
    
    max_points = {
        "commits": 28,       # Max 28 points
        "pullRequests": 22,  # Max 22 points
        "reviews": 16,       # Max 16 points
        "issues": 14         # Max 14 points
    }
    
    # Extract metrics from data
    commit_count = metrics.get("commits", {}).get("count", 0)
    pr_merged = metrics.get("pull_requests", {}).get("merged", 0)
    review_count = metrics.get("reviews", {}).get("count", 0)
    issues_closed = metrics.get("issues", {}).get("closed", 0)
    
    print(f"   - Commits: {commit_count}")
    print(f"   - Merged PRs: {pr_merged}")
    print(f"   - Reviews: {review_count}")
    print(f"   - Closed Issues: {issues_closed}")
    
    # Calculate scores with proper scaling
    commit_score = min(commit_count / thresholds["commits"], 1.0) * max_points["commits"]
    pr_score = min(pr_merged / thresholds["pullRequests"], 1.0) * max_points["pullRequests"]
    review_score = min(review_count / thresholds["reviews"], 1.0) * max_points["reviews"]
    issue_score = min(issues_closed / thresholds["issues"], 1.0) * max_points["issues"]
    
    # Calculate total score (max 80 points)
    total_score = commit_score + pr_score + review_score + issue_score
    
    print(f"   - Commit score: {commit_score:.2f}/{max_points['commits']}")
    print(f"   - PR score: {pr_score:.2f}/{max_points['pullRequests']}")
    print(f"   - Review score: {review_score:.2f}/{max_points['reviews']}")
    print(f"   - Issue score: {issue_score:.2f}/{max_points['issues']}")
    print(f"   - Total off-chain score: {total_score:.2f}/80")
    
    return {
        "score": {
            "total": round(total_score, 2),
            "breakdown": {
                "commits": round(commit_score, 2),
                "pullRequests": round(pr_score, 2),
                "reviews": round(review_score, 2),
                "issues": round(issue_score, 2)
            }
        },
        "thresholds": thresholds,
        "maxPoints": max_points
    } 