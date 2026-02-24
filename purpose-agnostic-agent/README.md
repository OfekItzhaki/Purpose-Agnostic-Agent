# Purpose-Agnostic Agent

An intelligent RAG-only agent system built with NestJS that provides LLM routing with failover, vector-based knowledge retrieval, and dynamic persona management.

## Overview

The Purpose-Agnostic Agent is a modular backend system that enables AI agents to operate without knowing their purpose until runtime. **This service is RAG-only: it answers questions strictly based on indexed documents in the knowledge base.**

Key features:

- **RAG-Only Architecture**: Answers are strictly based on indexed documents (no external knowledge)
- **Model Router**: Three-tier LLM failover (Gemini Pro → GPT-4o → Claude-3.5 → Ollama)
- **RAG System**: Vector-based knowledge retrieval using pgvector
- **Persona Manager**: Dynamic agent configuration with customizable style/tone
- **REST API**: Chat endpoints with session continuity
- **Observability**: Structured logging, metrics, and health checks

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         REST API Layer              │
│  (Chat, Personas, Health)           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Chat Service (Orchestrator)    │
│   ┌──────────────────────────────┐  │
│   │ RAG-Only System Prompt       │  │
│   │ (Enforces context-only rule) │  │
│   └──────────────────────────────┘  │
└──┬────────┬────────────┬────────────┘
   │        │            │
   ▼        ▼            ▼
┌──────┐ ┌─────┐  ┌────────────┐
│Persona│ │ RAG │  │Model Router│
│Manager│ │     │  │  (Failover)│
└───────┘ └──┬──┘  └─────┬──────┘
             │            │
             ▼            ▼
        ┌────────┐   ┌──────────┐
        │pgvector│   │LLM Providers│
        └────────┘   └──────────┘
```

## RAG-Only Behavior

This system is **strictly RAG-only**:

- All answers are based ONLY on indexed documents in the knowledge base
- The system NEVER uses the LLM's general knowledge or training data
- If the knowledge base doesn't contain relevant information, the system responds: "I don't have enough information in my knowledge base to answer that question."
- Personas can customize style/tone but CANNOT override the RAG-only rules
- Optional self-check feature validates that answers use only the provided context

## Prerequisites

- Docker & docker-compose
- Node.js 18+ (for local development)
- Google AI Studio API key (free tier available)
- OpenAI API key (for embeddings)
- OpenRouter API key (optional, for fallback providers)

## Quick Start

### 1. Clone and Setup

```bash
cd purpose-agnostic-agent
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and add your API keys:

```env
# Required
GOOGLE_AI_API_KEY=AIzaSyC6X66iVmYcZqdnPQnvzaHQ-GNE1wpDrS4
OPENAI_API_KEY=your_openai_key_here

# Usage Tracking (for free tier)
USAGE_TRACKING_ENABLED=true
DAILY_REQUEST_LIMIT=1500
DAILY_TOKEN_LIMIT=1000000
RPM_LIMIT=15

# Optional (for fallback providers)
OPENROUTER_API_KEY=your_openrouter_key_here
OLLAMA_URL=http://ollama:11434
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/universal_brain
REDIS_URL=redis://redis:6379
```

### 3. Run Setup Script

```bash
bash setup.sh
```

This will:
- Create necessary directories
- Start all services with Docker
- Initialize the database
- Display service URLs

### 4. Access the Application

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## API Endpoints

### Chat

```bash
# Send a chat message
POST /api/chat
{
  "agent_id": "general-assistant",
  "question": "What is NestJS?",
  "sessionId": "optional-session-id"
}

# Response
{
  "answer": "NestJS is a progressive Node.js framework...",
  "citations": [
    {
      "sourcePath": "/knowledge/technical/nestjs.pdf",
      "content": "Relevant context...",
      "score": 0.85
    }
  ],
  "modelUsed": "gpt-4o",
  "sessionId": "uuid"
}
```

### Agents

```bash
# List available agents
GET /api/agents

# Response
[
  {
    "id": "general-assistant",
    "name": "General Assistant",
    "description": "A helpful general-purpose assistant",
    "knowledgeCategory": "general"
  }
]
```

### Persona Management

```bash
# Create a new persona
POST /api/personas
{
  "id": "custom-agent",
  "name": "Custom Agent",
  "description": "A custom agent",
  "extraInstructions": "Be concise and use bullet points when appropriate.",
  "knowledgeCategory": "general",
  "temperature": 0.7,
  "maxTokens": 1000
}

# Update a persona
PUT /api/personas/:id
{
  "name": "Updated Name",
  "extraInstructions": "Updated style instructions",
  "temperature": 0.8
}

# Delete a persona
DELETE /api/personas/:id
```

**Note**: Personas can only customize style/tone via `extraInstructions`. The core RAG-only system prompt is immutable.

## Persona Configuration

Personas define the style and tone of responses, but CANNOT override RAG-only rules. They are defined in `config/personas.json`:

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

**Important**: The `extraInstructions` field can only customize style/tone. The core RAG-only system prompt is shared across all personas and cannot be overridden.

## Knowledge Ingestion

Place PDF documents in the `knowledge/` directory organized by category:

```
knowledge/
├── general/
│   └── general-info.pdf
├── technical/
│   └── technical-docs.pdf
└── creative/
    └── creative-writing.pdf
```

Documents are automatically:
1. Parsed and chunked
2. Embedded using OpenAI text-embedding-3-small
3. Stored in pgvector for similarity search

## RAG Self-Check (Optional)

The system includes an optional self-check feature that validates answers use only the provided context:

```env
# Enable self-check (adds ~1-2 seconds latency per request)
RAG_SELF_CHECK_ENABLED=true
```

When enabled:
- After generating an answer, the system asks the LLM to validate it uses only the context
- If validation fails, the system responds: "I don't have enough information in my knowledge base to answer that question."
- This adds extra latency but provides stronger guarantees of RAG-only behavior

**Recommendation**: Enable in production for critical applications where accuracy is paramount. Disable for development or when latency is a concern.

## Observability

### Structured Logging

All logs are in JSON format with context:

```json
{
  "timestamp": "2024-02-24T10:00:00.000Z",
  "level": "info",
  "service": "ChatService",
  "message": "Chat request completed",
  "context": {
    "agent_id": "general-assistant",
    "session_id": "uuid",
    "model_used": "gpt-4o"
  }
}
```

### Optional Observability Stack

Start Seq, Grafana, and Prometheus:

```bash
docker-compose -f docker-compose.observability.yml up -d
```

Access:
- **Seq**: http://localhost:5341
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

See [OBSERVABILITY.md](docs/OBSERVABILITY.md) for details on swapping providers.

## Development

### Local Development

```bash
npm install
npm run start:dev
```

### Run Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

### Build

```bash
npm run build
```

## Docker Services

- **api**: NestJS application
- **postgres**: PostgreSQL with pgvector
- **redis**: Redis for background jobs
- **ollama**: Local LLM (optional)

### View Logs

```bash
docker-compose logs -f api
```

### Stop Services

```bash
docker-compose down
```

## Failover Behavior

The Model Router implements four-tier failover:

1. **Primary**: Google Gemini Pro (free tier, 30s timeout)
2. **Fallback 1**: OpenRouter GPT-4o (30s timeout)
3. **Fallback 2**: Claude-3.5 via OpenRouter (30s timeout)
4. **Local**: Ollama (60s timeout)

Failover triggers:
- HTTP 5xx errors
- Connection timeouts
- Connection refused

All failover events are logged to the database.

## Usage Tracking (Free Tier Protection)

To stay within Gemini's free tier limits, enable usage tracking:

```env
USAGE_TRACKING_ENABLED=true
DAILY_REQUEST_LIMIT=1500      # Gemini free tier: 1,500 requests/day
DAILY_TOKEN_LIMIT=1000000     # Gemini free tier: 1M tokens/day
RPM_LIMIT=15                  # Gemini free tier: 15 requests/minute
```

When limits are reached:
- The system automatically fails over to the next provider (GPT-4o, Claude, or Ollama)
- Warnings are logged when approaching 80% of limits
- Daily limits reset at midnight
- RPM limits reset every minute

To disable tracking (for paid tiers):
```env
USAGE_TRACKING_ENABLED=false
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `GOOGLE_AI_API_KEY` | Yes | - | Google AI Studio API key (primary LLM) |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for embeddings |
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key (fallback LLMs) |
| `OLLAMA_URL` | No | http://ollama:11434 | Ollama endpoint |
| `RAG_SELF_CHECK_ENABLED` | No | false | Enable self-check to validate RAG-only answers |
| `USAGE_TRACKING_ENABLED` | No | false | Enable usage tracking for API limits |
| `DAILY_REQUEST_LIMIT` | No | 999999 | Daily request limit (set to 1500 for Gemini free tier) |
| `DAILY_TOKEN_LIMIT` | No | 999999999 | Daily token limit (set to 1000000 for Gemini free tier) |
| `RPM_LIMIT` | No | 999 | Requests per minute limit (set to 15 for Gemini free tier) |
| `PORT` | No | 3000 | Application port |
| `NODE_ENV` | No | development | Environment |
| `LOG_LEVEL` | No | info | Log level |

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### LLM Provider Issues

Check health endpoint:

```bash
curl http://localhost:3000/health/ready
```

View failover events in database:

```sql
SELECT * FROM failover_events ORDER BY occurred_at DESC LIMIT 10;
```

### Redis Connection Issues

```bash
# Check Redis
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

## License

MIT
