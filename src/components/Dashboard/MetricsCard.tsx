import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricsCardProps {
  title: string;
  value: number | string;
  change?: number;
  data: Array<{ date: string; value: number }>;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value, 
  change, 
  data,
  icon,
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded mt-4" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-fk-grotesk font-medium text-lg text-near-black dark:text-near-white">
          {title}
        </h3>
        {icon && <div className="text-near-gray-400">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-3">
        <span className="font-fk-grotesk font-semibold text-3xl text-near-black dark:text-near-white">
          {value}
        </span>
        {change !== undefined && (
          <div className={`
            flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full
            ${change >= 0 
              ? 'text-near-green bg-near-green/10' 
              : 'text-near-red bg-near-red/10'
            }
          `}>
            {change > 0 ? '↑' : '↓'}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="h-32 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#00ec97"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#00ec97' }}
            />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#878787' }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                padding: '8px 12px'
              }}
              labelStyle={{ color: '#878787' }}
              itemStyle={{ color: '#000' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
