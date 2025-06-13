import { validateApiKey } from "../../../src/middleware/auth";
import { Request, Response, NextFunction } from "express";
import { ErrorCode } from "../../../src/types/errors";

describe("validateApiKey middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it("should return 401 if API key is missing", () => {
        validateApiKey(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: ErrorCode.UNAUTHORIZED,
                message: "API key is required",
            },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next if API key is present", () => {
        req.headers!["x-api-key"] = "test-api-key";

        validateApiKey(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should return 401 if API key is empty", () => {
        req.headers!["x-api-key"] = "";

        validateApiKey(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: ErrorCode.UNAUTHORIZED,
                message: "API key is required",
            },
        });
        expect(next).not.toHaveBeenCalled();
    });
});