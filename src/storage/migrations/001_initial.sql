CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for better query performance
  INDEX idx_project_timestamp (project_id, timestamp DESC)
);
