CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  usd_amount DECIMAL(10,2) NOT NULL,
  near_amount VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL,
  signature VARCHAR(255) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_project
    FOREIGN KEY(project_id) 
    REFERENCES projects(id)
);

-- Index for monthly queries
CREATE INDEX idx_rewards_calculated_at ON rewards(calculated_at); 