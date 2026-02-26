-- Quick script to manually ingest sample knowledge
-- This is a temporary solution for testing

-- Note: In production, use the proper ingestion pipeline
-- This script assumes you have embeddings generated separately

-- For now, let's just verify the system works by testing without knowledge base
-- The system will respond that it doesn't have information, which is correct behavior

SELECT 'Knowledge base ingestion requires the document ingestion processor';
SELECT 'Text files have been created in knowledge/general/';
SELECT 'To enable full RAG functionality, implement text file ingestion or convert to PDF';
