import os
import json
import time
import requests
import sys
from datetime import datetime
from calendar import monthrange
from collections import Counter
from typing import Dict, Any, List

# Constantes
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"}

def get_all(url: str, repo: str = None, data_type: str = None) -> List[Dict[str, Any]]:
    """Fetches all paginated data from a GitHub URL."""
    results = []
    page = 1
    
    print(f"🔍 Buscando {data_type} para {repo}")
    
    while True:
        paginated_url = f"{url}&page={page}&per_page=100"
        print(f"🌐 Requisitando página {page}: {paginated_url}")
        
        try:
            response = requests.get(paginated_url, headers=HEADERS)
            
            if response.status_code == 404:
                print(f"⚠️ Recurso não encontrado: {paginated_url}")
                break
                
            if response.status_code != 200:
                error_message = f"Error {response.status_code}: {response.text}"
                print(f"❌ {repo} - Error in {data_type}: {error_message}")
                if response.status_code == 403 and "API rate limit exceeded" in response.text:
                    print("❌ GitHub API rate limit exceeded. Process will be stopped.")
                    sys.exit(1)
                if response.status_code == 403:
                    raise Exception(error_message)
                break
                
            data = response.json()
            if not data:
                print(f"📄 Nenhum dado encontrado na página {page}")
                break
                
            current_items = len(data)
            print(f"📄 Encontrados {current_items} itens na página {page}")
            results.extend(data)
            
            if current_items < 100:  # Se retornou menos que o máximo, não há mais páginas
                break
                
            page += 1
            
            # Pequeno delay para evitar limite de taxa
            time.sleep(0.5)
            
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
            break
    
    print(f"✅ Total de {data_type} encontrados: {len(results)}")
    return results

def get_github_data(repo: str, year: int, month: int) -> Dict[str, Any]:
    """Fetches GitHub data for a repository."""
    try:
        print(f"🔍 Analisando repositório: {repo}")
        
        owner, name = repo.split("/")
        base_url = f"https://api.github.com/repos/{owner}/{name}"
        
        # Verificar se o repositório existe
        try:
            repo_check = requests.get(base_url, headers=HEADERS)
            if repo_check.status_code == 404:
                print(f"⚠️ Repositório não encontrado: {repo}")
                return {
                    "commits": {"count": 0, "authors": []},
                    "pull_requests": {"open": 0, "merged": 0, "closed": 0, "authors": []},
                    "reviews": {"count": 0, "authors": []},
                    "issues": {"open": 0, "closed": 0, "participants": []}
                }
        except Exception as e:
            print(f"❌ Erro ao verificar existência do repositório: {str(e)}")
        
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month, monthrange(year, month)[1], 23, 59, 59)
        since = start_date.isoformat() + "Z"
        until = end_date.isoformat() + "Z"
        
        print(f"📅 Período: {start_date.strftime('%Y-%m-%d')} até {end_date.strftime('%Y-%m-%d')}")
        
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
        
        result = {
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
        
        print(f"📊 Métricas do repositório {repo}:")
        print(f"   - Commits: {result['commits']['count']}")
        print(f"   - PRs abertos: {result['pull_requests']['open']}, mesclados: {result['pull_requests']['merged']}, fechados: {result['pull_requests']['closed']}")
        print(f"   - Revisões: {result['reviews']['count']}")
        print(f"   - Issues abertas: {result['issues']['open']}, fechadas: {result['issues']['closed']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Erro ao processar dados do GitHub para {repo}: {str(e)}")
        # Retorna um objeto vazio para evitar falhas no processamento
        return {
            "commits": {"count": 0, "authors": []},
            "pull_requests": {"open": 0, "merged": 0, "closed": 0, "authors": []},
            "reviews": {"count": 0, "authors": []},
            "issues": {"open": 0, "closed": 0, "participants": []}
        }

def combine_github_data(repos_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Combines GitHub data from multiple repositories."""
    # Initialize combined data
    combined_data = {
        "commits": {
            "count": 0,
            "authors": []
        },
        "pull_requests": {
            "open": 0,
            "merged": 0,
            "closed": 0,
            "authors": []
        },
        "reviews": {
            "count": 0,
            "authors": []
        },
        "issues": {
            "open": 0,
            "closed": 0,
            "participants": []
        }
    }
    
    if not repos_data:
        print("⚠️ Nenhum dado de repositório para combinar")
        return combined_data
        
    print(f"🔄 Combinando dados de {len(repos_data)} repositórios")
    
    # Authors and participants from all repos
    all_commit_authors = Counter()
    all_pr_authors = set()
    all_reviewers = set()
    all_issue_participants = set()
    
    # Combine metrics
    for repo_data in repos_data:
        # Commits
        combined_data["commits"]["count"] += repo_data["commits"]["count"]
        for author in repo_data["commits"]["authors"]:
            all_commit_authors[author["login"]] += author["count"]
        
        # PRs
        combined_data["pull_requests"]["open"] += repo_data["pull_requests"]["open"]
        combined_data["pull_requests"]["merged"] += repo_data["pull_requests"]["merged"]
        combined_data["pull_requests"]["closed"] += repo_data["pull_requests"]["closed"]
        all_pr_authors.update(repo_data["pull_requests"]["authors"])
        
        # Reviews
        combined_data["reviews"]["count"] += repo_data["reviews"]["count"]
        all_reviewers.update(repo_data["reviews"]["authors"])
        
        # Issues
        combined_data["issues"]["open"] += repo_data["issues"]["open"]
        combined_data["issues"]["closed"] += repo_data["issues"]["closed"]
        all_issue_participants.update(repo_data["issues"]["participants"])
    
    # Update authors and participants lists
    combined_data["commits"]["authors"] = [
        {"login": author, "count": count} for author, count in all_commit_authors.items()
    ]
    combined_data["pull_requests"]["authors"] = list(all_pr_authors)
    combined_data["reviews"]["authors"] = list(all_reviewers)
    combined_data["issues"]["participants"] = list(all_issue_participants)
    
    print(f"📊 Métricas combinadas:")
    print(f"   - Commits: {combined_data['commits']['count']}")
    print(f"   - PRs abertos: {combined_data['pull_requests']['open']}, mesclados: {combined_data['pull_requests']['merged']}, fechados: {combined_data['pull_requests']['closed']}")
    print(f"   - Revisões: {combined_data['reviews']['count']}")
    print(f"   - Issues abertas: {combined_data['issues']['open']}, fechadas: {combined_data['issues']['closed']}")
    
    return combined_data

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
    
    # Calculate scores with correct maximum points
    commit_score = min(metrics["commits"]["count"] / thresholds["commits"], 1) * 17.5  # Max 17.5 points
    pr_score = min(metrics["pull_requests"]["merged"] / thresholds["pullRequests"], 1) * 12.5  # Max 12.5 points
    review_score = min(metrics["reviews"]["count"] / thresholds["reviews"], 1) * 10  # Max 10 points
    issue_score = min(metrics["issues"]["closed"] / thresholds["issues"], 1) * 10  # Max 10 points
    
    total_score = min(commit_score + pr_score + review_score + issue_score, 50)  # Total max 50 points
    
    from rewards import determine_level, calculate_monetary_reward
    
    level = determine_level(total_score)
    total_reward = calculate_monetary_reward(total_score)
    
    print(f"🏆 Recompensas off-chain calculadas:")
    print(f"   - Pontuação total: {total_score}")
    print(f"   - Nível: {level['name']}")
    print(f"   - Recompensa: ${total_reward}")
    
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