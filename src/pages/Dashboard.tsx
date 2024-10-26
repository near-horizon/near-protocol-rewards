import React from 'react';
import { DashboardLayout } from '../components/Dashboard/Layout';
import { MetricsCard } from '../components/Dashboard/MetricsCard';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import { IntegrationStatus } from '../components/Dashboard/IntegrationStatus';
import { useDashboard } from '../hooks/useDashboard';
import { SDKConfig } from '../types';

// You'll want to get this from your environment or configuration
const sdkConfig: SDKConfig = {
  projectId: process.env.REACT_APP_PROJECT_ID!,
  nearAccount: process.env.REACT_APP_NEAR_ACCOUNT!,
  githubRepo: process.env.REACT_APP_GITHUB_REPO!,
  githubToken: process.env.REACT_APP_GITHUB_TOKEN!,
};

export const Dashboard: React.FC = () => {
  const { 
    metrics, 
    activities, 
    integrations, 
    loading, 
    error, 
    refresh 
  } = useDashboard(sdkConfig);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  const getMetricsTrendData = (values: number[], count: number = 7) => {
    return [...Array(count)].map((_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      value: values[i] || 0,
    }));
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <MetricsCard 
          title="GitHub Activity"
          value={`${metrics.github.commits.count} commits`}
          change={5.2} // You'll want to calculate this
          data={getMetricsTrendData([/* historical commit counts */])}
        />
        <MetricsCard 
          title="NEAR Transactions"
          value={metrics.near.transactions.count.toString()}
          change={12.5} // You'll want to calculate this
          data={getMetricsTrendData([/* historical transaction counts */])}
        />
        <MetricsCard 
          title="Contract Calls"
          value={metrics.near.contracts.calls.toString()}
          change={-2.1} // You'll want to calculate this
          data={getMetricsTrendData([/* historical contract call counts */])}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>
        <div>
          <IntegrationStatus integrations={integrations} />
        </div>
      </div>
    </DashboardLayout>
  );
};
