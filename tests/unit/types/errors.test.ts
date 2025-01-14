import { BaseError, ErrorCode } from "../../../src/types/errors";

describe('BaseError', () => {
    it('should create an instance of BaseError with the correct properties', () => {
        const message = 'Test error message';
        const code = ErrorCode.SDK_ERROR;
        const details = { key: 'value' };

        const error = new BaseError(message, code, details);

        expect(error).toBeInstanceOf(BaseError);
        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
        expect(error.context).toEqual(details);
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