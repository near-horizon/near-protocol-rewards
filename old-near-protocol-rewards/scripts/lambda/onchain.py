import os
import json
import time
import requests
import sys
from datetime import datetime
from calendar import monthrange
from typing import Dict, Any, List

# Constantes
NEARBLOCKS_API_KEY = os.getenv("NEARBLOCKS_API_KEY")

def fetch_transaction_data(account_id: str, api_key: str, year: int, month: int) -> Dict[str, Any]:
    """Fetches transaction data for a NEAR wallet."""
    base_url = f"https://api.nearblocks.io/v1/account/{account_id}/txns"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    print(f"🔍 Buscando transações para a conta: {account_id}")
    
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month, monthrange(year, month)[1], 23, 59, 59)
    
    start_timestamp = int(start_date.timestamp() * 1e9)
    end_timestamp = int(end_date.timestamp() * 1e9)
    
    params = {
        "limit": 100,
        "from_timestamp": start_timestamp,
        "to_timestamp": end_timestamp
    }
    
    print(f"📅 Período: {start_date.strftime('%Y-%m-%d')} até {end_date.strftime('%Y-%m-%d')}")
    
    all_transactions = []
    page = 1
    
    while True:
        paginated_url = f"{base_url}?page={page}&per_page=100"
        print(f"🌐 Requisitando página {page}: {paginated_url}")
        
        try:
            response = requests.get(paginated_url, headers=headers, params=params)
            
            if response.status_code == 404:
                print(f"⚠️ Conta não encontrada: {account_id}")
                break
                
            if response.status_code != 200:
                error_message = f"Error {response.status_code}: {response.text}"
                print(f"❌ Error fetching transactions for {account_id}: {error_message}")
                if response.status_code == 429:  # Rate limit exceeded
                    print("❌ NearBlocks API rate limit exceeded. Process will be stopped.")
                    sys.exit(1)
                if response.status_code == 403:
                    raise Exception(error_message)
                break
            
            data = response.json()
            transactions = data.get("txns", [])
            
            print(f"📄 Encontradas {len(transactions)} transações na página {page}")
            
            if not transactions:
                break
                
            all_transactions.extend(transactions)
            
            if len(transactions) < params["limit"]:
                break
                
            page += 1
            
            # Add a small delay between requests to avoid rate limit
            time.sleep(0.5)  # 500ms delay between calls
            
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
            break
    
    print(f"✅ Total de transações encontradas: {len(all_transactions)}")
    
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
    
    metrics = {
        "transaction_volume": total_volume / (10**24),  # Convert from yoctoNEAR to NEAR
        "contract_interactions": contract_interactions,
        "unique_wallets": len(unique_wallets)
    }
    
    print(f"📊 Métricas on-chain calculadas:")
    print(f"   - Volume de transações: {metrics['transaction_volume']} NEAR")
    print(f"   - Interações com contratos: {metrics['contract_interactions']}")
    print(f"   - Carteiras únicas: {metrics['unique_wallets']}")
    
    return metrics

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
    
    # Calculate scores using weights and thresholds
    tv_score = min(metrics["transaction_volume"] / thresholds["transactionVolume"], 1) * weights["transactionVolume"] * 50
    ci_score = min(metrics["contract_interactions"] / thresholds["contractInteractions"], 1) * weights["contractInteractions"] * 50
    uw_score = min(metrics["unique_wallets"] / thresholds["uniqueWallets"], 1) * weights["uniqueWallets"] * 50
    
    total_score = min(tv_score + ci_score + uw_score, 50)  # Total max 50 points
    
    from rewards import determine_level, calculate_monetary_reward
    
    level = determine_level(total_score)
    total_reward = calculate_monetary_reward(total_score)
    
    print(f"🏆 Recompensas on-chain calculadas:")
    print(f"   - Pontuação total: {total_score}")
    print(f"   - Nível: {level['name']}")
    print(f"   - Recompensa: ${total_reward}")
    
    return {
        "score": {
            "total": total_score,
            "breakdown": {
                "transactionVolume": tv_score,
                "contractInteractions": ci_score,
                "uniqueWallets": uw_score
            }
        },
        "level": level,
        "total_reward": total_reward
    } 