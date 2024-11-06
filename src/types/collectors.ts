import { BaseCollectorConfig } from ".";

export interface NEARCollectorConfig extends BaseCollectorConfig {
  account: string;
  projectId: string;
  apiKey?: string;
  apiUrl?: string;
} 