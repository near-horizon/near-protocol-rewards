import { z } from "zod";
import { ValidationResult } from "../types/validation";

export const validateWithSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult => {
  try {
    schema.parse(data);
    return {
      isValid: true,
      errors: [],
      warnings: [],
      timestamp: Date.now(),
      metadata: {
        source: "github",
        validationType: "data"
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map((err) => ({
          code: "VALIDATION_ERROR",
          message: err.message,
          context: {
            path: err.path,
            code: err.code,
          },
        })),
        warnings: [],
        timestamp: Date.now(),
        metadata: {
          source: "github",
          validationType: "data"
        }
      };
    }
    throw error;
  }
};
