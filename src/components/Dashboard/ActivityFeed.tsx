import React from 'react';
import { motion } from 'framer-motion';
import { CodeIcon, CurrencyDollarIcon, StarIcon } from '@heroicons/react/solid';

interface Activity {
  id: string;
  type: 'commit' | 'transaction' | 'reward';
  title: string;
  timestamp: string;
  details: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  error?: Error;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities, 
  loading,
  error 
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
        <div className="text-center text-red-500 dark:text-red-400">
          <p className="font-medium">Failed to load activities</p>
          <p className="text-sm mt-1">{error.message}</p>
          <button 
            className="mt-4 px-4 py-2 bg-near-red/10 text-near-red rounded-lg hover:bg-near-red/20 transition-colors"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">No Recent Activity</p>
          <p className="text-sm mt-1">Activity will appear here as it happens</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'commit':
        return <CodeIcon className="w-5 h-5 text-near-purple" />;
      case 'transaction':
        return <CurrencyDollarIcon className="w-5 h-5 text-near-blue" />;
      case 'reward':
        return <StarIcon className="w-5 h-5 text-near-green" />;
    }
  };

  return (
    <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
      <h3 className="font-fk-grotesk font-medium text-lg text-near-black dark:text-near-white mb-6">
        Recent Activity
      </h3>
      <div className="space-y-6">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-4 group"
          >
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-fk-grotesk font-medium text-near-black dark:text-near-white truncate">
                {activity.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                {activity.details}
              </p>
              <time className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                {activity.timestamp}
              </time>
            </div>
            <motion.div 
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              whileHover={{ scale: 1.1 }}
            >
              <button 
                className="text-gray-400 hover:text-near-green dark:text-gray-500 dark:hover:text-near-green"
                aria-label="View details"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
