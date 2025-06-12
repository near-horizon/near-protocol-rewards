import { OnChainRewardsCalculator } from '../../../src/calculator/wallet-rewards';

// Test suite for OnChainRewardsCalculator
describe('OnChainRewardsCalculator', () => {
  it('should return 0 points for no volume', () => {
    const metrics = {
      transactionVolume: 0,
      contractInteractions: 0,
      uniqueWallets: 0
    };
    const calculator = new OnChainRewardsCalculator(metrics);
    const rewards = calculator.calculate();

    expect(rewards.totalScore).toBe(0);
    expect(rewards.breakdown.transactionVolume).toBe(0);
    expect(rewards.breakdown.contractInteractions).toBe(0);
    expect(rewards.breakdown.uniqueWallets).toBe(0);
  });

  it('should return intermediate points for medium volume', () => {
    const metrics = {
      transactionVolume: 5000,
      contractInteractions: 250,
      uniqueWallets: 50
    };
    const calculator = new OnChainRewardsCalculator(metrics);
    const rewards = calculator.calculate();

    expect(rewards.totalScore).toBeGreaterThan(0);
    expect(rewards.breakdown.transactionVolume).toBeGreaterThan(0);
    expect(rewards.breakdown.contractInteractions).toBeGreaterThan(0);
    expect(rewards.breakdown.uniqueWallets).toBeGreaterThan(0);
  });

  it('should return maximum points for maximum volume', () => {
    const metrics = {
      transactionVolume: 10000,
      contractInteractions: 500,
      uniqueWallets: 100
    };
    const calculator = new OnChainRewardsCalculator(metrics);
    const rewards = calculator.calculate();

    expect(rewards.totalScore).toBe(50);
    expect(rewards.breakdown.transactionVolume).toBe(20);
    expect(rewards.breakdown.contractInteractions).toBe(20);
    expect(rewards.breakdown.uniqueWallets).toBe(10);
  });
}); 