import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { program } from '../../src/cli';
import type { ProcessedMetrics } from '../../src/types/metrics';
import type { ValidationResult } from '../../src/types/validation';

// Define event handler types
type MetricsHandler = (metrics: ProcessedMetrics) => void;
type ErrorHandler = (error: Error) => void;
type EventHandlers = {
  'metrics:collected': MetricsHandler;
  'error': ErrorHandler;
};

// Mock fs and path
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/sdk', () => {
  const mockSDK = jest.fn(() => {
    const handlers: { [K in keyof EventHandlers]?: EventHandlers[K] } = {};
    return {
      on: jest.fn((event: keyof EventHandlers, handler: EventHandlers[typeof event]) => {
        if (event === 'metrics:collected') {
          handlers['metrics:collected'] = handler as MetricsHandler;
        } else if (event === 'error') {
          handlers['error'] = handler as ErrorHandler;
        }
      }),
      startTracking: jest.fn(() => Promise.resolve()),
      getMetrics: jest.fn(() => {
        const now = Date.now();
        const metrics: ProcessedMetrics = {
          github: {
            commits: {
              count: 10,
              frequency: {
                daily: [1, 2, 3, 4, 5],
                weekly: 10,
                monthly: 40
              },
              authors: [
                { login: 'user1', count: 5 },
                { login: 'user2', count: 5 }
              ]
            },
            pullRequests: {
              open: 2,
              merged: 5,
              closed: 1,
              authors: ['user1', 'user2']
            },
            reviews: {
              count: 3,
              authors: ['user1', 'user2']
            },
            issues: {
              open: 1,
              closed: 2,
              participants: ['user1', 'user2']
            },
            metadata: {
              collectionTimestamp: now,
              source: 'github',
              projectId: 'test'
            }
          },
          score: {
            total: 0,
            breakdown: {
              commits: 0,
              pullRequests: 0,
              reviews: 0,
              issues: 0
            }
          },
          timestamp: now,
          collectionTimestamp: now,
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            timestamp: now,
            metadata: {
              source: 'github',
              validationType: 'data'
            }
          },
          metadata: {
            source: 'github',
            projectId: 'test',
            collectionTimestamp: now,
            periodStart: now - 7 * 24 * 60 * 60 * 1000,
            periodEnd: now
          },
          periodStart: now - 7 * 24 * 60 * 60 * 1000,
          periodEnd: now
        };
        
        // Call the metrics:collected handler
        const metricsHandler = handlers['metrics:collected'];
        if (metricsHandler) {
          metricsHandler(metrics);
        }
        
        return Promise.resolve(metrics);
      }),
      stopTracking: jest.fn(() => Promise.resolve())
    };
  });

  return { GitHubRewardsSDK: mockSDK };
});

describe('CLI', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock process.cwd()
    (process.cwd as jest.Mock) = jest.fn().mockReturnValue('/fake/path');
    
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Clear environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  describe('init command', () => {
    it('should create workflow directory and file', async () => {
      // Mock fs functions
      (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
      
      // Simulate running init command
      await program.parseAsync(['node', 'test', 'init']);
      
      // Check if directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/fake/path/.github/workflows',
        { recursive: true }
      );
      
      // Check if workflow file was created
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path/.github/workflows/near-rewards.yml',
        expect.stringContaining('name: NEAR Protocol Rewards Tracking')
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock fs error
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create directory');
      });
      
      // Mock console.error and process.exit
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      // Run init command
      await program.parseAsync(['node', 'test', 'init']);
      
      // Verify error handling
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to initialize:',
        expect.any(Error)
      );
      expect(processExit).toHaveBeenCalledWith(1);
    });
  });

  describe('track command', () => {
    it('should validate environment variables', async () => {
      // Mock console.error and process.exit
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      // Run track command without env variables
      await program.parseAsync(['node', 'test', 'track']);
      
      // Verify validation
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to track metrics:',
        expect.any(Error)
      );
      expect(processExit).toHaveBeenCalledWith(1);
    });

    it('should track metrics successfully', async () => {
      // Mock environment variables
      process.env.GITHUB_TOKEN = 'fake-token';
      process.env.GITHUB_REPO = 'fake/repo';
      
      // Mock console.log
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Run track command
      await program.parseAsync(['node', 'test', 'track']);
      
      // Verify success messages
      expect(consoleLog).toHaveBeenCalledWith('📊 Metrics collected:', {
        commits: 10,
        prs: 5,
        reviews: 3,
        issues: 2
      });
      expect(consoleLog).toHaveBeenCalledWith('✅ Metrics collection complete');
    });
  });
}); 