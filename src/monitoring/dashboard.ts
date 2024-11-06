import { TelemetryEvent, TelemetryEventType } from '../utils/telemetry';

interface TimeRange {
  start: Date;
  end: Date;
}

interface MetricsBreakdown {
  totalInitializations: number;
  metricsCollected: number;
  rewardsCalculated: number;
  errors: number;
  averageScore: number;
  errorBreakdown: Record<string, number>;
}

export class MonitoringDashboard {
  private events: TelemetryEvent[] = [];

  async getProjectMetrics(projectId: string, timeRange: TimeRange): Promise<MetricsBreakdown> {
    const events = await this.getEvents(projectId, timeRange);
    
    return {
      totalInitializations: this.countEventType(events, 'sdk_init'),
      metricsCollected: this.countEventType(events, 'metrics_collected'),
      rewardsCalculated: this.countEventType(events, 'reward_calculated'),
      errors: this.countEventType(events, 'error'),
      averageScore: this.calculateAverageScore(events),
      errorBreakdown: this.getErrorBreakdown(events)
    };
  }

  private async getEvents(projectId: string, timeRange: TimeRange): Promise<TelemetryEvent[]> {
    return this.events.filter(event => 
      event.projectId === projectId &&
      event.timestamp >= timeRange.start.getTime() &&
      event.timestamp <= timeRange.end.getTime()
    );
  }

  private countEventType(events: TelemetryEvent[], type: TelemetryEventType): number {
    return events.filter(event => event.type === type).length;
  }

  private calculateAverageScore(events: TelemetryEvent[]): number {
    const rewardEvents = events.filter(event => event.type === 'reward_calculated');
    if (rewardEvents.length === 0) return 0;

    const totalScore = rewardEvents.reduce((acc, event) => 
      acc + (event.data.score as number || 0), 0);
    
    return totalScore / rewardEvents.length;
  }

  private getErrorBreakdown(events: TelemetryEvent[]): Record<string, number> {
    return events
      .filter(event => event.type === 'error')
      .reduce((acc, event) => {
        const code = (event.data.errorCode as string) || 'UNKNOWN';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }
} 