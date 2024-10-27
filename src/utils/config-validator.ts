import { SDKConfig } from '../sdk';
import { ValidationResult } from '../types';

export function validateConfig(config: SDKConfig): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!config.projectId) errors.push('projectId is required');
  if (!config.nearAccount) errors.push('nearAccount is required');
  if (!config.githubRepo) errors.push('githubRepo is required');
  if (!config.githubToken) errors.push('githubToken is required');
  
  // Format validation
  if (config.githubRepo && !config.githubRepo.includes('/')) {
    errors.push('githubRepo must be in format owner/repo');
  }
  
  if (config.nearAccount && !config.nearAccount.endsWith('.near')) {
    errors.push('nearAccount must end with .near');
  }
  
  // Storage config validation
  if (config.storage && config.storage.type === 'postgres') {
    const { host, port, database, user, password } = config.storage.config;
    if (!host || !port || !database || !user || !password) {
      errors.push('Invalid postgres configuration');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.map(message => ({
      code: 'CONFIG_ERROR',
      message
    })),
    warnings: [],
    timestamp: Date.now(),
    metadata: {
      source: 'sdk' as const,
      validationType: 'config' as const
    }
  };
}
