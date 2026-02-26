# Manual Testing Guide

Quick guide for manually testing the Purpose-Agnostic Agent API.

## Prerequisites

✅ Docker containers running:
```bash
docker-compose ps
```

All services should show "Up" status:
- api (port 3000)
- postgres (port 5433)
- redis (port 6380)
- ollama (port 11434)

## Quick Test Scripts

### Windows (PowerShell)
```powershell
.\test-api.ps1
```

### Linux/Mac (Bash)
```bash
bash test-api.sh
```

These scripts test:
1. Health check endpoint
2. Ready check endpoint
3. List personas endpoint
4. Chat endpoint
5. API documentation

## Manual Testing with curl

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

### 2. List Personas
```bash
curl http://localhost:3000/api/personas
```

Expected: JSON array with personas (general-assistant, technical-expert, creative-writer)

### 3. Chat Request (No Knowledge)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is the capital of France?"
  }'
```

Expected: Response saying "I don't have enough information in my knowledge base"
(This confirms RAG-only behavior)

### 4. Chat Request (With Knowledge)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is NestJS?"
  }'
```

Expected: Response with information about NestJS from the sample knowledge document

### 5. Chat with Session Continuity
```bash
# First message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is RAG?"
  }'
# Note the sessionId in the response

# Follow-up message (use the sessionId from above)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "Can you explain that in simpler terms?",
    "sessionId": "your-session-id-here"
  }'
```

Expected: Second response should reference the first question

## Manual Testing with PowerShell

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

### List Personas
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/personas"
```

### Chat Request
```powershell
$body = @{
    agent_id = "general-assistant"
    question = "What is NestJS?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## Testing Scenarios

### Scenario 1: RAG-Only Behavior
**Goal**: Verify the system only uses indexed knowledge

**Test**:
1. Ask: "What is the capital of France?"
2. Expected: "I don't have enough information in my knowledge base"
3. This confirms the system doesn't use general LLM knowledge

### Scenario 2: Knowledge Retrieval
**Goal**: Verify the system retrieves and uses indexed documents

**Test**:
1. Ask: "What is NestJS?"
2. Expected: Response with NestJS information
3. Check `citations` array for source references

### Scenario 3: Session Continuity
**Goal**: Verify conversation history is maintained

**Test**:
1. First message: "What is RAG?"
2. Second message (same sessionId): "What are its benefits?"
3. Expected: Second response should understand "its" refers to RAG

### Scenario 4: Different Personas
**Goal**: Verify personas affect response style

**Test**:
1. Ask technical-expert: "What is NestJS?"
2. Ask creative-writer: "What is NestJS?"
3. Expected: Different tones but same factual content

### Scenario 5: Model Failover
**Goal**: Verify failover works when primary model fails

**Test**:
1. Stop using Gemini (remove GOOGLE_AI_API_KEY temporarily)
2. Restart API
3. Send chat request
4. Expected: System uses fallback model (GPT-4o or Claude)
5. Check logs for failover event

## Checking Logs

### View API Logs
```bash
docker-compose logs -f api
```

Look for:
- `Chat request completed` - Successful requests
- `Model failover occurred` - Failover events
- `Document ingestion completed` - Knowledge indexing

### View All Logs
```bash
docker-compose logs -f
```

## Database Inspection

### Connect to Database
```bash
docker-compose exec postgres psql -U postgres -d universal_brain
```

### Useful Queries

**View indexed documents:**
```sql
SELECT id, source_path, category, created_at 
FROM knowledge_documents 
ORDER BY created_at DESC;
```

**View chunk count:**
```sql
SELECT COUNT(*) FROM knowledge_chunks;
```

**View chat sessions:**
```sql
SELECT id, agent_id, created_at, updated_at 
FROM chat_sessions 
ORDER BY created_at DESC 
LIMIT 10;
```

**View failover events:**
```sql
SELECT * FROM failover_events 
ORDER BY occurred_at DESC 
LIMIT 10;
```

## API Documentation

Open in browser:
```
http://localhost:3000/api/docs
```

This provides:
- Interactive API testing (Swagger UI)
- Request/response schemas
- Authentication details
- Example requests

## Troubleshooting

### API Not Responding
```bash
# Check if API is running
docker-compose ps api

# View API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready
```

### Knowledge Not Being Retrieved
```bash
# Check if documents are indexed
docker-compose exec postgres psql -U postgres -d universal_brain -c "SELECT COUNT(*) FROM knowledge_chunks;"

# Restart API to trigger re-indexing
docker-compose restart api
```

### Model Failover Not Working
```bash
# Check environment variables
docker-compose exec api env | grep API_KEY

# View failover logs
docker-compose logs api | grep -i failover
```

## Performance Testing

### Response Time
```bash
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"general-assistant","question":"What is NestJS?"}'
```

Expected: < 5 seconds (depends on LLM provider)

### Concurrent Requests
```bash
# Send 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"agent_id":"general-assistant","question":"What is NestJS?"}' &
done
wait
```

## Next Steps

After manual testing:
1. Add your own PDF documents to `knowledge/` directory
2. Restart API to index new documents
3. Test with domain-specific questions
4. Configure personas for your use case
5. Set up production environment (see PRODUCTION_CHECKLIST.md)
