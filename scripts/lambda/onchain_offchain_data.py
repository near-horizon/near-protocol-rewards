import os
import json
import time
import requests
import boto3
from datetime import datetime
from calendar import monthrange
from collections import Counter
from typing import Dict, Any, List

# === CONFIGURATIONS ===
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
NEARBLOCKS_API_KEY = os.getenv("NEARBLOCKS_API_KEY")
PROJECTS_JSON = os.getenv("PROJECTS_JSON")
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"}

def load_projects() -> List[Dict[str, Any]]:
    """Loads and validates projects from environment variable."""
    if not PROJECTS_JSON:
        raise ValueError("PROJECTS_JSON environment variable is not set")
    
    try:
        projects = json.loads(PROJECTS_JSON)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in PROJECTS_JSON: {str(e)}")
    
    # Validate project structure
    required_fields = ["project", "wallet", "github", "repositorie"]
    for project in projects:
        for field in required_fields:
            if field not in project:
                raise ValueError(f"Project {project.get('project', 'unknown')} is missing required field: {field}")
    
    return projects

# Load projects from environment variable
try:
    PROJECTS = load_projects()
except Exception as e:
    print(f"❌ Error loading projects: {str(e)}")
    PROJECTS = []

# Period configurations
YEAR = 2025
MONTH = 4

# === ON-CHAIN DATA COLLECTION FUNCTIONS ===

def fetch_transaction_data(account_id: str, api_key: str) -> Dict[str, Any]:
    """Fetches transaction data for a NEAR wallet."""
    base_url = f"https://api.nearblocks.io/v1/account/{account_id}/txns"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    start_date = datetime(YEAR, MONTH, 1)
    end_date = datetime(YEAR, MONTH, monthrange(YEAR, MONTH)[1], 23, 59, 59)
    
    start_timestamp = int(start_date.timestamp() * 1e9)
    end_timestamp = int(end_date.timestamp() * 1e9)
    
    params = {
        "limit": 100,
        "from_timestamp": start_timestamp,
        "to_timestamp": end_timestamp
    }
    
    all_transactions = []
    page = 1
    
    while True:
        paginated_url = f"{base_url}?page={page}&per_page=100"
        response = requests.get(paginated_url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error {response.status_code}: {response.text}")
            break
        
        data = response.json()
        transactions = data.get("txns", [])
        
        if not transactions:
            break
            
        all_transactions.extend(transactions)
        
        if len(transactions) < params["limit"]:
            break
            
        page += 1
    
    return {
        "metadata": {
            "period": {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d")
            },
            "account_id": account_id,
            "timestamp": datetime.now().isoformat()
        },
        "transactions": all_transactions
    }

def calculate_onchain_metrics(transaction_data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates on-chain metrics from transaction data."""
    total_volume = 0
    contract_interactions = 0
    unique_wallets = set()
    
    for tx in transaction_data.get("transactions", []):
        # Volume calculation
        if "actions_agg" in tx and "deposit" in tx["actions_agg"]:
            total_volume += float(tx["actions_agg"]["deposit"])
        elif "actions" in tx:
            for action in tx["actions"]:
                if "deposit" in action and action["deposit"] is not None:
                    total_volume += float(action["deposit"])
        
        # Contract interactions count
        if "actions" in tx:
            for action in tx["actions"]:
                if action.get("action") == "FUNCTION_CALL":
                    contract_interactions += 1
        
        # Unique wallets
        account_id = transaction_data["metadata"]["account_id"]
        if "predecessor_account_id" in tx and tx["predecessor_account_id"] != account_id:
            unique_wallets.add(tx["predecessor_account_id"])
        if "receiver_account_id" in tx and tx["receiver_account_id"] != account_id:
            unique_wallets.add(tx["receiver_account_id"])
    
    return {
        "transaction_volume": total_volume / (10**24),  # Convert from yoctoNEAR to NEAR
        "contract_interactions": contract_interactions,
        "unique_wallets": len(unique_wallets)
    }

# === OFF-CHAIN DATA COLLECTION FUNCTIONS ===

def get_github_data(repo: str) -> Dict[str, Any]:
    """Fetches GitHub data for a repository."""
    owner, name = repo.split("/")
    base_url = f"https://api.github.com/repos/{owner}/{name}"
    
    start_date = datetime(YEAR, MONTH, 1)
    end_date = datetime(YEAR, MONTH, monthrange(YEAR, MONTH)[1], 23, 59, 59)
    since = start_date.isoformat() + "Z"
    until = end_date.isoformat() + "Z"
    
    # Fetch commits
    commits = get_all(f"{base_url}/commits?since={since}&until={until}", repo, "commits")
    authors = Counter([
        c["author"]["login"] if c.get("author") and c["author"].get("login") else "unknown"
        for c in commits
    ])
    
    # Fetch PRs
    pulls = get_all(f"{base_url}/pulls?state=all", repo, "pull requests")
    pr_data = {
        "open": 0,
        "merged": 0,
        "closed": 0,
        "authors": set()
    }
    
    for pr in pulls:
        if since <= pr["created_at"] <= until:
            pr_data["authors"].add(pr["user"]["login"])
            if pr["state"] == "open":
                pr_data["open"] += 1
            elif pr["merged_at"]:
                pr_data["merged"] += 1
            else:
                pr_data["closed"] += 1
    
    # Fetch reviews
    reviewers = set()
    total_reviews = 0
    for pr in pulls:
        pr_number = pr["number"]
        reviews = get_all(f"{base_url}/pulls/{pr_number}/reviews?", repo, f"reviews for PR #{pr_number}")
        total_reviews += len(reviews)
        reviewers.update([r["user"]["login"] for r in reviews if "user" in r])
    
    # Fetch issues
    issues = get_all(f"{base_url}/issues?state=all&since={since}", repo, "issues")
    issue_data = {
        "open": 0,
        "closed": 0,
        "participants": set()
    }
    
    for issue in issues:
        if "pull_request" in issue:
            continue
        issue_data["participants"].add(issue["user"]["login"])
        if issue["state"] == "open":
            issue_data["open"] += 1
        else:
            issue_data["closed"] += 1
    
    return {
        "commits": {
            "count": len(commits),
            "authors": [{"login": author, "count": count} for author, count in authors.items()]
        },
        "pull_requests": {
            "open": pr_data["open"],
            "merged": pr_data["merged"],
            "closed": pr_data["closed"],
            "authors": list(pr_data["authors"])
        },
        "reviews": {
            "count": total_reviews,
            "authors": list(reviewers)
        },
        "issues": {
            "open": issue_data["open"],
            "closed": issue_data["closed"],
            "participants": list(issue_data["participants"])
        }
    }

def get_all(url: str, repo: str = None, data_type: str = None) -> List[Dict[str, Any]]:
    """Fetches all paginated data from a GitHub URL."""
    results = []
    page = 1
    while True:
        paginated_url = f"{url}&page={page}&per_page=100"
        response = requests.get(paginated_url, headers=HEADERS)
        if response.status_code != 200:
            print(f"❌ {repo} - Error in {data_type}: {response.status_code}")
            break
        data = response.json()
        if not data:
            break
        results.extend(data)
        page += 1
    return results

# === REWARDS CALCULATION FUNCTIONS ===

def calculate_onchain_rewards(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates on-chain rewards based on metrics."""
    weights = {
        "transactionVolume": 0.4,
        "contractInteractions": 0.4,
        "uniqueWallets": 0.2
    }
    
    thresholds = {
        "transactionVolume": 10000,
        "contractInteractions": 500,
        "uniqueWallets": 100
    }
    
    tv_score = min(metrics["transaction_volume"] / thresholds["transactionVolume"], 1) * weights["transactionVolume"] * 50
    ci_score = min(metrics["contract_interactions"] / thresholds["contractInteractions"], 1) * weights["contractInteractions"] * 50
    uw_score = min(metrics["unique_wallets"] / thresholds["uniqueWallets"], 1) * weights["uniqueWallets"] * 50
    
    total_score = min(tv_score + ci_score + uw_score, 50)
    normalized_score = total_score * 2
    
    level = determine_level(normalized_score)
    total_reward = calculate_monetary_reward(normalized_score)
    
    return {
        "score": {
            "total": total_score,
            "normalized": normalized_score,
            "breakdown": {
                "transactionVolume": tv_score,
                "contractInteractions": ci_score,
                "uniqueWallets": uw_score
            }
        },
        "level": level,
        "total_reward": total_reward
    }

def calculate_offchain_rewards(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates off-chain rewards based on GitHub metrics."""
    weights = {
        "commits": 0.35,
        "pullRequests": 0.25,
        "reviews": 0.2,
        "issues": 0.2
    }
    
    thresholds = {
        "commits": 100,
        "pullRequests": 20,
        "reviews": 30,
        "issues": 30
    }
    
    commit_score = min(metrics["commits"]["count"] / thresholds["commits"], 1) * weights["commits"] * 100
    pr_score = min(metrics["pull_requests"]["merged"] / thresholds["pullRequests"], 1) * weights["pullRequests"] * 100
    review_score = min(metrics["reviews"]["count"] / thresholds["reviews"], 1) * weights["reviews"] * 100
    issue_score = min(metrics["issues"]["closed"] / thresholds["issues"], 1) * weights["issues"] * 100
    
    total_score = min(commit_score + pr_score + review_score + issue_score, 100)
    
    level = determine_level(total_score)
    total_reward = calculate_monetary_reward(total_score)
    
    return {
        "score": {
            "total": total_score,
            "breakdown": {
                "commits": commit_score,
                "pullRequests": pr_score,
                "reviews": review_score,
                "issues": issue_score
            }
        },
        "level": level,
        "total_reward": total_reward
    }

def determine_level(score: float) -> Dict[str, Any]:
    """Determines the level based on the score."""
    if score >= 90:
        return {"name": "Diamond", "minScore": 90, "maxScore": 100, "color": "#B9F2FF"}
    elif score >= 80:
        return {"name": "Platinum", "minScore": 80, "maxScore": 89, "color": "#E5E4E2"}
    elif score >= 70:
        return {"name": "Gold", "minScore": 70, "maxScore": 79, "color": "#FFD700"}
    elif score >= 60:
        return {"name": "Silver", "minScore": 60, "maxScore": 69, "color": "#C0C0C0"}
    elif score >= 50:
        return {"name": "Bronze", "minScore": 50, "maxScore": 59, "color": "#CD7F32"}
    else:
        return {"name": "Member", "minScore": 0, "maxScore": 49, "color": "#A4A4A4"}

def calculate_monetary_reward(score: float) -> int:
    """Calculates monetary reward based on score."""
    if score >= 90:
        return 2500
    elif score >= 80:
        return 2000
    elif score >= 70:
        return 1500
    elif score >= 60:
        return 1000
    else:
        return 500

def calculate_total_rewards(rewards_onchain: Dict[str, Any], rewards_offchain: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates total rewards by combining on-chain and off-chain metrics."""
    # If there's no onchain or offchain data, return only what's available
    if not rewards_onchain and rewards_offchain:
        return rewards_offchain
    elif rewards_onchain and not rewards_offchain:
        return rewards_onchain
    
    # Get individual scores
    onchain_score = rewards_onchain.get("score", {}).get("normalized", 0) if rewards_onchain else 0
    offchain_score = rewards_offchain.get("score", {}).get("total", 0) if rewards_offchain else 0
    
    # Get individual rewards
    onchain_reward = rewards_onchain.get("total_reward", 0) if rewards_onchain else 0
    offchain_reward = rewards_offchain.get("total_reward", 0) if rewards_offchain else 0
    
    # Simply sum the rewards
    total_reward = onchain_reward + offchain_reward
    
    # Use the higher score for level determination
    level_score = max(onchain_score, offchain_score)
    level = determine_level(level_score)
    
    # Create return structure
    return {
        "score": {
            "total": level_score,
            "breakdown": {
                "onchain": onchain_score,
                "offchain": offchain_score
            }
        },
        "level": level,
        "total_reward": total_reward
    }

# === MAIN FUNCTION ===

def lambda_handler(event, context):
    """Main Lambda function that orchestrates the entire process."""
    print("🚀 Starting on-chain and off-chain metrics processing...")
    
    results = []
    current_date = datetime.now()
    
    for project in PROJECTS:
        print(f"\n🔄 Processing project: {project['project']}")
        project_result = {
            "project": project["project"],
            "wallet": project["wallet"],
            "github": project["github"],
            "repositorie": project["repositorie"],
            "period": f"{YEAR}-{MONTH:02}",
            "timestamp": current_date.isoformat()
        }
        
        try:
            rewards_onchain = None
            rewards_offchain = None
            
            # Process on-chain data
            if project["wallet"]:
                print("📊 Collecting on-chain data...")
                transaction_data = fetch_transaction_data(project["wallet"], NEARBLOCKS_API_KEY)
                metrics_onchain = calculate_onchain_metrics(transaction_data)
                rewards_onchain = calculate_onchain_rewards(metrics_onchain)
                
                project_result.update({
                    "metrics_onchain": metrics_onchain,
                    "rewards_onchain": rewards_onchain,
                    "rawdata_onchain": transaction_data
                })
            
            # Process off-chain data
            if project["repositorie"]:
                print("📈 Collecting off-chain data...")
                github_data = get_github_data(project["repositorie"])
                rewards_offchain = calculate_offchain_rewards(github_data)
                
                project_result.update({
                    "metrics_offchain": github_data,
                    "rewards_offchain": rewards_offchain,
                    "rawdata_offchain": github_data
                })
            
            # Calculate total rewards (combined on-chain and off-chain)
            if rewards_onchain or rewards_offchain:
                total_rewards = calculate_total_rewards(rewards_onchain, rewards_offchain)
                project_result["rewards_total"] = total_rewards
            
            results.append(project_result)
            print(f"✅ Project {project['project']} processed successfully!")
            
        except Exception as e:
            print(f"❌ Error processing project {project['project']}: {str(e)}")
            project_result["error"] = str(e)
            results.append(project_result)
    
    # Save results to S3
    s3 = boto3.client("s3")
    bucket_name = "near-protocol-rewards-data-dashboard"
    
    # Monthly file
    monthly_file_key = f"rewards/onchain_offchain_metrics_{YEAR}_{MONTH:02}.json"
    
    # Daily file
    daily_file_key = f"historical/onchain_offchain_metrics_{YEAR}_{MONTH:02}_{current_date.day:02}.json"
    
    try:
        # Save monthly file
        s3.put_object(
            Bucket=bucket_name,
            Key=monthly_file_key,
            Body=json.dumps(results, indent=2),
            ContentType="application/json"
        )
        
        # Save daily file
        s3.put_object(
            Bucket=bucket_name,
            Key=daily_file_key,
            Body=json.dumps(results, indent=2),
            ContentType="application/json"
        )
        
        print(f"✅ Files saved successfully:")
        print(f"  - Monthly: s3://{bucket_name}/{monthly_file_key}")
        print(f"  - Daily: s3://{bucket_name}/{daily_file_key}")
        
    except Exception as e:
        print(f"❌ Error saving to S3: {str(e)}")
        raise
    
    return {
        "statusCode": 200,
        "body": {
            "message": "Metrics processed successfully",
            "s3_locations": {
                "monthly": f"s3://{bucket_name}/{monthly_file_key}",
                "daily": f"s3://{bucket_name}/{daily_file_key}"
            },
            "projects_processed": len(results),
            "successful_projects": len([p for p in results if "error" not in p]),
            "failed_projects": len([p for p in results if "error" in p])
        }
    }

if __name__ == "__main__":
    # For local testing
    test_event = {
        "year": 2025,
        "month": 4
    }
    lambda_handler(test_event, None)
