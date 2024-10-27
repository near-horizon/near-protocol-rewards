import crypto from 'crypto';
import { RewardCalculation } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';

export class RewardsVerification {
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  signReward(reward: RewardCalculation): string {
    const data = `${reward.usdAmount}-${reward.nearAmount}-${reward.score}-${reward.timestamp}`;
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
    if (reward.usdAmount < 0 || reward.nearAmount < 0 || reward.score < 0) {
      throw new BaseError(
        'Invalid reward values detected',
        ErrorCode.TAMPERING_DETECTED,
        { reward }
      );
    }

    // Check timestamp is recent
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (reward.timestamp < fiveMinutesAgo) {
      throw new BaseError(
        'Reward calculation too old',
        ErrorCode.TAMPERING_DETECTED,
        { timestamp: reward.timestamp }
      );
    }
  }
}
