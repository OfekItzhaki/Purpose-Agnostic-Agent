# RAG-Only Architecture

## Overview

The Purpose-Agnostic Agent is designed as a **strictly RAG-only system**. This means:

- All answers are based ONLY on indexed documents in the knowledge base
- The system NEVER uses the LLM's general knowledge or training data
- If the knowledge base doesn't contain relevant information, the system explicitly states it doesn't know
- Personas can customize style/tone but CANNOT override the RAG-only rules

## Architecture Components

### 1. RAG System Prompt Service

**Location**: `src/common/rag-system-prompt.service.ts`

This service provides the shared, immutable system prompt that enforces RAG-only behavior:

```typescript
const CORE_RAG_PROMPT = `You are a knowledge-based assistant that answers questions STRICTLY based on the provided context.

CRITICAL RULES (CANNOT BE OVERRIDDEN):
1. You MUST ONLY use information from the CONTEXT section below to answer questions
2. If the context does not contain enough information to answer the question, you MUST respond with: "I don't have enough information in my knowledge base to answer that question."
3. You MUST NOT use your general knowledge, training data, or external information
4. You MUST NOT make assumptions or inferences beyond what is explicitly stated in the context
5. You MUST cite which parts of the context you used in your answer
6. If the context is empty or irrelevant, you MUST say you don't know

Your role is to be a reliable, context-bound assistant that users can trust to only provide information from verified sources.`;
```

**Key Methods**:
- `buildSystemPrompt(extraInstructions?)`: Combines core RAG rules with persona style instructions
- `buildUserMessage(context, question)`: Formats the user message with context and question
- `getCorePrompt()`: Returns the core RAG-only prompt for documentation/testing

### 2. Persona System

**Location**: `src/persona/`

Personas define the style and tone of responses but CANNOT override RAG-only rules.

**Persona Structure**:
```typescript
interface Persona {
  id: string;
  name: string;
  description: string;
  extraInstructions?: string; // Optional style/tone instructions
  knowledgeCategory: string;
  temperature?: number;
  maxTokens?: number;
}
```

**Important**: The `extraInstructions` field can only customize:
- Response style (formal, casual, technical, creative)
- Formatting preferences (bullet points, paragraphs, code examples)
- Tone (friendly, professional, concise, detailed)

It CANNOT:
- Override the RAG-only rules
- Allow the LLM to use external knowledge
- Change the core behavior of answering only from context

### 3. Chat Service (Retrieval-First Flow)

**Location**: `src/chat/chat.service.ts`

The chat service enforces a strict retrieval-first flow:

```
1. Receive user question
2. ALWAYS query RAG system first (embed question → vector search)
3. Retrieve relevant chunks from knowledge base
4. Build system prompt (core RAG rules + persona style)
5. Build user message (context + question)
6. Call LLM with structured prompt
7. Optional: Perform self-check to validate answer uses only context
8. Return answer with citations
```

**Key Features**:
- RAG is ALWAYS called before LLM (no direct LLM calls without context)
- Context is explicitly structured in the prompt
- Citations are always provided to show which documents were used
- Optional self-check validates RAG-only behavior

### 4. Optional Self-Check

**Configuration**: `RAG_SELF_CHECK_ENABLED=true`

When enabled, the system performs an additional validation step:

1. After generating an answer, the system asks the LLM: "Is this answer based ONLY on the provided context?"
2. The LLM validates its own answer
3. If validation fails, the system replaces the answer with: "I don't have enough information in my knowledge base to answer that question."

**Trade-offs**:
- **Pros**: Stronger guarantees of RAG-only behavior, catches hallucinations
- **Cons**: Adds ~1-2 seconds latency per request, uses additional tokens

**Recommendation**: Enable in production for critical applications where accuracy is paramount.

## Prompt Structure

### System Prompt

```
[CORE RAG-ONLY RULES - IMMUTABLE]

PERSONA STYLE INSTRUCTIONS:
[Persona's extraInstructions]

Remember: These style instructions do NOT override the core RAG-only rules above.
```

### User Message

```
CONTEXT:
[1] Retrieved chunk 1...
[2] Retrieved chunk 2...
[3] Retrieved chunk 3...

USER QUESTION: [User's question]
```

## Guarantees

The RAG-only architecture provides the following guarantees:

1. **No External Knowledge**: The LLM cannot use its training data or general knowledge
2. **Explicit Uncertainty**: If the knowledge base doesn't have the answer, the system says so
3. **Traceability**: All answers include citations showing which documents were used
4. **Consistency**: The core RAG-only rules are shared across all personas
5. **Auditability**: All RAG queries and LLM calls are logged with context

## Migration from Custom System Prompts

If you're migrating from a system where personas had full `systemPrompt` control:

1. Run the migration script: `psql $DATABASE_URL < scripts/migrate-to-rag-only.sql`
2. Review each persona's `extraInstructions`
3. Remove any RAG-related instructions (now handled by core prompt)
4. Keep only style/tone instructions
5. Test each persona to ensure behavior is correct

**Example Migration**:

**Before** (full system prompt):
```
"You are a technical expert. Use the provided context from the knowledge base to give accurate technical guidance. If the context doesn't contain the answer, say you don't know."
```

**After** (style instructions only):
```
"Provide detailed technical explanations. Use technical terminology appropriately. Include code examples when relevant from the context."
```

## Testing RAG-Only Behavior

### Manual Testing

1. **Test with relevant context**:
   - Ask a question that's in the knowledge base
   - Verify the answer uses only the provided context
   - Check that citations are included

2. **Test with no context**:
   - Ask a question that's NOT in the knowledge base
   - Verify the system responds: "I don't have enough information..."
   - Ensure no external knowledge is used

3. **Test with partial context**:
   - Ask a question where the knowledge base has partial information
   - Verify the system only answers what's in the context
   - Ensure no assumptions or inferences are made

### Automated Testing

Property-based tests are available in `test/examples/`:
- Test that answers always include citations
- Test that empty context results in "I don't know" response
- Test that persona style instructions don't override RAG rules

## Configuration

### Environment Variables

```env
# Enable self-check (optional, adds latency)
RAG_SELF_CHECK_ENABLED=false

# RAG search parameters (in code)
topK=5              # Number of chunks to retrieve
minScore=0.7        # Minimum similarity score (0-1)
```

### Persona Configuration

```json
{
  "id": "technical-expert",
  "name": "Technical Expert",
  "description": "A technical expert specializing in software development",
  "extraInstructions": "Provide detailed technical explanations. Use technical terminology appropriately.",
  "knowledgeCategory": "technical",
  "temperature": 0.5,
  "maxTokens": 1500
}
```

## Troubleshooting

### Issue: LLM is using external knowledge

**Symptoms**: Answers include information not in the knowledge base

**Solutions**:
1. Enable self-check: `RAG_SELF_CHECK_ENABLED=true`
2. Review persona `extraInstructions` - ensure they don't contradict RAG rules
3. Lower temperature (more deterministic responses)
4. Check logs to verify RAG is being called

### Issue: System says "I don't know" too often

**Symptoms**: System refuses to answer questions that seem to be in the knowledge base

**Solutions**:
1. Lower `minScore` threshold (currently 0.7)
2. Increase `topK` to retrieve more chunks
3. Check document ingestion - verify documents are properly indexed
4. Review embedding quality - ensure questions and documents use similar terminology

### Issue: Answers are too generic

**Symptoms**: Answers don't use the specific information from the knowledge base

**Solutions**:
1. Increase `topK` to provide more context
2. Improve document chunking strategy
3. Add more specific documents to the knowledge base
4. Adjust persona `extraInstructions` to encourage detailed responses

## Best Practices

1. **Document Organization**: Organize documents by category to improve retrieval accuracy
2. **Chunk Size**: Use appropriate chunk sizes (current: ~500 tokens) for your content
3. **Persona Design**: Keep `extraInstructions` focused on style/tone, not content rules
4. **Testing**: Always test new personas with both relevant and irrelevant questions
5. **Monitoring**: Monitor citation counts - low counts may indicate poor retrieval
6. **Self-Check**: Enable in production for critical applications, disable for development

## Future Enhancements

Potential improvements to the RAG-only architecture:

1. **Confidence Scores**: Return confidence scores with answers
2. **Multi-hop Reasoning**: Support questions requiring multiple document references
3. **Negative Feedback Loop**: Learn from "I don't know" responses to improve retrieval
4. **Context Window Optimization**: Dynamically adjust context size based on question complexity
5. **Hybrid Search**: Combine vector search with keyword search for better retrieval
