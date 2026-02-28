-- Migration: Add Admin Panel Tables
-- Description: Creates admin_users, audit_logs, and knowledge_categories tables
-- Date: 2024

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_logs_admin_user
    FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id)
    ON DELETE CASCADE
);

-- Create indexes on audit_logs for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);

-- Create knowledge_categories table
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_knowledge_categories_name_format
    CHECK (name ~ '^[a-zA-Z0-9-]+$')
);

-- Verification queries
-- Uncomment to verify tables were created successfully
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('admin_users', 'audit_logs', 'knowledge_categories', 'ingestion_events');
-- \d admin_users
-- \d audit_logs
-- \d knowledge_categories
-- \d ingestion_events

-- Create ingestion_events table for monitoring ingestion pipeline
CREATE TABLE IF NOT EXISTS ingestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER,
  embedding_provider VARCHAR(100),
  error_message TEXT,
  CONSTRAINT fk_ingestion_events_document
    FOREIGN KEY (document_id)
    REFERENCES knowledge_documents(id)
    ON DELETE CASCADE
);

-- Create indexes on ingestion_events for efficient querying
CREATE INDEX IF NOT EXISTS idx_ingestion_events_document_id ON ingestion_events(document_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_events_timestamp ON ingestion_events(timestamp DESC);
