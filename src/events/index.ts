import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export class SDKEvents extends EventEmitter {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.on('error', (error) => {
      this.logger.error('SDK event error', { error });
    });
  }
}
