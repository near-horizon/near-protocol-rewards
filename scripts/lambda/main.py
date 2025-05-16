import os
import json
import time
import boto3
import sys
from datetime import datetime

from onchain import fetch_transaction_data, calculate_onchain_metrics, calculate_onchain_rewards
from offchain import get_github_data, combine_github_data, calculate_offchain_rewards
from rewards import calculate_total_rewards

# === CONFIGURATIONS ===
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
NEARBLOCKS_API_KEY = os.getenv("NEARBLOCKS_API_KEY")

def load_json_data() -> list:
    """Carrega os dados do arquivo data.json"""
    try:
        # No ambiente Lambda, o arquivo está no mesmo diretório do código
        # Tentativa 1: usando caminho direto
        data_file = "data.json"
        print(f"📂 Tentando carregar arquivo: {data_file} (caminho direto)")
        
        if os.path.exists(data_file):
            with open(data_file, 'r') as f:
                data = json.load(f)
                print(f"✅ Dados carregados com sucesso: {len(data)} projetos encontrados")
                return data
        
        # Tentativa 2: usando caminho absoluto
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file = os.path.join(current_dir, 'data.json')
        print(f"📂 Tentando carregar arquivo: {data_file} (caminho absoluto)")
        
        if os.path.exists(data_file):
            with open(data_file, 'r') as f:
                data = json.load(f)
                print(f"✅ Dados carregados com sucesso: {len(data)} projetos encontrados")
                return data
        
        # Tentativa 3: listando arquivos no diretório para debug
        print(f"📂 Listando arquivos no diretório atual:")
        for file in os.listdir(current_dir):
            print(f"   - {file}")
        
    except Exception as e:
        print(f"❌ Erro ao carregar data.json: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "message": f"Error loading projects: {str(e)}"
            }
        }        

# === MAIN FUNCTION ===

def lambda_handler(event, context):
    """Main Lambda function that orchestrates the entire process."""
    print("🚀 Starting on-chain and off-chain metrics processing...")
    
    # Default year and month to current date if not provided
    current_date = datetime.now()
    YEAR = event.get("year", current_date.year)
    MONTH = event.get("month", current_date.month)
    
    print(f"📅 Período de processamento: {YEAR}-{MONTH:02}")
    
    try:
        # Primeira tentativa: carregar do arquivo data.json
        PROJECTS = load_json_data()
        if PROJECTS:
            print(f"✅ Projetos carregados do arquivo: {len(PROJECTS)} encontrados")
        
        # Segunda tentativa: carregar da variável de ambiente se necessário
        if not PROJECTS:
            print("⚠️ Nenhum projeto carregado do arquivo, verificando variáveis de ambiente...")
            projects_json = os.getenv("PROJECTS_JSON")
            if projects_json:
                try:
                    PROJECTS = json.loads(projects_json)
                    print(f"✅ Projetos carregados da variável de ambiente: {len(PROJECTS)} encontrados")
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao decodificar JSON da variável de ambiente: {str(e)}")
                    raise ValueError(f"Erro ao decodificar PROJECTS_JSON: {str(e)}")
            else:
                print("❌ Variável PROJECTS_JSON não definida")
                raise ValueError("PROJECTS_JSON environment variable is not set")
        
        if not PROJECTS:
            raise ValueError("No projects found in data.json or environment variables")
    except Exception as e:
        print(f"❌ Error loading projects: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "message": f"Error loading projects: {str(e)}"
            }
        }
    
    print(f"🔍 Total de projetos a processar: {len(PROJECTS)}")
    results = []
    
    for index, project in enumerate(PROJECTS, 1):
        print(f"\n🔄 Processing project: {project['project']} ({index}/{len(PROJECTS)})")
        project_result = {
            "project": project["project"],
            "wallet": project["wallet"],
            "github": project.get("github", ""),
            "repository": project.get("repository", []),
            "period": f"{YEAR}-{MONTH:02}",
            "timestamp": current_date.isoformat()
        }
        
        try:
            rewards_onchain = None
            rewards_offchain = None
            
            # Process on-chain data
            if project["wallet"]:
                print("📊 Collecting on-chain data...")
                transaction_data = fetch_transaction_data(project["wallet"], NEARBLOCKS_API_KEY, YEAR, MONTH)
                metrics_onchain = calculate_onchain_metrics(transaction_data)
                rewards_onchain = calculate_onchain_rewards(metrics_onchain)
                
                project_result.update({
                    "metrics_onchain": metrics_onchain,
                    "rewards_onchain": rewards_onchain,
                    "rawdata_onchain": transaction_data
                })
            
            # Process off-chain data
            if project.get("repository"):
                print("📈 Collecting off-chain data...")
                # Handle both single repository and multiple repositories
                repos_data = []
                
                if isinstance(project["repository"], list):
                    for repo in project["repository"]:
                        print(f"🔍 Analyzing repository: {repo}")
                        github_data = get_github_data(repo, YEAR, MONTH)
                        repos_data.append(github_data)
                    
                    # Combine data from all repositories
                    if repos_data:
                        combined_github_data = combine_github_data(repos_data)
                        rewards_offchain = calculate_offchain_rewards(combined_github_data)
                        
                        project_result.update({
                            "metrics_offchain": combined_github_data,
                            "rewards_offchain": rewards_offchain,
                            "rawdata_offchain": repos_data
                        })
                else:
                    # Single repository
                    github_data = get_github_data(project["repository"], YEAR, MONTH)
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
            
            # Add delay every 3 projects to respect both GitHub and NearBlocks API rate limits
            if index % 3 == 0 and index < len(PROJECTS):
                print("⏳ Waiting 2 minutes to respect API rate limits...")
                time.sleep(120)  # 2 minutes wait
            
        except Exception as e:
            print(f"❌ Error processing project {project['project']}: {str(e)}")
            project_result["error"] = str(e)
            results.append(project_result)
            if "API rate limit exceeded" in str(e):
                print("❌ GitHub API rate limit exceeded. Process will be stopped.")
                sys.exit(1)
    
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
    # Para testar localmente com o mês atual
    current_date = datetime.now()
    test_event = {
        "year": current_date.year,
        "month": current_date.month
    }
    lambda_handler(test_event, None) 