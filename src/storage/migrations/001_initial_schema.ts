/**
 * Initial Database Schema Migration
 * 
 * Core tables:
 * - projects: Project configuration and metadata
 * - metrics: Time-series metrics data with validation results
 * 
 * Design considerations:
 * - JSONB for flexible metric storage (github_metrics, near_metrics, processed_metrics, validation_result)
 * - Indexed for query performance (idx_metrics_project_timestamp, idx_metrics_collection_timestamp)
 * - Constraints for data integrity (metrics_project_timestamp_unique)
 * - Timestamps for data freshness (created_at, updated_at, collection_timestamp)
 * - References for relational integrity (metrics.project_id references projects.id)
 * - Signature field for data verification
 */

import { PoolClient } from 'pg';

// Define our own MigrationFn type since we're not using postgres-migrations
type MigrationFn = (client: PoolClient) => Promise<void>;

export const up: MigrationFn = async (client: PoolClient): Promise<void> => {
  await client.query(`
    -- Projects table for configuration
    CREATE TABLE projects (
      id VARCHAR(255) PRIMARY KEY,
      near_account VARCHAR(255) NOT NULL,
      github_repo VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Metrics table for time-series data
    CREATE TABLE metrics (
      id SERIAL PRIMARY KEY,
      project_id VARCHAR(255) REFERENCES projects(id),
      timestamp BIGINT NOT NULL,
      collection_timestamp BIGINT NOT NULL,
      
      -- Core metrics data
      github_metrics JSONB NOT NULL,
      near_metrics JSONB NOT NULL,
      processed_metrics JSONB NOT NULL,
      
      -- Validation and security
      validation_result JSONB NOT NULL,
      signature VARCHAR(255) NOT NULL,
      
      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      -- Constraints
      CONSTRAINT metrics_project_timestamp_unique UNIQUE (project_id, timestamp)
    );

    -- Indexes for performance
    CREATE INDEX idx_metrics_project_timestamp ON metrics(project_id, timestamp DESC);
    CREATE INDEX idx_metrics_collection_timestamp ON metrics(collection_timestamp DESC);
  `);
};

export const down: MigrationFn = async (client: PoolClient): Promise<void> => {
  await client.query(`
    DROP TABLE IF EXISTS metrics;
    DROP TABLE IF EXISTS projects;
  `);
};
