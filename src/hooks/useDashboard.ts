import { useState, useEffect } from 'react';
import { DashboardService, DashboardMetrics } from '../services/DashboardService';
import { SDKConfig } from '../types';

export function useDashboard(config: SDKConfig) {
  const [service] = useState(() => new DashboardService(config));
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: 'commit' | 'transaction' | 'reward';
    title: string;
    timestamp: string;
    details: string;
  }>>([]);
  const [integrations, setIntegrations] = useState<Array<{
    name: string;
    status: 'connected' | 'pending' | 'error';
    lastSync?: string;
    error?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await service.initialize();
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize dashboard'));
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [service]);

  const refreshData = async () => {
    try {
      const [newMetrics, newActivities, newIntegrations] = await Promise.all([
        service.getMetrics(),
        service.getActivityFeed(),
        service.getIntegrationStatus(),
      ]);

      setMetrics(newMetrics);
      setActivities(newActivities);
      setIntegrations(newIntegrations);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    }
  };

  return {
    metrics,
    activities,
    integrations,
    loading,
    error,
    refresh: refreshData,
  };
}
