import crypto from 'crypto';
import { RewardCalculation } from '../types';
import { BaseError, ErrorCode } from '../types/errors';

export class RewardsVerification {
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  signReward(reward: RewardCalculation): string {
    const data = `${reward.amount}-${reward.breakdown.github}-${reward.breakdown.near}-${reward.metadata.timestamp}-${reward.metadata.periodStart}-${reward.metadata.periodEnd}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  verifyReward(reward: RewardCalculation, signature: string): boolean {
    const expectedSignature = this.signReward(reward);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validateReward(reward: RewardCalculation): void {
    // Check for reasonable values
    if (reward.amount < 0) {
      throw new BaseError(
        'Invalid reward amount detected',
        ErrorCode.VALIDATION_ERROR,
        { reward }
      );
    }

    // Check timestamp is recent
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (reward.metadata.timestamp < fiveMinutesAgo) {
      throw new BaseError(
        'Reward calculation too old',
        ErrorCode.VALIDATION_ERROR,
        { timestamp: reward.metadata.timestamp }
      );
    }
  }
}
