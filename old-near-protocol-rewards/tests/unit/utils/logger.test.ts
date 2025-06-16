import { ConsoleLogger } from '../../../src/utils/logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set default level to info', () => {
      logger = new ConsoleLogger();
      expect(logger.level).toBe('info');
    });

    it('should set custom level', () => {
      logger = new ConsoleLogger('debug');
      expect(logger.level).toBe('debug');
    });
  });

  describe('shouldLog', () => {
    beforeEach(() => {
      logger = new ConsoleLogger('info');
    });

    it('should return true for levels with equal or higher priority', () => {
      expect(logger.shouldLog('error')).toBe(true);
      expect(logger.shouldLog('warn')).toBe(true);
      expect(logger.shouldLog('info')).toBe(true);
    });

    it('should return false for levels with lower priority', () => {
      expect(logger.shouldLog('debug')).toBe(false);
    });
  });

  describe('logging methods', () => {
    describe('with info level', () => {
      beforeEach(() => {
        logger = new ConsoleLogger('info');
      });

      it('should log info messages', () => {
        const message = 'test info';
        const context = { key: 'value' };
        
        logger.info(message);
        expect(consoleInfoSpy).toHaveBeenCalledWith(message);
        
        logger.info(message, context);
        expect(consoleInfoSpy).toHaveBeenCalledWith(message, context);
      });

      it('should log warn messages', () => {
        const message = 'test warning';
        const context = { key: 'value' };
        logger.warn(message, context);
        expect(consoleWarnSpy).toHaveBeenCalledWith(message, context);
      });

      it('should log error messages', () => {
        const message = 'test error';
        const context = { key: 'value' };
        logger.error(message, context);
        expect(consoleErrorSpy).toHaveBeenCalledWith(message, context);
      });

      it('should not log debug messages', () => {
        const message = 'test debug';
        const context = { key: 'value' };
        logger.debug(message, context);
        expect(consoleDebugSpy).not.toHaveBeenCalled();
      });
    });

    describe('with debug level', () => {
      beforeEach(() => {
        logger = new ConsoleLogger('debug');
      });

      it('should log debug messages', () => {
        const message = 'test debug';
        const context = { key: 'value' };
        logger.debug(message, context);
        expect(consoleDebugSpy).toHaveBeenCalledWith(message, context);
      });
    });

    describe('with warn level', () => {
      beforeEach(() => {
        logger = new ConsoleLogger('warn');
      });

      it('should not log info messages', () => {
        const message = 'test info';
        const context = { key: 'value' };
        logger.info(message, context);
        expect(consoleInfoSpy).not.toHaveBeenCalled();
      });
    });

    describe('with error level', () => {
      beforeEach(() => {
        logger = new ConsoleLogger('error');
      });

      it('should only log error messages', () => {
        const message = 'test message';
        const context = { key: 'value' };
        
        logger.debug(message, context);
        logger.info(message, context);
        logger.warn(message, context);
        logger.error(message, context);

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(message, context);
      });
    });
  });
}); 