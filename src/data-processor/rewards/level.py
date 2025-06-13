from typing import Dict, Any

def determineLevel(score: float) -> Dict[str, Any]:
    """Determines the level based on the score."""
    if score >= 85:
        return {"name": "Diamond", "minScore": 85, "maxScore": 100, "color": "#B9F2FF"}
    elif score >= 70:
        return {"name": "Gold", "minScore": 70, "maxScore": 84, "color": "#FFD700"}
    elif score >= 55:
        return {"name": "Silver", "minScore": 55, "maxScore": 69, "color": "#C0C0C0"}
    elif score >= 40:
        return {"name": "Bronze", "minScore": 40, "maxScore": 54, "color": "#CD7F32"}
    elif score >= 20:
        return {"name": "Contributor", "minScore": 20, "maxScore": 39, "color": "#A4A4A4"}
    elif score >= 1:
        return {"name": "Explorer", "minScore": 1, "maxScore": 19, "color": "#808080"}
    else:
        return {"name": "No Tier", "minScore": 0, "maxScore": 0, "color": "#000000"} 