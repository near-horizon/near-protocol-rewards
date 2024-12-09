import { jest } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';
import fs from 'fs';
import path from 'path';
import { program } from '../../src/cli';
import { ConsoleLogger } from '../../src/utils/logger';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  ConsoleLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

// Mock fs and path
jest.mock('fs');
jest.mock('path');

describe('CLI', () => {
  let logger: jest.Mocked<ConsoleLogger>;
  let mockExit: SpyInstance<(code?: number) => never>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger mock
    logger = new ConsoleLogger() as jest.Mocked<ConsoleLogger>;

    // Mock process.exit with correct SpyInstance typing
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/fake/path');

    // Correctly type and mock path.join
    const mockedJoin = path.join as jest.MockedFunction<typeof path.join>;
    mockedJoin.mockImplementation((...args: string[]) => args.join('/'));

    // Clear environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init command', () => {
    it('should create workflow directory and file', async () => {
      // Mock fs functions
      (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);

      await program.parseAsync(['node', 'test', 'init']);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/fake/path/.github/workflows',
        { recursive: true }
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path/.github/workflows/near-rewards.yml',
        expect.stringContaining('name: NEAR Protocol Rewards Tracking')
      );

      expect(logger.info).toHaveBeenCalledWith('✅ Created GitHub Action workflow');
    });

    it('should handle initialization errors', async () => {
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create directory');
      });

      await program.parseAsync(['node', 'test', 'init']);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize:',
        { message: 'Failed to create directory' }
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});