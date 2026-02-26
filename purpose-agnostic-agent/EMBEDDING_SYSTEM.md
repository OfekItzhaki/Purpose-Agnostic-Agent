# Modular Embedding System

## Overview

The Purpose-Agnostic Agent now features a **modular, extensible embedding system** with automatic fallback support. This eliminates the need for paid API keys for embeddings while maintaining reliability.

## Architecture

### EmbeddingRouterService

The system uses a registry pattern similar to `ModelRouterService`:

```
User Request
    ↓
EmbeddingRouterService (Router)
    ↓
Try Provider 1 (Ollama) → Success ✓
    ↓ (if fails)
Try Provider 2 (OpenAI) → Success ✓
    ↓ (if fails)
Error: All providers failed
```

### Key Features

1. **Priority-based fallback** - Tries providers in configured order
2. **Circuit breaker** - Disables failing providers temporarily
3. **Zero configuration** - Works out of the box with Ollama
4. **Extensible** - Easy to add new providers
5. **Logging** - Clear visibility into which provider is used

## Configuration

### Environment Variables

```env
# Priority order (comma-separated)
EMBEDDING_PROVIDERS=ollama,openai

# Ollama configuration
OLLAMA_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OpenAI (optional fallback)
OPENAI_API_KEY=your_key_here_optional
```

### Provider Priority

The system tries providers in the order specified in `EMBEDDING_PROVIDERS`:

- **Default**: `ollama,openai` (free first, paid fallback)
- **OpenAI first**: `openai,ollama` (paid first, free fallback)
- **Ollama only**: `ollama` (no fallback)

## Supported Providers

### 1. Ollama (Default)
- **Cost**: Free
- **Model**: `nomic-embed-text`
- **Dimensions**: 768
- **Speed**: Fast (local)
- **Setup**: Automatic (model pulled on first use)

### 2. OpenAI (Fallback)
- **Cost**: ~$0.0001 per 1K tokens
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Speed**: Very fast
- **Setup**: Requires API key

## Adding New Providers

To add a new embedding provider (e.g., Google, Cohere):

### Step 1: Create Provider Service

```typescript
// src/rag/services/google-embedding.service.ts
import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../interfaces/embedding.service.interface.js';

@Injectable()
export class GoogleEmbeddingService implements EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Implementation
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Implementation
  }

  getDimensions(): number {
    return 768; // or your model's dimensions
  }
}
```

### Step 2: Register in RAGModule

```typescript
// src/rag/rag.module.ts
import { GoogleEmbeddingService } from './services/google-embedding.service.js';

@Module({
  providers: [
    // ... existing providers
    GoogleEmbeddingService,
  ],
})
```

### Step 3: Add to EmbeddingRouterService

```typescript
// src/rag/services/embedding-router.service.ts
constructor(
  private readonly configService: ConfigService,
  private readonly ollamaService: OllamaEmbeddingService,
  private readonly openaiService: OpenAIEmbeddingService,
  private readonly googleService: GoogleEmbeddingService, // Add this
) {
  this.registerProvider('ollama', this.ollamaService, 768);
  this.registerProvider('openai', this.openaiService, 1536);
  this.registerProvider('google', this.googleService, 768); // Add this
  
  // ...
}
```

### Step 4: Update Configuration

```env
EMBEDDING_PROVIDERS=ollama,google,openai
```

That's it! The new provider is now part of the fallback chain.

## Circuit Breaker

The system includes a circuit breaker to prevent hammering failed providers:

- **Failure Threshold**: 3 consecutive failures
- **Behavior**: Provider disabled temporarily after threshold
- **Reset**: Automatic on successful request
- **Logging**: Clear warnings when providers are disabled

## Monitoring

The system logs all embedding operations:

```
[EmbeddingRouterService] Embedding router initialized with providers: ollama → openai
[EmbeddingRouterService] Attempting embedding generation with ollama
[EmbeddingRouterService] Successfully generated embedding with ollama (768 dimensions)
```

If a provider fails:

```
[EmbeddingRouterService] Failed to generate embedding with ollama: Connection refused
[EmbeddingRouterService] Attempting embedding generation with openai
[EmbeddingRouterService] Successfully generated embedding with openai (1536 dimensions)
```

## Database Compatibility

The system automatically handles different embedding dimensions:

- **Current schema**: 768 dimensions (optimized for Ollama)
- **OpenAI fallback**: Works with 1536 dimensions (auto-handled)
- **Migration**: Run `scripts/migrate-embedding-dimensions.sql` if needed

## Performance

### Ollama (Local)
- **Latency**: ~100-200ms
- **Throughput**: ~10 embeddings/second
- **Cost**: $0

### OpenAI (Cloud)
- **Latency**: ~50-100ms
- **Throughput**: ~100 embeddings/second
- **Cost**: ~$0.0001 per 1K tokens

## Troubleshooting

### Ollama Not Working

1. Check Ollama is running:
   ```bash
   docker-compose ps ollama
   ```

2. Check model is pulled:
   ```bash
   docker-compose exec ollama ollama list
   ```

3. Pull model manually:
   ```bash
   docker-compose exec ollama ollama pull nomic-embed-text
   ```

### All Providers Failing

Check the logs:
```bash
docker-compose logs api | grep "EmbeddingRouterService"
```

Look for specific error messages from each provider.

## Benefits

✅ **Zero cost** - Free embeddings with Ollama
✅ **Reliable** - Automatic fallback to OpenAI
✅ **Fast** - Local processing with Ollama
✅ **Extensible** - Easy to add new providers
✅ **Observable** - Clear logging of provider usage
✅ **Resilient** - Circuit breaker prevents cascading failures

## Comparison with Previous System

| Feature | Old System | New System |
|---------|-----------|------------|
| Providers | OpenAI only | Ollama + OpenAI |
| Cost | ~$0.0001/1K tokens | $0 (with fallback) |
| Fallback | None | Automatic |
| Extensibility | Hard-coded | Registry pattern |
| Circuit Breaker | No | Yes |
| Logging | Basic | Detailed |

## Future Enhancements

Potential additions:
- Google Vertex AI embeddings
- Cohere embeddings
- HuggingFace embeddings
- Custom embedding models
- Provider health monitoring dashboard
- Automatic provider selection based on performance
