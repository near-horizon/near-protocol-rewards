def calculateMonetaryReward(score: float) -> int:
    """Calculates the monetary reward based on the score."""
    if score >= 85:
        return 10000  # Diamond: $10,000
    elif score >= 70:
        return 6000   # Gold: $6,000
    elif score >= 55:
        return 3000   # Silver: $3,000
    elif score >= 40:
        return 1000   # Bronze: $1,000
    elif score >= 20:
        return 500    # Contributor: $500
    elif score >= 1:
        return 100    # Explorer: $100
    else:
        return 0      # No Tier: $0 