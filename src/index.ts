import { GitHubCollector } from './collectors/github';
import { NEARCollector } from './collectors/near';
import { Logger } from './utils/logger';
import { SDKError } from './utils/errors';
import { EventEmitter } from 'events';
import { 
  SDKConfig, 
  ProcessedMetrics, 
  MetricsCache as IMetricsCache,
  ValidationResult 
} from './types';
import { validateConfig } from './validators/schema';
import { GitHubValidator } from './validators/github';
import { NEARValidator } from './validators/near';
import { PostgresStorage } from './storage/postgres';
import { BaseError, ErrorCode } from './utils/errors';

export class NEARProtocolRewardsSDK extends EventEmitter {
  private readonly config: SDKConfig;
  private readonly logger: Logger;
  private readonly githubCollector: GitHubCollector;
  private readonly nearCollector: NEARCollector;
  private readonly githubValidator: GitHubValidator;
  private readonly nearValidator: NEARValidator;
  private readonly storage?: PostgresStorage;
  private metricsCache: IMetricsCache;
  private trackingInterval?: NodeJS.Timer;
  private readonly cleanupTasks: Array<() => Promise<void>>;

  constructor(config: SDKConfig) {
    super();
    
    // Validate configuration
    validateConfig(config);
    this.config = config;

    // Initialize logger
    this.logger = config.logger || new Logger({
      projectId: config.projectId,
      level: config.logLevel
    });

    // Initialize collectors
    this.githubCollector = new GitHubCollector({
      repo: config.githubRepo,
      token: config.githubToken,
      logger: this.logger
    });

    this.nearCollector = new NEARCollector({
      account: config.nearAccount,
      endpoint: config.nearApiEndpoint,
      logger: this.logger
    });

    // Initialize validators with thresholds
    this.githubValidator = new GitHubValidator({
      logger: this.logger,
      thresholds: config.validation?.github
    });

    this.nearValidator = new NEARValidator({
      logger: this.logger,
      thresholds: config.validation?.near
    });

    // Initialize storage if configured
    if (config.storage) {
      this.storage = new PostgresStorage({
        logger: this.logger,
        connectionConfig: config.storage.config
      });
    }

    // Initialize cache
    this.metricsCache = {
      lastUpdate: 0,
      data: null,
      ttl: 5 * 60 * 1000 // 5 minutes default
    };

    // Initialize cleanup tasks array
    this.cleanupTasks = [];

    // Setup error handling
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.on('error', (_error: Error) => {
      // Log error and attempt recovery
      this.logger.error('SDK Error occurred', { error: _error });
    });
  }

  private async handleStorageError(_error: SDKError): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.initialize();
      } catch (initError) {
        this.logger.error('Storage reinitialization failed', { error: initError });
        this.emit('error', initError);
      }
    }
  }

  public async startTracking(): Promise<void> {
    if (this.trackingInterval) {
      this.logger.warn('Tracking already started');
      return;
    }

    const interval = this.config.trackingInterval || 6 * 60 * 60 * 1000; // 6 hours default
    
    await this.collectMetrics(); // Initial collection
    this.trackingInterval = setInterval(() => this.collectMetrics(), interval);
    
    this.emit('tracking:started');
    this.logger.info('Started metrics tracking', { interval });
  }

  private async collectMetrics(): Promise<void> {
    try {
      const [githubMetrics, nearMetrics] = await Promise.all([
        this.githubCollector.collectMetrics(),
        this.nearCollector.collectMetrics()
      ]);

      const validationResult = this.githubValidator.validate(githubMetrics);
      
      if (!validationResult.isValid) {
        this.emit('validation:failed', validationResult.errors);
        return;
      }

      const processedMetrics: ProcessedMetrics = {
        timestamp: Date.now(),
        github: githubMetrics,
        near: nearMetrics,
        validation: validationResult
      };

      // Update cache
      this.metricsCache = {
        lastUpdate: Date.now(),
        data: processedMetrics,
        ttl: this.metricsCache.ttl
      };

      this.emit('metrics:collected', processedMetrics);
      
    } catch (error) {
      this.logger.error('Failed to collect metrics', { error });
      this.emit('error', error);
    }
  }

  public async cleanup(): Promise<void> {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    // Execute all cleanup tasks
    await Promise.all(this.cleanupTasks.map(task => task()));
    
    this.emit('tracking:stopped');
  }
}

// Re-export types
export type { 
  SDKConfig,
  ProcessedMetrics,
  ValidationResult 
} from './types';
