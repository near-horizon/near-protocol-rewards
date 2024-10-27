CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  near_account VARCHAR(255) NOT NULL,
  github_repo VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  timestamp BIGINT NOT NULL,
  github_metrics JSONB NOT NULL,
  near_metrics JSONB NOT NULL,
  processed_metrics JSONB NOT NULL,
  signature VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT metrics_project_timestamp_unique UNIQUE (project_id, timestamp)
);

-- Indexes for better query performance
CREATE INDEX idx_metrics_project_timestamp ON metrics(project_id, timestamp DESC);
CREATE INDEX idx_metrics_created_at ON metrics(created_at DESC);
