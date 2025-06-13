import { BaseError, ErrorCode, formatError } from "../../../src/types/errors";

describe('ErrorCode', () => {
    it('should have all error codes defined', () => {
        expect(ErrorCode.SDK_ERROR).toBe('SDK_ERROR');
        expect(ErrorCode.API_ERROR).toBe('API_ERROR');
        expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
        expect(ErrorCode.STORAGE_ERROR).toBe('STORAGE_ERROR');
        expect(ErrorCode.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
        expect(ErrorCode.PROCESSING_ERROR).toBe('PROCESSING_ERROR');
        expect(ErrorCode.CALCULATION_ERROR).toBe('CALCULATION_ERROR');
        expect(ErrorCode.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
        expect(ErrorCode.COLLECTION_ERROR).toBe('COLLECTION_ERROR');
        expect(ErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIG');
        expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
        expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
        expect(ErrorCode.LOW_COMMIT_COUNT).toBe('LOW_COMMIT_COUNT');
        expect(ErrorCode.SUSPICIOUS_COMMIT_FREQUENCY).toBe('SUSPICIOUS_COMMIT_FREQUENCY');
        expect(ErrorCode.LOW_AUTHOR_DIVERSITY).toBe('LOW_AUTHOR_DIVERSITY');
        expect(ErrorCode.HIGH_VELOCITY).toBe('HIGH_VELOCITY');
        expect(ErrorCode.SINGLE_PR_AUTHOR).toBe('SINGLE_PR_AUTHOR');
        expect(ErrorCode.LOW_PR_MERGE_RATE).toBe('LOW_PR_MERGE_RATE');
        expect(ErrorCode.LOW_REVIEW_ENGAGEMENT).toBe('LOW_REVIEW_ENGAGEMENT');
        expect(ErrorCode.LOW_ISSUE_ENGAGEMENT).toBe('LOW_ISSUE_ENGAGEMENT');
        expect(ErrorCode.LOW_ISSUE_RESOLUTION_RATE).toBe('LOW_ISSUE_RESOLUTION_RATE');
        expect(ErrorCode.MISSING_TIMESTAMP).toBe('MISSING_TIMESTAMP');
        expect(ErrorCode.STALE_DATA).toBe('STALE_DATA');
    });
});

describe('BaseError', () => {
    it('should create error with message and code', () => {
        const error = new BaseError('Test error', ErrorCode.SDK_ERROR);
        expect(error.message).toBe('Test error');
        expect(error.code).toBe(ErrorCode.SDK_ERROR);
        expect(error.details).toBeUndefined();
        expect(error.context).toBeUndefined();
    });

    it('should create error with details', () => {
        const details = { foo: 'bar' };
        const error = new BaseError('Test error', ErrorCode.SDK_ERROR, details);
        expect(error.message).toBe('Test error');
        expect(error.code).toBe(ErrorCode.SDK_ERROR);
        expect(error.details).toEqual(details);
        expect(error.context).toEqual(details);
    });

    it('should be instance of Error', () => {
        const error = new BaseError('Test error', ErrorCode.SDK_ERROR);
        expect(error).toBeInstanceOf(Error);
    });

    it('should create an instance of BaseError without details', () => {
        const message = 'Test error message';
        const code = ErrorCode.API_ERROR;

        const error = new BaseError(message, code);

        expect(error).toBeInstanceOf(BaseError);
        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
        expect(error.context).toBeUndefined();
    });

    it('should have a stack trace', () => {
        const message = 'Test error message';
        const code = ErrorCode.VALIDATION_ERROR;

        const error = new BaseError(message, code);

        expect(error.stack).toBeDefined();
    });
});

describe('formatError', () => {
    it('should format Error instance', () => {
        const error = new Error('Test error');
        error.stack = 'test stack';
        const formatted = formatError(error);
        expect(formatted).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: 'Test error',
            context: { stack: 'test stack' },
        });
    });

    it('should format BaseError instance', () => {
        const error = new BaseError('Test error', ErrorCode.SDK_ERROR, { foo: 'bar' });
        const formatted = formatError(error);
        expect(formatted).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: 'Test error',
            context: { stack: error.stack },
        });
    });

    it('should format non-Error values', () => {
        expect(formatError('string error')).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: 'string error',
        });

        expect(formatError(123)).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: '123',
        });

        expect(formatError(null)).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: 'null',
        });

        expect(formatError(undefined)).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: 'undefined',
        });

        expect(formatError({ custom: 'error' })).toEqual({
            code: ErrorCode.PROCESSING_ERROR,
            message: '[object Object]',
        });
    });
});