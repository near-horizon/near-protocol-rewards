from typing import Dict, Any
from .level import determineLevel
from .monetary import calculateMonetaryReward
from .offchain_scorer import calculateOffchainScore
from .onchain_scorer import calculateOnchainScore

def calculateTotalRewards(onchain_metrics: Dict[str, Any], offchain_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates total rewards by combining on-chain and off-chain metrics using Cohort scoring.
    
    Cohort Scoring:
    - Off-chain (GitHub): 80 points (80% weight)
    - On-chain (NEAR): 20 points (20% weight)
    - Total: 100 points
    """
    print("\n🧮 Calculating total rewards (Cohort - onchain + offchain):")
    
    onchain_score = 0
    offchain_score = 0
    onchain_details = {}
    offchain_details = {}
    
    # Calculate off-chain score if data is available
    if offchain_metrics:
        print("📱 Processing off-chain GitHub metrics...")
        offchain_result = calculateOffchainScore(offchain_metrics)
        offchain_score = offchain_result.get("score", {}).get("total", 0)
        offchain_details = offchain_result
    else:
        print("   - No off-chain data available")
    
    # Calculate on-chain score if data is available
    if onchain_metrics:
        print("🔗 Processing on-chain NEAR metrics...")
        onchain_result = calculateOnchainScore(onchain_metrics)
        onchain_score = onchain_result.get("score", {}).get("total", 0)
        onchain_details = onchain_result
    else:
        print("   - No on-chain data available")
    
    print(f"\n📊 Score Summary:")
    print(f"   - Off-chain score: {offchain_score}/80 ({(offchain_score/80)*100:.1f}%)")
    print(f"   - On-chain score: {onchain_score}/20 ({(onchain_score/20)*100:.1f}%)")
    
    # Sum both scores (max 100 points total)
    total_score = onchain_score + offchain_score
    print(f"   - Combined total score: {total_score}/100 ({total_score:.1f}%)")
    
    # Determine level and reward based on total score
    level = determineLevel(total_score)
    total_reward = calculateMonetaryReward(total_score)
    
    print(f"\n🏆 Final Results:")
    print(f"   - Level achieved: {level['name']}")
    print(f"   - Total reward: ${total_reward:,}")
    
    # Create comprehensive return structure
    return {
        "score": {
            "total": round(total_score, 2),
            "breakdown": {
                "onchain": round(onchain_score, 2),
                "offchain": round(offchain_score, 2)
            }
        },
        "level": level,
        "total_reward": total_reward,
        "details": {
            "offchain": offchain_details,
            "onchain": onchain_details
        }
    } 