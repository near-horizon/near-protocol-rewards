CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  near_account VARCHAR(255) NOT NULL,
  github_repo VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  github_metrics JSONB NOT NULL,
  near_metrics JSONB NOT NULL,
  score JSONB NOT NULL,
  validation JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for better query performance
  INDEX idx_project_timestamp (project_id, timestamp DESC),
  INDEX idx_created_at (created_at DESC)
);

-- Add any necessary constraints
ALTER TABLE metrics
  ADD CONSTRAINT metrics_project_id_timestamp_unique 
  UNIQUE (project_id, timestamp);
