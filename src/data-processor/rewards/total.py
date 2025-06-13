from typing import Dict, Any
from .level import determineLevel
from .monetary import calculateMonetaryReward

def calculateTotalRewards(rewards_onchain: Dict[str, Any], rewards_offchain: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates total rewards by combining on-chain and off-chain metrics."""
    print("\n🧮 Calculating total rewards (onchain + offchain):")
    
    # If there are no onchain or offchain data, returns only what is available
    if not rewards_onchain and rewards_offchain:
        print("   - Only off-chain data available")
        return rewards_offchain
    elif rewards_onchain and not rewards_offchain:
        print("   - Only on-chain data available")
        return rewards_onchain
    
    # Get individual scores
    onchain_score = rewards_onchain.get("score", {}).get("total", 0) if rewards_onchain else 0
    offchain_score = rewards_offchain.get("score", {}).get("total", 0) if rewards_offchain else 0
    
    print(f"   - On-chain score: {onchain_score}")
    print(f"   - Off-chain score: {offchain_score}")
    
    # Sum both scores
    total_score = onchain_score + offchain_score
    print(f"   - Combined total score: {total_score}")
    
    # Determine level and reward based on total score
    level = determineLevel(total_score)
    total_reward = calculateMonetaryReward(total_score)
    
    print(f"   - Level achieved: {level['name']}")
    print(f"   - Total reward: ${total_reward}")
    
    # Create return structure
    return {
        "score": {
            "total": total_score,
            "breakdown": {
                "onchain": onchain_score,
                "offchain": offchain_score
            }
        },
        "level": level,
        "total_reward": total_reward
    } 