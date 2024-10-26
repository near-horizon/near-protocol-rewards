import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationIcon, XCircleIcon } from '@heroicons/react/solid';

interface Integration {
  name: string;
  status: 'connected' | 'pending' | 'error';
  lastSync?: string;
  error?: string;
}

interface IntegrationStatusProps {
  integrations: Integration[];
  loading?: boolean;
  onRetry?: () => void;
}

export const IntegrationStatus: React.FC<IntegrationStatusProps> = ({ 
  integrations,
  loading,
  onRetry 
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-near-green" />;
      case 'pending':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-5 h-5 text-near-purple" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </motion.div>
        );
      case 'error':
        return <ExclamationIcon className="w-5 h-5 text-near-red" />;
    }
  };

  return (
    <div className="bg-white dark:bg-near-black rounded-xl p-6 shadow-near">
      <h3 className="font-fk-grotesk font-medium text-lg text-near-black dark:text-near-white mb-6">
        Integration Status
      </h3>
      <div className="space-y-4">
        {integrations.map((integration) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(integration.status)}
              <span className="font-fk-grotesk font-medium text-near-black dark:text-near-white">
                {integration.name}
              </span>
            </div>
            <div className="text-sm">
              {integration.status === 'error' ? (
                <button
                  onClick={onRetry}
                  className="text-near-red hover:text-near-red/80 transition-colors"
                >
                  {integration.error || 'Retry'}
                </button>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  {integration.lastSync && `Last sync: ${integration.lastSync}`}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
