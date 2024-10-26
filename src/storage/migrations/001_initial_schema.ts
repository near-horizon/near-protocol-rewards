import { MigrationFn } from 'postgres-migrations';

export const up: MigrationFn = async (client) => {
  await client.query(`
    CREATE TABLE projects (
      id VARCHAR(255) PRIMARY KEY,
      near_account VARCHAR(255) NOT NULL,
      github_repo VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE metrics (
      id SERIAL PRIMARY KEY,
      project_id VARCHAR(255) NOT NULL REFERENCES projects(id),
      timestamp BIGINT NOT NULL,
      github_metrics JSONB NOT NULL,
      near_metrics JSONB NOT NULL,
      aggregated_metrics JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_project_timestamp UNIQUE (project_id, timestamp)
    );

    CREATE INDEX idx_metrics_project_timestamp ON metrics (project_id, timestamp DESC);
  `);
};

export const down: MigrationFn = async (client) => {
  await client.query(`
    DROP TABLE metrics;
    DROP TABLE projects;
  `);
};
