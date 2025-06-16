import { ConsoleLogger } from "../utils/logger";
import { RateLimiter } from "../utils/rate-limiter";

export interface GitHubCollectorConfig {
  token: string;
  repo: string;
  logger: ConsoleLogger;
  rateLimiter: RateLimiter;
}
