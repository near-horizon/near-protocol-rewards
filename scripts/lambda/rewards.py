from typing import Dict, Any

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
        return 10000  # Diamond: $10,000
    elif score >= 80:
        return 8000   # Platinum: $8,000
    elif score >= 70:
        return 6000   # Gold: $6,000
    elif score >= 60:
        return 4000   # Silver: $4,000
    elif score >= 50:
        return 2000   # Bronze: $2,000
    elif score >= 25:
        return 1000   # Bronze: $1,000
    else:
        return 0      # Member: $0

def calculate_total_rewards(rewards_onchain: Dict[str, Any], rewards_offchain: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates total rewards by combining on-chain and off-chain metrics."""
    print("\n🧮 Calculando recompensas totais (onchain + offchain):")
    
    # If there's no onchain or offchain data, return only what's available
    if not rewards_onchain and rewards_offchain:
        print("   - Apenas dados off-chain disponíveis")
        return rewards_offchain
    elif rewards_onchain and not rewards_offchain:
        print("   - Apenas dados on-chain disponíveis")
        return rewards_onchain
    
    # Get individual scores
    onchain_score = rewards_onchain.get("score", {}).get("total", 0) if rewards_onchain else 0
    offchain_score = rewards_offchain.get("score", {}).get("total", 0) if rewards_offchain else 0
    
    print(f"   - Pontuação on-chain: {onchain_score}")
    print(f"   - Pontuação off-chain: {offchain_score}")
    
    # Sum both scores
    total_score = onchain_score + offchain_score
    print(f"   - Pontuação total combinada: {total_score}")
    
    # Determine level and reward based on total score
    level = determine_level(total_score)
    total_reward = calculate_monetary_reward(total_score)
    
    print(f"   - Nível atingido: {level['name']}")
    print(f"   - Recompensa total: ${total_reward}")
    
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