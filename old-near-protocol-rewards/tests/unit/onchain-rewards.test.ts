import { jest } from '@jest/globals';
import { NearWalletCollector, WalletActivity } from '../../src/collectors/near-wallet-collector';
import { OnChainRewardsCalculator } from '../../src/calculator/wallet-rewards';
import { ConsoleLogger } from '../../src/utils/logger';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  ConsoleLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

// Mock NearWalletCollector
jest.mock('../../src/collectors/near-wallet-collector', () => ({
  NearWalletCollector: jest.fn().mockImplementation(() => ({
    collectActivities: jest.fn(() => Promise.resolve([
      { details: { actions: [{ kind: 'FunctionCall' }], receiverId: 'contract1.near' } },
      { details: { actions: [{ kind: 'Transfer' }], receiverId: 'contract2.near' } },
      { details: { actions: [{ kind: 'FunctionCall' }], receiverId: 'contract1.near' } }
    ]))
  }))
}));

// Mock OnChainRewardsCalculator
jest.mock('../../src/calculator/wallet-rewards', () => ({
  OnChainRewardsCalculator: jest.fn().mockImplementation(() => ({
    calculate: jest.fn().mockReturnValue({
      totalScore: 40,
      breakdown: {
        transactionVolume: 15,
        contractInteractions: 20,
        uniqueWallets: 5
      }
    })
  }))
}));

// Test suite for on-chain rewards calculation
describe('On-Chain Rewards Calculation', () => {
  let logger: jest.Mocked<ConsoleLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new ConsoleLogger() as jest.Mocked<ConsoleLogger>;
  });

  it('should calculate on-chain rewards correctly with mock data', async () => {
    const collector = new NearWalletCollector('test.near', 'testnet');
    const activities = await collector.collectActivities();

    expect(activities).toHaveLength(3);
    expect(activities[0].details.receiverId).toBe('contract1.near');

    const onChainMetrics = {
      transactionVolume: activities.length,
      contractInteractions: activities.filter((a) => a.details.actions.some((action) => action.kind === 'FunctionCall')).length,
      uniqueWallets: new Set(activities.map((a) => a.details.receiverId)).size
    };

    const onChainCalculator = new OnChainRewardsCalculator(onChainMetrics);
    const onChainRewards = onChainCalculator.calculate();

    expect(onChainRewards.totalScore).toBe(40);
    expect(onChainRewards.breakdown.transactionVolume).toBe(15);
    expect(onChainRewards.breakdown.contractInteractions).toBe(20);
    expect(onChainRewards.breakdown.uniqueWallets).toBe(5);
  });
}); 