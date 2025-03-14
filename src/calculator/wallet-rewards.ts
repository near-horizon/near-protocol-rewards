import { WalletActivity } from '../types/metrics';

export interface WalletRewards {
  totalTransactions: number;
  incomingTransactions: number;
  outgoingTransactions: number;
  lastActivity: Date;
  score: number;
}

export class WalletRewardsCalculator {
  private activities: WalletActivity[];

  constructor(activities: WalletActivity[]) {
    this.activities = activities;
  }

  calculate(): WalletRewards {
    const rewards: WalletRewards = {
      totalTransactions: 0,
      incomingTransactions: 0,
      outgoingTransactions: 0,
      lastActivity: new Date(0),
      score: 0,
    };

    for (const activity of this.activities) {
      rewards.totalTransactions++;
      
      if (activity.type === 'incoming') {
        rewards.incomingTransactions++;
      } else {
        rewards.outgoingTransactions++;
      }

      const activityDate = new Date(activity.timestamp * 1000);
      if (activityDate > rewards.lastActivity) {
        rewards.lastActivity = activityDate;
      }
    }

    rewards.score = rewards.totalTransactions * 10 + 
                   rewards.incomingTransactions * 5 + 
                   rewards.outgoingTransactions * 15;

    return rewards;
  }

  logRewards(): void {
    const rewards = this.calculate();
    console.log('\n=== Relatório de Recompensas da Wallet ===');
    console.log(`Total de Transações: ${rewards.totalTransactions}`);
    console.log(`Transações Recebidas: ${rewards.incomingTransactions}`);
    console.log(`Transações Enviadas: ${rewards.outgoingTransactions}`);
    console.log(`Última Atividade: ${rewards.lastActivity.toLocaleString()}`);
    console.log(`Pontuação Total: ${rewards.score}`);
    console.log('=======================================\n');
  }
} 