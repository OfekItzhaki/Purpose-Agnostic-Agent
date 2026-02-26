# RAG-Only Quick Start Guide

This guide helps you quickly understand and use the RAG-only architecture.

---

## What is RAG-Only?

The Purpose-Agnostic Agent is **strictly RAG-only**:
- ✅ Answers ONLY from indexed documents
- ✅ NO external knowledge or LLM training data
- ✅ Says "I don't know" when context is insufficient
- ✅ All answers include citations

---

## Quick Setup

### 1. Environment Configuration

Add to your `.env`:
```env
# Optional: Enable self-check (adds ~1-2s latency)
RAG_SELF_CHECK_ENABLED=false
```

### 2. Create a Persona

```bash
POST /api/personas
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "A helpful agent",
  "extraInstructions": "Be concise and friendly.",
  "knowledgeCategory": "general",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Important**: `extraInstructions` can only customize style/tone, NOT behavior.

### 3. Index Documents

Place PDFs in `knowledge/` directory:
```
knowledge/
├── general/
│   └── my-docs.pdf
```

Documents are automatically ingested and indexed.

### 4. Ask Questions

```bash
POST /api/chat
{
  "agent_id": "my-agent",
  "question": "What is in the documentation?"
}
```

**Response**:
```json
{
  "answer": "Based on the documentation, ...",
  "citations": [
    {
      "sourcePath": "/knowledge/general/my-docs.pdf",
      "content": "Relevant excerpt...",
      "score": 0.85
    }
  ],
  "modelUsed": "gpt-4o",
  "sessionId": "uuid"
}
```

---

## Key Concepts

### Core RAG-Only Prompt

The system uses a shared, immutable prompt:
```
You are a knowledge-based assistant that answers questions STRICTLY based on the provided context.

CRITICAL RULES:
1. ONLY use information from the CONTEXT section
2. If context is insufficient, say "I don't have enough information..."
3. NO external knowledge or training data
4. NO assumptions beyond what's in the context
5. MUST cite which parts of context you used
6. If context is empty/irrelevant, say you don't know
```

This prompt CANNOT be overridden by personas.

### Persona Extra Instructions

Personas can customize style/tone:
- ✅ "Be concise and use bullet points"
- ✅ "Use technical terminology"
- ✅ "Be friendly and conversational"
- ❌ "Use your general knowledge" (ignored)
- ❌ "Answer even without context" (ignored)

### Self-Check Feature

When enabled (`RAG_SELF_CHECK_ENABLED=true`):
1. System generates answer from context
2. System asks LLM: "Is this answer based ONLY on the context?"
3. If NO, replaces answer with "I don't know"

**Trade-off**: Stronger guarantees vs. ~1-2s latency

---

## Common Scenarios

### Scenario 1: Question in Knowledge Base

**Question**: "What is NestJS?"  
**Knowledge Base**: Contains NestJS documentation  
**Response**: Answers from documentation with citations

### Scenario 2: Question NOT in Knowledge Base

**Question**: "What is the weather today?"  
**Knowledge Base**: Contains only technical docs  
**Response**: "I don't have enough information in my knowledge base to answer that question."

### Scenario 3: Partial Information

**Question**: "What are the features of NestJS and Django?"  
**Knowledge Base**: Contains only NestJS docs  
**Response**: Answers about NestJS only, says "I don't have information about Django"

---

## Troubleshooting

### Problem: System uses external knowledge

**Solution**:
1. Enable self-check: `RAG_SELF_CHECK_ENABLED=true`
2. Check persona `extraInstructions` - remove any conflicting instructions
3. Lower temperature for more deterministic responses

### Problem: System says "I don't know" too often

**Solution**:
1. Check if documents are properly indexed
2. Lower `minScore` threshold in code (currently 0.7)
3. Increase `topK` to retrieve more chunks (currently 5)
4. Improve document quality and chunking

### Problem: Answers are too generic

**Solution**:
1. Increase `topK` to provide more context
2. Improve document organization by category
3. Add more specific documents to knowledge base
4. Adjust persona `extraInstructions` for detailed responses

---

## Best Practices

### 1. Document Organization

Organize by category for better retrieval:
```
knowledge/
├── technical/
│   ├── nestjs.pdf
│   └── typescript.pdf
├── business/
│   ├── policies.pdf
│   └── procedures.pdf
└── general/
    └── faq.pdf
```

### 2. Persona Design

Keep `extraInstructions` focused on style:
```json
{
  "extraInstructions": "Provide detailed technical explanations. Use code examples when relevant. Be precise and accurate."
}
```

NOT:
```json
{
  "extraInstructions": "Answer questions even if you don't have context. Use your general knowledge."
}
```

### 3. Testing

Always test with:
- ✅ Questions that ARE in the knowledge base
- ✅ Questions that are NOT in the knowledge base
- ✅ Questions with partial information

### 4. Monitoring

Track these metrics:
- Citations per request (should be > 0)
- "I don't know" response rate
- Self-check failure rate (if enabled)
- RAG search latency

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_SELF_CHECK_ENABLED` | `false` | Enable answer validation |

### RAG Search Parameters

In `src/chat/chat.service.ts`:
```typescript
topK: 5,        // Number of chunks to retrieve
minScore: 0.7,  // Minimum similarity score (0-1)
```

### Persona Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `name` | Yes | Display name |
| `description` | Yes | Brief description |
| `extraInstructions` | No | Style/tone instructions |
| `knowledgeCategory` | Yes | Category filter for RAG |
| `temperature` | No | LLM temperature (0-2) |
| `maxTokens` | No | Max response tokens |

---

## API Examples

### Create Persona

```bash
curl -X POST http://localhost:3000/api/personas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tech-support",
    "name": "Tech Support",
    "description": "Technical support agent",
    "extraInstructions": "Be helpful and patient. Use simple language.",
    "knowledgeCategory": "support",
    "temperature": 0.7,
    "maxTokens": 1000
  }'
```

### Ask Question

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "tech-support",
    "question": "How do I reset my password?"
  }'
```

### List Personas

```bash
curl http://localhost:3000/api/agents
```

---

## Migration from Old System

If you have existing personas with `systemPrompt`:

1. **Backup database**:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Run migration**:
   ```bash
   psql $DATABASE_URL < scripts/migrate-to-rag-only.sql
   ```

3. **Review personas**:
   - Check each persona's `extra_instructions`
   - Remove RAG-related instructions
   - Keep only style/tone instructions

4. **Test**:
   - Test each persona
   - Verify RAG-only behavior

---

## Further Reading

- **Complete Architecture**: `docs/RAG_ONLY_ARCHITECTURE.md`
- **Implementation Details**: `RAG_ONLY_IMPLEMENTATION.md`
- **README**: `README.md`

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f api`
2. Review documentation above
3. Check health endpoint: `http://localhost:3000/health`
4. Review RAG search results in citations

---

**Remember**: The system is RAG-only. It will ONLY answer from indexed documents. If you want it to answer a question, make sure the relevant documents are in the knowledge base!
