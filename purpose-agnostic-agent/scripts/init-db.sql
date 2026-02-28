-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL,
  category TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(source_path)
);

-- Knowledge chunks table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,  -- 768 dimensions for Ollama (nomic-embed-text), 1536 for OpenAI
  token_count INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Create vector similarity index
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
  ON knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create category index for filtering
CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx 
  ON knowledge_chunks(document_id);

-- Chat sessions table (for conversation continuity)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  metadata JSONB
);

-- Create index for session expiration cleanup
CREATE INDEX IF NOT EXISTS chat_sessions_expires_idx 
  ON chat_sessions(expires_at) 
  WHERE expires_at IS NOT NULL;

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for session message retrieval
CREATE INDEX IF NOT EXISTS chat_messages_session_idx 
  ON chat_messages(session_id, created_at);

-- Failover events table (for monitoring)
CREATE TABLE IF NOT EXISTS failover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_provider TEXT NOT NULL,
  successful_provider TEXT NOT NULL,
  reason TEXT NOT NULL,
  request_id TEXT,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for failover analysis
CREATE INDEX IF NOT EXISTS failover_events_occurred_idx 
  ON failover_events(occurred_at DESC);

-- Personas table (for database storage option)
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  extra_instructions TEXT,
  knowledge_category TEXT NOT NULL,
  temperature DECIMAL,
  max_tokens INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ingestion events table (for monitoring ingestion pipeline)
CREATE TABLE IF NOT EXISTS ingestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER,
  embedding_provider VARCHAR(100),
  error_message TEXT
);

-- Create indexes on ingestion_events for efficient querying
CREATE INDEX IF NOT EXISTS idx_ingestion_events_document_id ON ingestion_events(document_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_events_timestamp ON ingestion_events(timestamp DESC);
