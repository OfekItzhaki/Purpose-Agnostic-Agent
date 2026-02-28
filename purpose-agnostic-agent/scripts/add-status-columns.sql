-- Migration: Add status tracking columns to knowledge_documents
-- Description: Adds status, error_message, retry_count, and updated_at columns
-- Date: 2024
-- Purpose: Support ingestion monitoring and retry functionality

-- Add status column (enum-like varchar)
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- Add error_message column for tracking ingestion failures
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add retry_count column for tracking retry attempts
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add updated_at column for tracking last modification time
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Update existing rows to have completed status if null
UPDATE knowledge_documents 
SET status = 'completed' 
WHERE status IS NULL;

-- Verification query
-- Uncomment to verify columns were added successfully
-- \d knowledge_documents
