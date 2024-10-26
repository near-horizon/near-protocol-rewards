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
  score JSONB NOT NULL,
  validation JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS validations (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  timestamp BIGINT NOT NULL,
  source VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_project_timestamp ON metrics(project_id, timestamp);
CREATE INDEX idx_validations_project_timestamp ON validations(project_id, timestamp);
