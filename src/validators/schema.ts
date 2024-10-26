import { z } from 'zod';
import { ValidationError } from '../utils/errors';

export const SDKConfigSchema = z.object({
  projectId: z.string().min(1).max(255),
  nearAccount: z.string().regex(/^[a-z0-9_-]+\.near$/),
  githubRepo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  githubToken: z.string().min(1),
  nearApiEndpoint: z.string().url().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  trackingInterval: z.number().positive().optional(),
  storage: z.object({
    type: z.literal('postgres'),
    config: z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      user: z.string(),
      password: z.string()
    })
  }).optional(),
  validation: z.object({
    github: z.object({
      minCommits: z.number().positive(),
      maxCommitsPerDay: z.number().positive(),
      minAuthors: z.number().positive(),
      suspiciousAuthorRatio: z.number().min(0).max(1)
    }).optional(),
    near: z.object({
      minTransactions: z.number().positive(),
      maxTransactionsPerDay: z.number().positive(),
      minUniqueUsers: z.number().positive(),
      minContractCalls: z.number().positive()
    }).optional()
  }).optional(),
  weights: z.object({
    github: z.object({
      commits: z.number(),
      pullRequests: z.number(),
      issues: z.number()
    }).optional(),
    near: z.object({
      transactions: z.number(),
      contractCalls: z.number(),
      uniqueUsers: z.number()
    }).optional()
  }).optional()
});

export function validateConfig(config: unknown): void {
  try {
    SDKConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid SDK configuration', {
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    throw error;
  }
}

export type SDKConfig = z.infer<typeof SDKConfigSchema>;
