export interface OnChainMetrics {
  transactionVolume: number; 
  contractInteractions: number;
  uniqueWallets: number;
}

export interface OnChainScoreBreakdown {
  transactionVolume: number;
  contractInteractions: number;
  uniqueWallets: number;
}

export interface OnChainRewards {
  totalScore: number; // Máximo 50
  breakdown: OnChainScoreBreakdown;
}

export class OnChainRewardsCalculator {
  private readonly weights = {
    transactionVolume: 0.4,             
    contractInteractions: 0.4,          
    uniqueWallets: 0.2,                 
  };

  private readonly thresholds = {
    transactionVolume: 10000,           
    contractInteractions: 500,
    uniqueWallets: 100,
  };

  constructor(private readonly metrics: OnChainMetrics) {}

  calculate(): OnChainRewards {
    const tvScore = Math.min(this.metrics.transactionVolume / this.thresholds.transactionVolume, 1) * this.weights.transactionVolume * 50;
    const ciScore = Math.min(this.metrics.contractInteractions / this.thresholds.contractInteractions, 1) * this.weights.contractInteractions * 50;
    const uwScore = Math.min(this.metrics.uniqueWallets / this.thresholds.uniqueWallets, 1) * this.weights.uniqueWallets * 50;

    const totalScore = Math.min(tvScore + ciScore + uwScore, 50);

    return {
      totalScore,
      breakdown: {
        transactionVolume: tvScore,
        contractInteractions: ciScore,
        uniqueWallets: uwScore,
      },
    };
  }
}
