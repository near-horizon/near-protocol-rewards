"""
On-chain scoring calculator for Cohort 2.

This module calculates scores based on NEAR blockchain metrics following the new scoring guidelines:
- Total: 20 points (20% weight)
- Transaction Volume: 8 points (threshold: $10,000+)
- Smart Contract Calls: 8 points (threshold: 500+ calls)
- Unique Wallets: 4 points (threshold: 100+ distinct wallets)
"""

from typing import Dict, Any


def calculateOnchainScore(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate on-chain score based on NEAR blockchain metrics.
    
    Args:
        metrics: Dictionary containing on-chain metrics
        
    Returns:
        Dictionary with calculated scores and breakdown
    """
    print("\n🔗 Calculating on-chain score (NEAR blockchain metrics):")
    
    # Define thresholds and max points for each component
    thresholds = {
        "transactionVolume": 10000,   # $10,000+ for max points
        "contractCalls": 500,         # 500+ calls for max points
        "uniqueWallets": 100          # 100+ distinct wallets for max points
    }
    
    max_points = {
        "transactionVolume": 8,       # Max 8 points
        "contractCalls": 8,           # Max 8 points
        "uniqueWallets": 4            # Max 4 points
    }
    
    # Extract metrics from data
    # Transaction volume (combine NEAR and USDC volumes, convert to USD)
    transaction_volume = metrics.get("transaction_volume", {})
    near_volume = transaction_volume.get("total_volume_near", 0)
    usdc_volume = transaction_volume.get("total_volume_usdc", 0)
    
    # Assume NEAR price at $5 for volume calculation (can be made configurable)
    near_price_usd = 5.0
    total_volume_usd = (near_volume * near_price_usd) + usdc_volume
    
    # Smart contract calls
    smart_contracts = metrics.get("smart_contracts", {})
    contract_calls = smart_contracts.get("unique_contract_calls", 0)
    
    # Unique wallets
    unique_wallets = metrics.get("unique_wallets", {})
    wallet_count = unique_wallets.get("unique_wallets", 0)
    
    print(f"   - Transaction Volume: ${total_volume_usd:.2f} (NEAR: {near_volume:.6f}, USDC: {usdc_volume:.2f})")
    print(f"   - Smart Contract Calls: {contract_calls}")
    print(f"   - Unique Wallets: {wallet_count}")
    
    # Calculate scores with proper scaling
    volume_score = min(total_volume_usd / thresholds["transactionVolume"], 1.0) * max_points["transactionVolume"]
    contract_score = min(contract_calls / thresholds["contractCalls"], 1.0) * max_points["contractCalls"]
    wallet_score = min(wallet_count / thresholds["uniqueWallets"], 1.0) * max_points["uniqueWallets"]
    
    # Calculate total score (max 20 points)
    total_score = volume_score + contract_score + wallet_score
    
    print(f"   - Volume score: {volume_score:.2f}/{max_points['transactionVolume']}")
    print(f"   - Contract score: {contract_score:.2f}/{max_points['contractCalls']}")
    print(f"   - Wallet score: {wallet_score:.2f}/{max_points['uniqueWallets']}")
    print(f"   - Total on-chain score: {total_score:.2f}/20")
    
    return {
        "score": {
            "total": round(total_score, 2),
            "breakdown": {
                "transactionVolume": round(volume_score, 2),
                "contractCalls": round(contract_score, 2),
                "uniqueWallets": round(wallet_score, 2)
            }
        },
        "thresholds": thresholds,
        "maxPoints": max_points,
        "totalVolumeUSD": round(total_volume_usd, 2)
    } 