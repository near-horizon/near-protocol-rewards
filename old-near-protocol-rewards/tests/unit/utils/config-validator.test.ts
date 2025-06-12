import { validateConfig } from '../../../src/utils/config-validator';
import { ErrorCode } from '../../../src/types/errors';
import { SDKConfig } from '../../../src/types/sdk';

describe('validateConfig', () => {
  it('should validate a valid config', () => {
    const config: SDKConfig = {
      githubToken: 'test-token',
      githubRepo: 'owner/repo',
    };

    const result = validateConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.metadata).toEqual({
      source: 'github',
      validationType: 'data',
    });
    expect(typeof result.timestamp).toBe('number');
  });

  it('should validate a valid config with postgres storage', () => {
    const config: SDKConfig = {
      githubToken: 'test-token',
      githubRepo: 'owner/repo',
      storage: {
        type: 'postgres',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'user',
          password: 'password',
        },
      },
    };

    const result = validateConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate missing githubToken', () => {
    const config = {
      githubRepo: 'owner/repo',
    } as SDKConfig;

    const result = validateConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      code: ErrorCode.INVALID_CONFIG,
      message: 'githubToken is required',
    });
  });

  it('should validate missing githubRepo', () => {
    const config = {
      githubToken: 'test-token',
    } as SDKConfig;

    const result = validateConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      code: ErrorCode.INVALID_CONFIG,
      message: 'githubRepo is required',
    });
  });

  it('should validate invalid githubRepo format', () => {
    const config: SDKConfig = {
      githubToken: 'test-token',
      githubRepo: 'invalid-repo',
    };

    const result = validateConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      code: ErrorCode.INVALID_CONFIG,
      message: 'githubRepo must be in format "owner/repo"',
    });
  });

  it('should validate invalid postgres config', () => {
    const config: SDKConfig = {
      githubToken: 'test-token',
      githubRepo: 'owner/repo',
      storage: {
        type: 'postgres',
        config: {
          host: 'localhost',
          // Missing required fields
        },
      },
    } as SDKConfig;

    const result = validateConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      code: ErrorCode.INVALID_CONFIG,
      message: 'Invalid postgres configuration',
    });
  });

  it('should validate multiple errors', () => {
    const config = {
      storage: {
        type: 'postgres',
        config: {
          host: 'localhost',
          // Missing required fields
        },
      },
    } as SDKConfig;

    const result = validateConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors).toEqual(expect.arrayContaining([
      {
        code: ErrorCode.INVALID_CONFIG,
        message: 'githubToken is required',
      },
      {
        code: ErrorCode.INVALID_CONFIG,
        message: 'githubRepo is required',
      },
      {
        code: ErrorCode.INVALID_CONFIG,
        message: 'Invalid postgres configuration',
      },
    ]));
  });
}); 