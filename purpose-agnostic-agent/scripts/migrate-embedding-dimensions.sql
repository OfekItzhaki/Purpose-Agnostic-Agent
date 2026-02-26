-- Migration: Support variable embedding dimensions (768 for Ollama, 1536 for OpenAI)
-- This script updates the knowledge_chunks table to support 768-dimensional embeddings

-- Drop the existing table and recreate with 768 dimensions for Ollama
DROP TABLE IF EXISTS knowledge_chunks CASCADE;

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,  -- Changed from 1536 to 768 for Ollama
  token_count INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add comment
COMMENT ON TABLE knowledge_chunks IS 'Stores document chunks with 768-dimensional embeddings (Ollama nomic-embed-text)';
