import requests
from datetime import datetime, timedelta
import json
from pathlib import Path
import boto3
import os

def fetchTransactionData(accountId, apiKey):
    """
    Fetches transaction data for a specific NEAR account for April 2025.
    
    Args:
        accountId (str): NEAR account ID
        apiKey (str): NEARBlocks API key
        
    Returns:
        dict: JSON response from the API with transaction data
    """
    # API configuration
    baseUrl = f"https://api.nearblocks.io/v1/account/{accountId}/txns"
    headers = {
        "Authorization": f"Bearer {apiKey}",
        "Accept": "application/json"
    }
    
    # Set date range for April 2025
    startDate = datetime(2025, 4, 1)
    endDate = datetime(2025, 4, 30, 23, 59, 59)
    
    # Convert dates to nanosecond timestamps
    startTimestamp = int(startDate.timestamp() * 1e9)
    endTimestamp = int(endDate.timestamp() * 1e9)
    
    params = {
        "limit": 100,
        "from_timestamp": startTimestamp,
        "to_timestamp": endTimestamp
    }
    
    print(f"Fetching transactions from {startDate.strftime('%Y-%m-%d')} to {endDate.strftime('%Y-%m-%d')}...")
    
    allTransactions = []
    page = 1
    
    # Fetch all pages of transactions
    while True:
        print(f"Fetching page {page}...")
        response = requests.get(baseUrl, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error {response.status_code}: {response.text}")
            break
        
        data = response.json()
        transactions = data.get("txns", [])
        
        if not transactions:
            print("No transactions found on this page.")
            break
            
        allTransactions.extend(transactions)
        print(f"Retrieved {len(transactions)} transactions on page {page}")
        
        # Check if there are more pages
        if len(transactions) < params["limit"]:
            print("Last page reached.")
            break
            
        page += 1
    
    print(f"Total transactions retrieved: {len(allTransactions)}")
    
    # Return the raw API response as a dictionary with the transactions
    return {
        "metadata": {
            "period": {
                "start_date": startDate.strftime("%Y-%m-%d"),
                "end_date": endDate.strftime("%Y-%m-%d")
            },
            "account_id": accountId,
            "timestamp": datetime.now().isoformat()
        },
        "transactions": allTransactions
    }

def calculateTotalVolume(transactionData):
    """
    Calculates the total transaction volume from transaction data.
    
    Args:
        transactionData (dict): Transaction data from the API
        
    Returns:
        float: Total transaction volume in NEAR
    """
    totalVolume = 0
    transactions = transactionData.get("transactions", [])
    
    for tx in transactions:
        # Check if actions_agg.deposit exists to use as transaction value
        if "actions_agg" in tx and "deposit" in tx["actions_agg"]:
            deposit = float(tx["actions_agg"]["deposit"])
            totalVolume += deposit
        # If no actions_agg.deposit, sum deposits from individual actions
        elif "actions" in tx and tx["actions"]:
            for action in tx["actions"]:
                if "deposit" in action and action["deposit"] is not None:
                    deposit = float(action["deposit"])
                    totalVolume += deposit
    
    # Convert from yoctoNEAR (10^-24 NEAR) to NEAR
    totalVolumeNear = totalVolume / (10**24)
    
    print(f"Total volume: {totalVolumeNear:.6f} NEAR")
    return totalVolumeNear

def countContractInteractions(transactionData):
    """
    Counts the number of contract interactions from transaction data.
    
    Args:
        transactionData (dict): Transaction data from the API
        
    Returns:
        int: Number of contract interactions
    """
    contractInteractions = 0
    transactions = transactionData.get("transactions", [])
    
    for tx in transactions:
        # Check for function calls in actions
        if "actions" in tx:
            for action in tx["actions"]:
                if action.get("action") == "FUNCTION_CALL":
                    contractInteractions += 1
    
    print(f"Contract interactions: {contractInteractions}")
    return contractInteractions

def countUniqueWallets(transactionData):
    """
    Counts the number of unique wallets interacted with from transaction data.
    
    Args:
        transactionData (dict): Transaction data from the API
        
    Returns:
        int: Number of unique wallets
    """
    uniqueWallets = set()
    accountId = transactionData.get("metadata", {}).get("account_id")
    transactions = transactionData.get("transactions", [])
    
    for tx in transactions:
        # Add predecessor account (sender)
        if "predecessor_account_id" in tx and tx["predecessor_account_id"] != accountId:
            uniqueWallets.add(tx["predecessor_account_id"])
        
        # Add receiver account
        if "receiver_account_id" in tx and tx["receiver_account_id"] != accountId:
            uniqueWallets.add(tx["receiver_account_id"])
    
    walletCount = len(uniqueWallets)
    print(f"Unique wallets: {walletCount}")
    return walletCount

def calculateOnChainRewards(transactionVolume, contractInteractions, uniqueWallets):
    """
    Calculates on-chain rewards based on metrics following the wallet-rewards.ts logic
    
    Args:
        transactionVolume (float): Total transaction volume
        contractInteractions (int): Number of contract interactions
        uniqueWallets (int): Number of unique wallets interacted with
        
    Returns:
        dict: Calculated rewards data including scores, level, and monetary value
    """
    # Define weights (same as in wallet-rewards.ts)
    weights = {
        "transactionVolume": 0.4,
        "contractInteractions": 0.4,
        "uniqueWallets": 0.2
    }
    
    # Define thresholds (same as in wallet-rewards.ts)
    thresholds = {
        "transactionVolume": 10000,
        "contractInteractions": 500,
        "uniqueWallets": 100
    }
    
    # Calculate individual scores (max 50 points total for on-chain)
    tvScore = min(transactionVolume / thresholds["transactionVolume"], 1) * weights["transactionVolume"] * 50
    ciScore = min(contractInteractions / thresholds["contractInteractions"], 1) * weights["contractInteractions"] * 50
    uwScore = min(uniqueWallets / thresholds["uniqueWallets"], 1) * weights["uniqueWallets"] * 50
    
    # Total score (max 50 points)
    totalScore = min(tvScore + ciScore + uwScore, 50)
    
    # Convert to scale of 100 for level determination
    normalizedScore = totalScore * 2
    
    # Determine level based on github-rewards.ts logic
    level = determineLevel(normalizedScore)
    
    # Calculate monetary reward based on cli.ts logic
    weeklyReward = calculateMonetaryReward(normalizedScore)
    
    print(f"\nOn-Chain Rewards Calculation:")
    print(f"Transaction Volume Score: {tvScore:.2f}/20 points")
    print(f"Contract Interactions Score: {ciScore:.2f}/20 points")
    print(f"Unique Wallets Score: {uwScore:.2f}/10 points")
    print(f"Total On-Chain Score: {totalScore:.2f}/50 points (Normalized: {normalizedScore:.2f}/100)")
    print(f"Level: {level['name']}")
    print(f"Weekly Reward: ${weeklyReward:,}")
    
    return {
        "score": {
            "total": totalScore,
            "normalized": normalizedScore,
            "breakdown": {
                "transactionVolume": tvScore,
                "contractInteractions": ciScore,
                "uniqueWallets": uwScore
            }
        },
        "level": level,
        "weeklyReward": weeklyReward
    }

def determineLevel(score):
    """
    Determines the reward level based on the score, following github-rewards.ts logic
    
    Args:
        score (float): Normalized score (0-100)
        
    Returns:
        dict: Level information including name, min/max scores, and color
    """
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

def calculateMonetaryReward(score):
    """
    Calculates monetary reward based on score, following cli.ts logic
    
    Args:
        score (float): Normalized score (0-100)
        
    Returns:
        int: Weekly monetary reward in USD
    """
    if score >= 90:
        return 2500    # Diamond:  $2,500/week
    elif score >= 80:
        return 2000    # Platinum: $2,000/week
    elif score >= 70:
        return 1500    # Gold:     $1,500/week
    elif score >= 60:
        return 1000    # Silver:   $1,000/week
    else:
        return 500     # Bronze:   $500/week

def lambda_handler(event, context):
    """
    AWS Lambda handler function to process NEAR on-chain metrics and save to S3
    
    Args:
        event (dict): AWS Lambda event object
        context (object): AWS Lambda context object
        
    Returns:
        dict: Lambda response with processing status
    """
    try:
        # Get API key from environment variable or event
        API_KEY = os.environ.get("NEARBLOCKS_API_KEY", "YOUR_API_KEY_HERE")
        
        # Lista de carteiras para processar
        wallet_list = [
            "WALLET_ID",
            "WALLET_ID",
            "WALLET_ID",
        ]
        
        # Use carteiras da lista ou de event se fornecido
        if event.get("wallets"):
            wallet_list = event.get("wallets")
        
        # Get current date or from event
        current_date = datetime.now()
        YEAR = event.get("year", current_date.year)
        MONTH = event.get("month", current_date.month)
        
        print(f"Processing on-chain metrics for {len(wallet_list)} wallets for {YEAR}-{MONTH:02}")
        
        # Array para armazenar todos os resultados
        all_results = []
        
        # Processar cada carteira
        for account_id in wallet_list:
            print(f"\n----- Processing wallet: {account_id} -----")
            
            try:
                # Fetch transaction data
                transactionData = fetchTransactionData(account_id, API_KEY)
                
                # Calculate metrics
                totalVolume = calculateTotalVolume(transactionData)
                contractInteractions = countContractInteractions(transactionData)
                uniqueWallets = countUniqueWallets(transactionData)
                
                # Calculate rewards
                rewards = calculateOnChainRewards(totalVolume, contractInteractions, uniqueWallets)
                
                # Adicionar resultado desta carteira ao array
                wallet_result = {
                    "wallet": account_id,
                    "period": {
                        "start_date": transactionData["metadata"]["period"]["start_date"],
                        "end_date": transactionData["metadata"]["period"]["end_date"]
                    },
                    "timestamp": datetime.now().isoformat(),
                    "metrics_onchain": {
                        "transaction_volume": totalVolume,
                        "contract_interactions": contractInteractions,
                        "unique_wallets": uniqueWallets
                    },
                    "rewards_onchain": {
                        "score": rewards["score"],
                        "level": rewards["level"],
                        "weekly_reward": rewards["weeklyReward"]
                    },
                    "rawdata_near": transactionData
                }
                
                all_results.append(wallet_result)
                print(f"Successfully processed wallet: {account_id}")
                
            except Exception as e:
                print(f"Error processing wallet {account_id}: {str(e)}")
                # Adicionar carteira com erro
                all_results.append({
                    "wallet": account_id,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
        
        print(f"\nCompleted processing {len(all_results)} wallets")
        
        # Save results to S3
        s3 = boto3.client("s3")
        bucket_name = "near-protocol-rewards-data-dashboard"
        
        # Primeiro arquivo: Dados consolidados do mês
        monthly_file_key = f"rewards/onchain_metrics_{YEAR}_{MONTH:02}_onchain.json"
        
        # Segundo arquivo: Dados históricos diários
        current_day = datetime.now().day
        daily_file_key = f"historical/onchain_metrics_{YEAR}_{MONTH:02}_{current_day:02}_onchain.json"
        
        # Convert results to JSON string
        results_json = json.dumps(all_results, ensure_ascii=False, indent=2)
        
        # Upload para o arquivo mensal
        s3.put_object(
            Bucket=bucket_name,
            Key=monthly_file_key,
            Body=results_json,
            ContentType="application/json"
        )
        
        # Upload para o arquivo diário
        s3.put_object(
            Bucket=bucket_name,
            Key=daily_file_key,
            Body=results_json,
            ContentType="application/json"
        )
        
        print(f"Results saved to S3:")
        print(f"Monthly file: s3://{bucket_name}/{monthly_file_key}")
        print(f"Daily file: s3://{bucket_name}/{daily_file_key}")
        print(f"Total wallets processed: {len(all_results)}")
        print(f"Successfully processed wallets: {len([w for w in all_results if 'error' not in w])}")
        print(f"Failed wallets: {len([w for w in all_results if 'error' in w])}")
        
        return {
            "statusCode": 200,
            "body": {
                "message": "On-chain metrics processed successfully for all wallets",
                "s3_locations": {
                    "monthly": f"s3://{bucket_name}/{monthly_file_key}",
                    "daily": f"s3://{bucket_name}/{daily_file_key}"
                },
                "wallets_processed": len(all_results),
                "successful_wallets": len([w for w in all_results if 'error' not in w]),
                "failed_wallets": len([w for w in all_results if 'error' in w]),
                "period": f"{YEAR}-{MONTH:02}"
            }
        }
        
    except Exception as e:
        print(f"Error processing on-chain metrics: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "message": f"Error processing on-chain metrics: {str(e)}"
            }
        }

if __name__ == "__main__":
    # For local testing
    test_event = {
        "year": 2025,
        "month": 4
    }
    lambda_handler(test_event, None)
