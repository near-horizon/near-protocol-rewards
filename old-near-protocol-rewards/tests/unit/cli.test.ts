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

// Mock fs
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/')
}));

describe('CLI', () => {
  let logger: jest.Mocked<ConsoleLogger>;
  let mockExit: SpyInstance<(code?: number) => never>;
  const expectedPath = '/fake/path/.github/workflows/near-rewards.yml';
  
  beforeEach(() => {
    jest.clearAllMocks();
    logger = new ConsoleLogger() as jest.Mocked<ConsoleLogger>;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(process, 'cwd').mockReturnValue('/fake/path');
  });

  describe('init command', () => {
    it('should create workflow directory and file with correct content', async () => {
      await program.parseAsync(['node', 'test', 'init']);

      // Verify directory creation
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/fake/path/.github/workflows',
        { recursive: true }
      );

      // Verify file content
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining('calculate-rewards:')
      );

      // Verify success message
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

  describe('command validation', () => {
    it('should require environment variables for calculate', async () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPO;

      await program.parseAsync(['node', 'test', 'calculate']);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing required environment variables')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});