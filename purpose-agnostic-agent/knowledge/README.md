# Knowledge Base Directory

This directory contains documents that will be indexed and used by the RAG system to answer questions.

## Directory Structure

Organize documents by category:

```
knowledge/
├── general/          # General knowledge documents
├── technical/        # Technical documentation
├── support/          # Support and troubleshooting guides
└── creative/         # Creative writing samples
```

## Supported Formats

Currently supported:
- **PDF files** (.pdf) - Automatically parsed and indexed
- **Text files** (.txt) - Plain text documents (for testing)

## How It Works

1. **Automatic Ingestion**: When the API starts, it scans this directory for new documents
2. **Parsing**: Documents are parsed and split into chunks
3. **Embedding**: Each chunk is converted to a vector embedding using OpenAI's text-embedding-3-small
4. **Storage**: Embeddings are stored in PostgreSQL with pgvector
5. **Retrieval**: When users ask questions, similar chunks are retrieved and used as context

## Adding Documents

### Method 1: Add Before Starting

1. Place PDF files in the appropriate category folder
2. Start the API: `docker-compose up -d`
3. Documents will be automatically indexed on startup

### Method 2: Add While Running

1. Place PDF files in the appropriate category folder
2. Restart the API: `docker-compose restart api`
3. New documents will be indexed

## Testing the Knowledge Base

Use the provided test scripts:

**Bash (Linux/Mac):**
```bash
bash test-api.sh
```

**PowerShell (Windows):**
```powershell
.\test-api.ps1
```

Or test manually with curl:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is NestJS?"
  }'
```

## Sample Document

A sample document (`sample-knowledge.txt`) is included in the `general/` folder for testing. It contains information about:
- NestJS framework
- RAG systems
- Vector databases

## Best Practices

1. **Organize by Category**: Use folders to organize documents by topic
2. **Clear Filenames**: Use descriptive filenames (e.g., `nestjs-documentation.pdf`)
3. **Quality Content**: Ensure documents are well-formatted and readable
4. **Reasonable Size**: Keep documents under 50MB for optimal processing
5. **Regular Updates**: Remove outdated documents and add new ones as needed

## Troubleshooting

### Documents Not Being Indexed

1. Check API logs: `docker-compose logs -f api`
2. Verify file format is supported (PDF or TXT)
3. Ensure files are in a category folder (not root)
4. Restart API: `docker-compose restart api`

### Poor Search Results

1. Ensure documents contain relevant information
2. Check chunk size configuration (default: 1000 characters)
3. Verify embeddings are being generated (check logs)
4. Consider adding more documents for better context

### Empty Responses

If the system responds with "I don't have enough information":
- This is correct RAG-only behavior
- The question is not covered in your knowledge base
- Add relevant documents to answer the question

## Configuration

Embedding and chunking settings can be configured in `.env`:

```env
# Embedding model (OpenAI)
OPENAI_API_KEY=your_key_here

# Chunk size for document splitting
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Number of chunks to retrieve for context
RAG_TOP_K=5
```

## Monitoring

Check ingestion status:

```sql
-- Connect to database
docker-compose exec postgres psql -U postgres -d universal_brain

-- View indexed documents
SELECT id, source_path, category, created_at 
FROM knowledge_documents 
ORDER BY created_at DESC;

-- View chunk count
SELECT COUNT(*) as total_chunks FROM knowledge_chunks;

-- View chunks by document
SELECT d.source_path, COUNT(c.id) as chunk_count
FROM knowledge_documents d
LEFT JOIN knowledge_chunks c ON c.document_id = d.id
GROUP BY d.source_path;
```
