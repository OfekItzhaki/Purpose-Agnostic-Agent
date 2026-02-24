# Design Document: Universal Brain

## Overview

Universal Brain is a NestJS-based backend system that provides intelligent agent capabilities through a sophisticated architecture combining LLM routing with automatic failover, RAG-based knowledge retrieval using pgvector, and dynamic persona management. The system exposes both MCP Server tools and REST API endpoints, enabling flexible interaction patterns for diverse client applications.

The system follows THE_HORIZON_STANDARD principles with emphasis on:
- Property-based correctness validation
- Container-first deployment
- Standardized error handling (RFC 7807)
- Comprehensive observability
- Type-safe implementation throughout

### Key Capabilities

1. **Multi-Provider LLM Routing**: Automatic failover across GPT-4o → Claude-3.5 → Ollama
2. **Domain-Specific Knowledge**: RAG system with categorized knowledge bases using pgvector
3. **Dynamic Personas**: Configuration-driven AI agents with specialized roles
4. **Dual Protocol Support**: Both MCP Server tools and REST API endpoints
5. **Production-Ready Infrastructure**: Background jobs, health monitoring, security headers

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        MCP[MCP Client]
        REST[REST Client]
    end
    
    subgraph "API Layer"
        MCPS[MCP Server]
        API[REST API Controller]
    end
    
    subgraph "Service Layer"
        PM[Persona Manager]
        MR[Model Router]
        RAG[RAG System]
        BG[Background Jobs]
    end
    
    subgraph "Infrastructure Layer"
        PG[(PostgreSQL + pgvector)]
        RD[(Redis)]
        LLM1[OpenRouter/GPT-4o]
        LLM2[Anthropic/Claude-3.5]
        LLM3[Ollama/Local]
    end
    
    MCP --> MCPS
    REST --> API
    MCPS --> PM
    API --> PM
    PM --> MR
    PM --> RAG
    MR --> LLM1
    MR -.failover.-> LLM2
    MR -.failover.-> LLM3
    RAG --> PG
    BG --> PG
    BG --> RD
    API --> BG
```

### Component Responsibilities

#### API Layer

**MCP Server**
- Exposes `ask_agent` and `search_knowledge` tools
- Handles MCP protocol serialization/deserialization
- Routes requests to appropriate service layer components

**REST API Controller**
- Exposes `/api/chat` and `/api/agents` endpoints
- Validates request payloads using DTOs
- Manages HTTP-specific concerns (headers, status codes)

#### Service Layer

**Persona Manager**
- Loads and validates persona configurations from JSON
- Provides persona lookup by agent_id
- Ensures system prompts are applied at request time
- Filters knowledge queries by persona's category

**Model Router**
- Implements three-tier failover: GPT-4o → Claude-3.5 → Ollama
- Tracks provider health and timeout thresholds
- Logs failover events with context
- Returns provider name with each response

**RAG System**
- Manages document ingestion and chunking
- Generates and stores embeddings in pgvector
- Performs vector similarity search with category filtering
- Returns results with citations (source path, chunk location)

**Background Jobs**
- Processes PDF ingestion asynchronously
- Generates embeddings without blocking API requests
- Implements retry logic with exponential backoff
- Provides job status tracking

### Request Flow Diagrams

#### Chat Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant PM as Persona Manager
    participant RAG as RAG System
    participant MR as Model Router
    participant LLM
    participant DB as PostgreSQL
    
    Client->>API: POST /api/chat {agent_id, question, sessionId}
    API->>PM: getPersona(agent_id)
    PM-->>API: Persona config
    API->>RAG: search(question, category)
    RAG->>DB: Vector similarity query
    DB-->>RAG: Top-k chunks with metadata
    RAG-->>API: Context + citations
    API->>MR: generate(system_prompt, context, question)
    MR->>LLM: API call (GPT-4o)
    alt Success
        LLM-->>MR: Response
        MR-->>API: {answer, modelUsed: "gpt-4o"}
    else Failure
        MR->>LLM: API call (Claude-3.5)
        LLM-->>MR: Response
        MR-->>API: {answer, modelUsed: "claude-3.5"}
    end
    API-->>Client: {answer, citations, modelUsed}
```

#### Knowledge Ingestion Flow

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant Queue as BullMQ
    participant Worker
    participant Parser
    participant Embedder
    participant DB as PostgreSQL
    
    Admin->>API: Upload PDF to /knowledge/medical/
    API->>Queue: Enqueue ingestion job
    API-->>Admin: {jobId, status: "queued"}
    Queue->>Worker: Process job
    Worker->>Parser: Extract text from PDF
    Parser-->>Worker: Text chunks
    Worker->>Embedder: Generate embeddings
    Embedder-->>Worker: Vector embeddings
    Worker->>DB: Store chunks + embeddings + metadata
    DB-->>Worker: Success
    Worker->>Queue: Mark job complete
```

## Components and Interfaces

### Persona Manager

**Purpose**: Manages AI agent configurations and ensures proper persona application at request time.

**Interface**:
```typescript
interface PersonaManager {
  loadPersonas(configPath: string): Promise<void>;
  getPersona(agentId: string): Persona | null;
  listPersonas(): PersonaInfo[];
  validatePersona(persona: Persona): ValidationResult;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  knowledgeCategory: string;
  temperature?: number;
  maxTokens?: number;
}

interface PersonaInfo {
  id: string;
  name: string;
  description: string;
  knowledgeCategory: string;
}
```

**Key Design Decisions**:
- Personas are loaded once at startup and cached in memory
- System prompts are NOT sent to LLM during initialization (lazy application)
- Configuration validation happens at load time to fail fast
- JSON schema validation ensures all required fields are present

### Model Router

**Purpose**: Routes LLM requests with automatic failover across multiple providers.

**Interface**:
```typescript
interface ModelRouter {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  getProviderHealth(): ProviderHealthStatus[];
}

interface GenerateRequest {
  systemPrompt: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

interface GenerateResponse {
  content: string;
  modelUsed: string;
  tokensUsed: number;
  latencyMs: number;
}

interface ProviderHealthStatus {
  name: string;
  tier: 'primary' | 'fallback' | 'local';
  available: boolean;
  lastFailure?: Date;
}
```

**Failover Strategy**:
1. **Primary Tier (GPT-4o)**: First attempt, 30s timeout
2. **Fallback Tier (Claude-3.5)**: Second attempt on primary failure, 30s timeout
3. **Local Tier (Ollama)**: Final fallback, 60s timeout (slower local inference)

**Failure Detection**:
- HTTP 5xx errors trigger immediate failover
- HTTP 429 (rate limit) triggers failover after 3 retries
- Timeout triggers immediate failover
- Connection errors trigger immediate failover

**Logging Requirements**:
- Log every failover event with: timestamp, reason, failed provider, successful provider
- Log latency for each successful request
- Log token usage for cost tracking

### RAG System

**Purpose**: Retrieves relevant knowledge chunks from vector database to augment LLM context.

**Interface**:
```typescript
interface RAGSystem {
  ingestDocument(path: string, category: string): Promise<string>; // Returns jobId
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  getDocumentStatus(jobId: string): Promise<JobStatus>;
}

interface SearchOptions {
  category?: string;
  topK?: number;
  minScore?: number;
}

interface SearchResult {
  content: string;
  metadata: ChunkMetadata;
  score: number;
}

interface ChunkMetadata {
  sourcePath: string;
  category: string;
  chunkIndex: number;
  timestamp: Date;
}
```

**Chunking Strategy**:
- Default chunk size: 512 tokens with 50 token overlap
- Preserve paragraph boundaries when possible
- Include metadata in each chunk for citation tracking

**Embedding Model**:
- Use OpenAI `text-embedding-3-small` (1536 dimensions)
- Consistent model across ingestion and search
- Batch embedding generation for efficiency

**Vector Search**:
- Use pgvector's `<=>` operator for cosine similarity
- Create index: `CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)`
- Default top-k: 5 chunks
- Minimum similarity score: 0.7 (configurable)

### MCP Server

**Purpose**: Exposes agent capabilities through Model Context Protocol.

**Tools**:

```typescript
// Tool 1: ask_agent
{
  name: "ask_agent",
  description: "Ask a question to a specific AI agent with domain expertise",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: {
        type: "string",
        description: "The ID of the agent to query (e.g., 'medical-doc', 'legal-advisor')"
      },
      question: {
        type: "string",
        description: "The question to ask the agent"
      },
      session_id: {
        type: "string",
        description: "Optional session ID for conversation continuity"
      }
    },
    required: ["agent_id", "question"]
  }
}

// Tool 2: search_knowledge
{
  name: "search_knowledge",
  description: "Search the knowledge base for relevant information",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      },
      category: {
        type: "string",
        description: "Optional category filter (e.g., 'medical', 'legal')"
      },
      top_k: {
        type: "number",
        description: "Number of results to return (default: 5)"
      }
    },
    required: ["query"]
  }
}
```

### REST API

**Endpoints**:

```typescript
// POST /api/chat
interface ChatRequest {
  agent_id: string;
  question: string;
  sessionId?: string;
}

interface ChatResponse {
  answer: string;
  citations: Citation[];
  modelUsed: string;
  sessionId: string;
}

interface Citation {
  sourcePath: string;
  content: string;
  score: number;
}

// GET /api/agents
interface AgentsResponse {
  agents: PersonaInfo[];
}

// GET /health
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}

// GET /health/ready
interface ReadinessResponse {
  ready: boolean;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    llmProviders: DependencyStatus;
  };
}

interface DependencyStatus {
  available: boolean;
  latencyMs?: number;
  error?: string;
}
```

### Background Jobs

**Job Types**:

```typescript
interface IngestDocumentJob {
  type: 'ingest_document';
  data: {
    filePath: string;
    category: string;
  };
  options: {
    attempts: 3;
    backoff: {
      type: 'exponential';
      delay: 1000;
    };
  };
}

interface GenerateEmbeddingsJob {
  type: 'generate_embeddings';
  data: {
    chunks: TextChunk[];
    documentId: string;
  };
  options: {
    attempts: 5;
    backoff: {
      type: 'exponential';
      delay: 2000;
    };
  };
}
```

**Queue Configuration**:
- Use separate queues for different job types
- Priority: embeddings (high), ingestion (normal)
- Concurrency: 2 workers per queue
- Job retention: 7 days for completed jobs, 30 days for failed jobs

## Data Models

### Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents table
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL,
  category TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(source_path)
);

-- Knowledge chunks table
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Create vector similarity index
CREATE INDEX knowledge_chunks_embedding_idx 
  ON knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create category index for filtering
CREATE INDEX knowledge_chunks_category_idx 
  ON knowledge_chunks(document_id);

-- Chat sessions table (for conversation continuity)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for session message retrieval
CREATE INDEX chat_messages_session_idx 
  ON chat_messages(session_id, created_at);

-- Failover events table (for monitoring)
CREATE TABLE failover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_provider TEXT NOT NULL,
  successful_provider TEXT NOT NULL,
  reason TEXT NOT NULL,
  request_id TEXT,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for failover analysis
CREATE INDEX failover_events_occurred_idx 
  ON failover_events(occurred_at DESC);
```

### TypeScript Entity Models

```typescript
// Domain entities
interface KnowledgeDocument {
  id: string;
  sourcePath: string;
  category: string;
  fileHash: string;
  totalChunks: number;
  ingestedAt: Date;
  metadata?: Record<string, unknown>;
}

interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokenCount: number;
  createdAt: Date;
}

interface ChatSession {
  id: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  tokensUsed?: number;
  createdAt: Date;
}

interface FailoverEvent {
  id: string;
  failedProvider: string;
  successfulProvider: string;
  reason: string;
  requestId?: string;
  occurredAt: Date;
}
```

### Configuration Models

```typescript
// Persona configuration file structure
interface PersonaConfig {
  personas: Persona[];
}

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  knowledgeCategory: string;
  temperature?: number;
  maxTokens?: number;
}

// Example personas.json
{
  "personas": [
    {
      "id": "medical-doc",
      "name": "Medical Documentation Assistant",
      "description": "Specialized in medical terminology and clinical documentation",
      "systemPrompt": "You are a medical documentation assistant with expertise in clinical terminology...",
      "knowledgeCategory": "medical",
      "temperature": 0.3,
      "maxTokens": 2000
    },
    {
      "id": "legal-advisor",
      "name": "Legal Research Assistant",
      "description": "Specialized in legal research and case analysis",
      "systemPrompt": "You are a legal research assistant with expertise in case law...",
      "knowledgeCategory": "legal",
      "temperature": 0.2,
      "maxTokens": 3000
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Primary Provider Failover

*For any* LLM request, when the primary provider (GPT-4o) fails or times out, the Model Router should automatically route the request to the fallback provider (Claude-3.5) and complete successfully.

**Validates: Requirements 1.2**

### Property 2: Cascading Failover to Local Provider

*For any* LLM request, when both primary and fallback providers fail, the Model Router should route the request to the local provider (Ollama) and complete successfully.

**Validates: Requirements 1.3**

### Property 3: Provider Name in Response

*For any* successful LLM request, the response should include the name of the provider that handled the request.

**Validates: Requirements 1.5**

### Property 4: Failover Event Logging

*For any* failover event, the system should create a log entry containing timestamp, reason, failed provider, and successful provider.

**Validates: Requirements 1.6**

### Property 5: Category Tagging from Folder Structure

*For any* document ingested from `/knowledge/{category}/*.pdf`, all resulting chunks should be tagged with the corresponding category extracted from the folder path.

**Validates: Requirements 2.2, 9.3**

### Property 6: Embedding Generation and Storage

*For any* document chunk created during ingestion, the system should generate an embedding vector and store it in the vector database with consistent dimensionality.

**Validates: Requirements 2.3, 9.4**

### Property 7: Search Results Ordered by Similarity

*For any* search query, the returned results should be ordered by descending similarity score (most relevant first).

**Validates: Requirements 2.4**

### Property 8: Category Filtering in Search

*For any* search query with a specified category filter, all returned results should belong only to that category.

**Validates: Requirements 2.5**

### Property 9: Complete Metadata in Search Results

*For any* search result, the response should include source document path, chunk location (index), and similarity score.

**Validates: Requirements 2.6, 8.1**

### Property 10: Invalid Persona Rejection

*For any* persona configuration missing required fields (id, name, description, system_prompt, or knowledge_category), the validation should fail with a descriptive error message.

**Validates: Requirements 3.2**

### Property 11: Persona Lookup by Agent ID

*For any* valid agent ID, the Persona Manager should return the corresponding persona configuration with all fields intact.

**Validates: Requirements 3.3**

### Property 12: Knowledge Category Filter Propagation

*For any* persona-based query, when the persona specifies a knowledge_category, that category filter should be passed to the RAG system and applied to the search.

**Validates: Requirements 3.5**

### Property 13: Invalid Agent ID Error

*For any* invalid or non-existent agent ID, the Persona Manager should return an error indicating the agent was not found.

**Validates: Requirements 3.6**

### Property 14: MCP Response Structure

*For any* successful MCP tool invocation, the response should include both answer text and metadata (modelUsed, citations).

**Validates: Requirements 4.5**

### Property 15: Chat Request Validation

*For any* POST request to `/api/chat`, the system should accept requests with valid agent_id and question fields, and reject requests missing these required fields with HTTP 400.

**Validates: Requirements 5.2**

### Property 16: Complete Chat Response Structure

*For any* successful chat request, the response should include answer text, an array of citations with source metadata, and the model name used.

**Validates: Requirements 5.6, 8.2, 8.3, 8.4**

### Property 17: Session Continuity

*For any* two chat requests with the same sessionId, the second request should have access to the conversation history from the first request.

**Validates: Requirements 5.7**

### Property 18: Agent List Response Format

*For any* GET request to `/api/agents`, the response should be a JSON array where each element contains id, name, description, and knowledge_category fields.

**Validates: Requirements 6.2, 6.3**

### Property 19: PDF Chunking Behavior

*For any* PDF document, when parsed with a configured chunk size, the resulting chunks should not exceed the specified token limit (with allowance for boundary preservation).

**Validates: Requirements 9.2**

### Property 20: Complete Chunk Metadata Storage

*For any* stored knowledge chunk, the database record should include source_path, category, chunk_index, timestamp, and embedding vector.

**Validates: Requirements 9.5**

### Property 21: Persona Configuration Round-Trip

*For any* valid Persona object, serializing to JSON then parsing back should produce an equivalent Persona object with all fields preserved.

**Validates: Requirements 10.4**

### Property 22: Invalid Configuration Error Messages

*For any* persona configuration with invalid JSON or missing required fields, the parser should return a descriptive error message indicating which fields are invalid or missing.

**Validates: Requirements 10.5**

### Property 23: RFC 7807 Error Response Format

*For any* error response, the JSON body should conform to RFC 7807 ProblemDetails format with type, title, status, detail, and instance fields.

**Validates: Requirements 11.2, 11.3**

### Property 24: Error Logging Before Response

*For any* error caught by the global error handler, a log entry should be created with full context before the error response is sent to the client.

**Validates: Requirements 11.5**

### Property 25: Data Persistence Across Restarts

*For any* data written to the database (personas, knowledge chunks, sessions), the data should remain accessible after container restart.

**Validates: Requirements 12.6**

### Property 26: Async Job Queuing with Immediate Response

*For any* resource-intensive operation (PDF ingestion, embedding generation), the system should queue the operation as a background job and return a job ID immediately without blocking.

**Validates: Requirements 13.2, 13.3**

### Property 27: Job ID in Response

*For any* background job submission, the response should include a job ID that can be used to track job status.

**Validates: Requirements 13.6**

### Property 28: Job Failure Logging and Retry

*For any* background job that fails, the system should log the failure with full context and retry according to the configured retry policy.

**Validates: Requirements 13.7**

### Property 29: Structured JSON Logging

*For any* log entry, the output should be valid JSON with timestamp, level, service_name, request_id, and message fields.

**Validates: Requirements 14.1, 14.2**

### Property 30: Exponential Backoff Retry Timing

*For any* transient failure with retry logic, the delay between retry attempts should increase exponentially (e.g., 1s, 2s, 4s, 8s).

**Validates: Requirements 14.6**

### Property 31: Sensitive Data Redaction in Logs

*For any* log entry, sensitive data (passwords, API keys, PII) should be redacted or not present in the log output.

**Validates: Requirements 14.7**

### Property 32: Security Headers on All Responses

*For any* HTTP response, the headers should include Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.

**Validates: Requirements 15.1**

### Property 33: Input Validation and Sanitization

*For any* user input (query parameters, request body, path parameters), the system should validate format and sanitize content before processing to prevent injection attacks.

**Validates: Requirements 15.4**

### Property 34: OpenAPI Documentation Completeness

*For any* REST endpoint, the OpenAPI documentation should include request schema, response schema, parameter descriptions, and error response formats.

**Validates: Requirements 16.3, 16.4**

### Property 35: Persona Creation Validation

*For any* POST request to `/api/personas`, the system should validate all required fields and reject invalid requests with HTTP 400 and descriptive error messages.

**Validates: Requirements 19.2**

### Property 36: Persona Creation Persistence

*For any* valid persona creation request, the new persona should be persisted and retrievable via GET `/api/agents`.

**Validates: Requirements 19.3**

### Property 37: Persona Update Persistence

*For any* valid PUT request to `/api/personas/:id`, the updated persona fields should be persisted and reflected in subsequent GET requests.

**Validates: Requirements 19.5**

### Property 38: Persona Deletion

*For any* DELETE request to `/api/personas/:id` for an existing persona, the persona should be removed and no longer appear in GET `/api/agents` responses.

**Validates: Requirements 19.7**

### Property 39: Atomic File Writes

*For any* persona modification when using JSON file storage, the write operation should be atomic (either fully complete or not at all), preventing partial writes.

**Validates: Requirements 19.9**

### Property 40: Persona Validation Error Response

*For any* persona management request (POST, PUT) with invalid data, the response should be HTTP 400 with a descriptive error message indicating which fields are invalid.

**Validates: Requirements 19.11**

### Property 41: Circuit Breaker Opens on Repeated Failures

*For any* external service, when consecutive requests fail beyond the configured threshold, the circuit breaker should open and return fast failures without attempting the external call.

**Validates: Requirements 21.10**

### Property 42: Circuit Breaker Recovery Testing

*For any* open circuit breaker, the system should periodically attempt a test request to determine if the external service has recovered.

**Validates: Requirements 21.11**

### Property 43: Circuit Breaker Closes on Recovery

*For any* open circuit breaker, when test requests succeed beyond the configured threshold, the circuit breaker should close and resume normal operation.

**Validates: Requirements 21.12**

## Error Handling

### Error Classification

The system distinguishes between two types of errors:

1. **Operational Errors** (Expected, recoverable)
   - Invalid user input (400 Bad Request)
   - Resource not found (404 Not Found)
   - Authentication failures (401 Unauthorized)
   - Rate limit exceeded (429 Too Many Requests)
   - External service unavailable (503 Service Unavailable)

2. **Programmer Errors** (Unexpected, bugs)
   - Null pointer exceptions
   - Type errors
   - Assertion failures
   - Unhandled promise rejections

### Global Error Handler

All errors are caught by a global NestJS exception filter that:

1. Logs the error with full context (stack trace, request details, user info)
2. Classifies the error as operational or programmer error
3. Returns RFC 7807 compliant response
4. Sends alerts for programmer errors (via monitoring system)

### RFC 7807 Error Response Format

```typescript
interface ProblemDetails {
  type: string;        // URI reference identifying the problem type
  title: string;       // Short, human-readable summary
  status: number;      // HTTP status code
  detail: string;      // Human-readable explanation specific to this occurrence
  instance: string;    // URI reference identifying this specific occurrence
  [key: string]: any;  // Additional problem-specific fields
}
```

### Error Response Examples

```typescript
// Invalid input
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The 'agent_id' field is required but was not provided",
  "instance": "/api/chat",
  "invalidFields": ["agent_id"]
}

// External service failure
{
  "type": "https://api.example.com/errors/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "All LLM providers are currently unavailable. Please try again later.",
  "instance": "/api/chat",
  "failedProviders": ["gpt-4o", "claude-3.5", "ollama"]
}

// Resource not found
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "No persona found with agent_id 'unknown-agent'",
  "instance": "/api/chat",
  "requestedAgentId": "unknown-agent"
}
```

### Error Handling Strategy by Component

**Model Router**:
- Timeout errors → Trigger failover to next provider
- HTTP 5xx errors → Trigger failover to next provider
- HTTP 429 errors → Retry with backoff, then failover
- All providers failed → Return 503 with details

**RAG System**:
- Database connection errors → Retry with exponential backoff
- Embedding service errors → Retry with exponential backoff
- No results found → Return empty array (not an error)
- Invalid category → Return 400 with validation error

**Persona Manager**:
- Invalid agent_id → Return 404 with descriptive message
- Configuration file not found → Fail at startup with clear error
- Invalid JSON → Fail at startup with parse error details
- Missing required fields → Fail at startup with validation errors

**Background Jobs**:
- Transient failures → Retry with exponential backoff (max 5 attempts)
- Permanent failures → Log error, mark job as failed, send alert
- Timeout → Retry with longer timeout
- All retries exhausted → Mark job as failed, notify admin

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'TIMEOUT',
    'CONNECTION_ERROR',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMIT'
  ]
};
```

### Circuit Breaker Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes before closing
  timeout: number;               // Request timeout in ms
  resetTimeout: number;          // Time before attempting recovery in ms
}

// Circuit breaker for external APIs
const EXTERNAL_API_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,           // Open after 5 consecutive failures
  successThreshold: 2,           // Close after 2 consecutive successes
  timeout: 30000,                // 30 second timeout
  resetTimeout: 60000            // Try recovery after 60 seconds
};
```

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific examples and edge cases with property-based tests for universal correctness guarantees. This ensures both concrete behavior validation and comprehensive input coverage.

### Property-Based Testing

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing cases
- Timeout: 30 seconds per property test

**Property Test Structure**:

```typescript
import * as fc from 'fast-check';

describe('Feature: universal-brain, Property 5: Category Tagging', () => {
  it('should tag all chunks with category from folder path', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // category
        fc.array(fc.string({ minLength: 10 })),     // document chunks
        async (category, chunks) => {
          // Arrange: Create document in /knowledge/{category}/
          const docPath = `/knowledge/${category}/test.pdf`;
          
          // Act: Ingest document
          const jobId = await ragSystem.ingestDocument(docPath, category);
          await waitForJobCompletion(jobId);
          
          // Assert: All chunks should have the category tag
          const storedChunks = await db.query(
            'SELECT * FROM knowledge_chunks WHERE document_id = $1',
            [docPath]
          );
          
          expect(storedChunks.every(chunk => chunk.category === category)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Coverage**:

Each of the 43 correctness properties will have a corresponding property-based test with the tag format:
```typescript
// Feature: universal-brain, Property {number}: {property_title}
```

### Unit Testing

**Framework**: Jest

**Coverage Target**: 80% minimum on business logic (services, handlers, utilities)

**Unit Test Focus**:
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, boundary values, special characters)
- Error conditions (invalid inputs, missing data, constraint violations)
- Integration points between components (mocked dependencies)

**Unit Test Examples**:

```typescript
// Example: Specific behavior validation
describe('PersonaManager', () => {
  it('should load personas from JSON file on startup', async () => {
    // Arrange
    const configPath = './test-data/personas.json';
    const manager = new PersonaManager();
    
    // Act
    await manager.loadPersonas(configPath);
    
    // Assert
    const personas = manager.listPersonas();
    expect(personas).toHaveLength(2);
    expect(personas[0].id).toBe('medical-doc');
  });
  
  // Edge case: Empty configuration
  it('should handle empty persona configuration gracefully', async () => {
    const configPath = './test-data/empty-personas.json';
    const manager = new PersonaManager();
    
    await manager.loadPersonas(configPath);
    
    expect(manager.listPersonas()).toHaveLength(0);
  });
  
  // Error condition: Invalid JSON
  it('should throw descriptive error for invalid JSON', async () => {
    const configPath = './test-data/invalid.json';
    const manager = new PersonaManager();
    
    await expect(manager.loadPersonas(configPath))
      .rejects
      .toThrow(/Invalid JSON/);
  });
});
```

### Integration Testing

**Framework**: Jest + Supertest

**Test Database**: PostgreSQL test container with pgvector

**Integration Test Focus**:
- End-to-end API request/response flows
- Database interactions with real queries
- Background job processing
- Multi-component interactions

**Integration Test Examples**:

```typescript
describe('POST /api/chat (Integration)', () => {
  let app: INestApplication;
  let db: Database;
  
  beforeAll(async () => {
    // Start test containers
    db = await startTestDatabase();
    app = await createTestApp(db);
    
    // Seed test data
    await seedPersonas(db);
    await seedKnowledgeChunks(db);
  });
  
  afterAll(async () => {
    await app.close();
    await db.close();
  });
  
  it('should return answer with citations for valid request', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/chat')
      .send({
        agent_id: 'medical-doc',
        question: 'What is hypertension?',
        sessionId: 'test-session-1'
      })
      .expect(200);
    
    expect(response.body).toMatchObject({
      answer: expect.any(String),
      citations: expect.arrayContaining([
        expect.objectContaining({
          sourcePath: expect.any(String),
          content: expect.any(String),
          score: expect.any(Number)
        })
      ]),
      modelUsed: expect.any(String),
      sessionId: 'test-session-1'
    });
  });
  
  it('should return 404 for invalid agent_id', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/chat')
      .send({
        agent_id: 'non-existent-agent',
        question: 'Test question'
      })
      .expect(404);
    
    expect(response.body).toMatchObject({
      type: expect.stringContaining('not-found'),
      status: 404,
      detail: expect.stringContaining('non-existent-agent')
    });
  });
});
```

### Test Organization

```
src/
├── model-router/
│   ├── model-router.service.ts
│   ├── model-router.service.spec.ts          # Unit tests
│   └── model-router.integration.spec.ts      # Integration tests
├── rag/
│   ├── rag.service.ts
│   ├── rag.service.spec.ts                   # Unit tests
│   ├── rag.properties.spec.ts                # Property-based tests
│   └── rag.integration.spec.ts               # Integration tests
├── persona/
│   ├── persona.service.ts
│   ├── persona.service.spec.ts               # Unit tests
│   ├── persona.properties.spec.ts            # Property-based tests
│   └── persona.integration.spec.ts           # Integration tests
└── chat/
    ├── chat.controller.ts
    ├── chat.controller.spec.ts               # Unit tests
    └── chat.e2e.spec.ts                      # End-to-end tests
```

### Test Data Management

**Fixtures**: Reusable test data in `test/fixtures/`
- `personas.json`: Sample persona configurations
- `documents/`: Sample PDF files for ingestion tests
- `embeddings.json`: Pre-computed embeddings for fast tests

**Factories**: Test data builders using `@faker-js/faker`
```typescript
export class PersonaFactory {
  static create(overrides?: Partial<Persona>): Persona {
    return {
      id: faker.string.uuid(),
      name: faker.person.jobTitle(),
      description: faker.lorem.sentence(),
      systemPrompt: faker.lorem.paragraph(),
      knowledgeCategory: faker.helpers.arrayElement(['medical', 'legal', 'technical']),
      ...overrides
    };
  }
}
```

### Mocking Strategy

**External Dependencies**:
- OpenRouter API: Mock with `nock` or `msw`
- Embedding service: Mock with pre-computed vectors
- Redis: Use `ioredis-mock`
- PostgreSQL: Use test containers for integration tests, mock for unit tests

**Internal Dependencies**:
- Use Jest mocks for service dependencies in unit tests
- Use real implementations in integration tests
- Use dependency injection to swap implementations

### Continuous Integration

**Test Execution**:
1. Unit tests: Run on every commit (fast feedback)
2. Property-based tests: Run on every commit (100 iterations)
3. Integration tests: Run on every PR
4. E2E tests: Run on every PR and before deployment

**Coverage Requirements**:
- Overall: 80% minimum
- Business logic (services): 90% minimum
- Controllers: 80% minimum
- Utilities: 95% minimum

**Test Performance**:
- Unit tests: < 5 seconds total
- Property-based tests: < 30 seconds total
- Integration tests: < 2 minutes total
- E2E tests: < 5 minutes total


## CQRS Implementation

### Command Query Responsibility Segregation

The system separates write operations (commands) from read operations (queries) using the NestJS CQRS module.

### Commands (Write Operations)

```typescript
// Create Persona Command
export class CreatePersonaCommand {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly systemPrompt: string,
    public readonly knowledgeCategory: string
  ) {}
}

@CommandHandler(CreatePersonaCommand)
export class CreatePersonaHandler implements ICommandHandler<CreatePersonaCommand> {
  constructor(private readonly personaRepository: PersonaRepository) {}
  
  async execute(command: CreatePersonaCommand): Promise<void> {
    const persona = new Persona(
      command.id,
      command.name,
      command.description,
      command.systemPrompt,
      command.knowledgeCategory
    );
    
    await this.personaRepository.save(persona);
  }
}

// Update Persona Command
export class UpdatePersonaCommand {
  constructor(
    public readonly id: string,
    public readonly updates: Partial<Persona>
  ) {}
}

// Delete Persona Command
export class DeletePersonaCommand {
  constructor(public readonly id: string) {}
}

// Ingest Document Command
export class IngestDocumentCommand {
  constructor(
    public readonly filePath: string,
    public readonly category: string
  ) {}
}

### Queries (Read Operations)

```typescript
// Get Persona Query
export class GetPersonaQuery {
  constructor(public readonly agentId: string) {}
}

@QueryHandler(GetPersonaQuery)
export class GetPersonaHandler implements IQueryHandler<GetPersonaQuery> {
  constructor(private readonly personaRepository: PersonaRepository) {}
  
  async execute(query: GetPersonaQuery): Promise<Persona | null> {
    return this.personaRepository.findById(query.agentId);
  }
}

// List Personas Query
export class ListPersonasQuery {}

@QueryHandler(ListPersonasQuery)
export class ListPersonasHandler implements IQueryHandler<ListPersonasQuery> {
  constructor(private readonly personaRepository: PersonaRepository) {}
  
  async execute(query: ListPersonasQuery): Promise<PersonaInfo[]> {
    return this.personaRepository.findAll();
  }
}

// Search Knowledge Query
export class SearchKnowledgeQuery {
  constructor(
    public readonly query: string,
    public readonly category?: string,
    public readonly topK?: number
  ) {}
}

@QueryHandler(SearchKnowledgeQuery)
export class SearchKnowledgeHandler implements IQueryHandler<SearchKnowledgeQuery> {
  constructor(private readonly ragService: RAGService) {}
  
  async execute(query: SearchKnowledgeQuery): Promise<SearchResult[]> {
    return this.ragService.search(query.query, {
      category: query.category,
      topK: query.topK || 5
    });
  }
}

## Repository Pattern

### Abstract Repository Interfaces

```typescript
// Persona Repository Interface
export interface PersonaRepository {
  save(persona: Persona): Promise<void>;
  findById(id: string): Promise<Persona | null>;
  findAll(): Promise<PersonaInfo[]>;
  update(id: string, updates: Partial<Persona>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Knowledge Chunk Repository Interface
export interface KnowledgeChunkRepository {
  save(chunk: KnowledgeChunk): Promise<void>;
  saveBatch(chunks: KnowledgeChunk[]): Promise<void>;
  findByDocumentId(documentId: string): Promise<KnowledgeChunk[]>;
  search(embedding: number[], options: SearchOptions): Promise<SearchResult[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
}

// Session Repository Interface
export interface SessionRepository {
  create(session: ChatSession): Promise<void>;
  findById(id: string): Promise<ChatSession | null>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  getMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  update(id: string, updates: Partial<ChatSession>): Promise<void>;
}

### Concrete Repository Implementations

#### PostgreSQL Implementation

```typescript
@Injectable()
export class PostgresPersonaRepository implements PersonaRepository {
  constructor(
    @InjectRepository(PersonaEntity)
    private readonly repository: Repository<PersonaEntity>
  ) {}
  
  async save(persona: Persona): Promise<void> {
    const entity = this.toEntity(persona);
    await this.repository.save(entity);
  }
  
  async findById(id: string): Promise<Persona | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }
  
  async findAll(): Promise<PersonaInfo[]> {
    const entities = await this.repository.find();
    return entities.map(e => this.toPersonaInfo(e));
  }
  
  async update(id: string, updates: Partial<Persona>): Promise<void> {
    await this.repository.update(id, updates);
  }
  
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
  
  private toEntity(persona: Persona): PersonaEntity {
    // Map domain model to database entity
  }
  
  private toDomain(entity: PersonaEntity): Persona {
    // Map database entity to domain model
  }
}

#### JSON File Storage Implementation

```typescript
@Injectable()
export class JsonFilePersonaRepository implements PersonaRepository {
  private personas: Map<string, Persona> = new Map();
  
  constructor(
    @Inject('CONFIG') private readonly config: AppConfig,
    private readonly fileSystem: FileSystemService
  ) {}
  
  async onModuleInit() {
    await this.loadFromFile();
  }
  
  async save(persona: Persona): Promise<void> {
    this.personas.set(persona.id, persona);
    await this.persistToFile();
  }
  
  async findById(id: string): Promise<Persona | null> {
    return this.personas.get(id) || null;
  }
  
  async findAll(): Promise<PersonaInfo[]> {
    return Array.from(this.personas.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      knowledgeCategory: p.knowledgeCategory
    }));
  }
  
  async update(id: string, updates: Partial<Persona>): Promise<void> {
    const existing = this.personas.get(id);
    if (!existing) throw new NotFoundException(`Persona ${id} not found`);
    
    this.personas.set(id, { ...existing, ...updates });
    await this.persistToFile();
  }
  
  async delete(id: string): Promise<void> {
    this.personas.delete(id);
    await this.persistToFile();
  }
  
  private async loadFromFile(): Promise<void> {
    const content = await this.fileSystem.readFile(this.config.personaConfigPath);
    const config = JSON.parse(content);
    
    for (const persona of config.personas) {
      this.personas.set(persona.id, persona);
    }
  }
  
  private async persistToFile(): Promise<void> {
    const config = {
      personas: Array.from(this.personas.values())
    };
    
    // Atomic write: write to temp file, then rename
    const tempPath = `${this.config.personaConfigPath}.tmp`;
    await this.fileSystem.writeFile(tempPath, JSON.stringify(config, null, 2));
    await this.fileSystem.rename(tempPath, this.config.personaConfigPath);
  }
}

## Design Patterns Implementation

### Strategy Pattern

#### LLM Provider Strategy

```typescript
// Strategy interface
export interface LLMProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  getName(): string;
  getTier(): 'primary' | 'fallback' | 'local';
  isAvailable(): Promise<boolean>;
}

// Concrete strategies
@Injectable()
export class OpenRouterGPT4Provider implements LLMProvider {
  constructor(private readonly httpService: HttpService) {}
  
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.httpService.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o',
        messages: this.formatMessages(request),
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://universal-brain.ai',
          'X-Title': 'Universal Brain'
        }
      }
    );
    
    return this.parseResponse(response.data);
  }
  
  getName(): string { return 'gpt-4o'; }
  getTier(): 'primary' { return 'primary'; }
  
  async isAvailable(): Promise<boolean> {
    // Health check implementation
  }
}

@Injectable()
export class ClaudeProvider implements LLMProvider {
  // Similar implementation for Claude-3.5
  getName(): string { return 'claude-3.5'; }
  getTier(): 'fallback' { return 'fallback'; }
}

@Injectable()
export class OllamaProvider implements LLMProvider {
  // Similar implementation for local Ollama
  getName(): string { return 'ollama'; }
  getTier(): 'local' { return 'local'; }
}

#### Embedding Service Strategy

```typescript
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

@Injectable()
export class OpenAIEmbeddingService implements EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.httpService.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text
      }
    );
    
    return response.data.data[0].embedding;
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Batch processing with rate limiting
  }
  
  getDimensions(): number { return 1536; }
}

@Injectable()
export class LocalEmbeddingService implements EmbeddingService {
  // Local embedding model (e.g., sentence-transformers)
  getDimensions(): number { return 384; }
}

#### Storage Backend Strategy

```typescript
export interface StorageBackend {
  savePersona(persona: Persona): Promise<void>;
  loadPersona(id: string): Promise<Persona | null>;
  listPersonas(): Promise<PersonaInfo[]>;
}

@Injectable()
export class DatabaseStorageBackend implements StorageBackend {
  // PostgreSQL implementation
}

@Injectable()
export class FileStorageBackend implements StorageBackend {
  // JSON file implementation
}

// Strategy selection based on configuration
@Injectable()
export class StorageBackendFactory {
  create(config: StorageConfig): StorageBackend {
    switch (config.type) {
      case 'database':
        return new DatabaseStorageBackend(config.databaseUrl);
      case 'file':
        return new FileStorageBackend(config.filePath);
      default:
        throw new Error(`Unknown storage type: ${config.type}`);
    }
  }
}

### Circuit Breaker Pattern

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  
  constructor(private readonly config: CircuitBreakerConfig) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
    }
    
    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      this.timeout()
    ]);
  }
  
  private timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new TimeoutError()), this.config.timeout);
    });
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }
  
  getState(): CircuitState {
    return this.state;
  }
}

### Factory Pattern

#### LLM Provider Factory

```typescript
@Injectable()
export class LLMProviderFactory {
  constructor(
    private readonly gpt4Provider: OpenRouterGPT4Provider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly ollamaProvider: OllamaProvider
  ) {}
  
  createProvider(name: string): LLMProvider {
    switch (name) {
      case 'gpt-4o':
        return this.gpt4Provider;
      case 'claude-3.5':
        return this.claudeProvider;
      case 'ollama':
        return this.ollamaProvider;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }
  
  getAllProviders(): LLMProvider[] {
    return [this.gpt4Provider, this.claudeProvider, this.ollamaProvider];
  }
  
  getProvidersByTier(): Map<string, LLMProvider[]> {
    const providers = this.getAllProviders();
    const byTier = new Map<string, LLMProvider[]>();
    
    for (const provider of providers) {
      const tier = provider.getTier();
      if (!byTier.has(tier)) {
        byTier.set(tier, []);
      }
      byTier.get(tier)!.push(provider);
    }
    
    return byTier;
  }
}

### Decorator Pattern

#### Logging Decorator

```typescript
export function LogExecution(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const logger = this.logger || console;
    const startTime = Date.now();
    
    logger.log({
      level: 'info',
      message: `Executing ${propertyKey}`,
      method: propertyKey,
      args: sanitizeArgs(args),
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;
      
      logger.log({
        level: 'info',
        message: `Completed ${propertyKey}`,
        method: propertyKey,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.log({
        level: 'error',
        message: `Failed ${propertyKey}`,
        method: propertyKey,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
  
  return descriptor;
}

// Usage
export class ModelRouterService {
  @LogExecution
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Implementation
  }
}

#### Retry Decorator

```typescript
export function Retry(config: RetryConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      let delay = config.initialDelayMs;
      
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          
          if (attempt === config.maxAttempts || !isRetryable(error, config)) {
            throw error;
          }
          
          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
        }
      }
      
      throw lastError!;
    };
    
    return descriptor;
  };
}

// Usage
export class RAGService {
  @Retry({
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR']
  })
  async generateEmbedding(text: string): Promise<number[]> {
    // Implementation
  }
}

## Infrastructure Design

### Docker Containerization

#### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: universal-brain-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/universal_brain
      - REDIS_URL=redis://redis:6379
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./knowledge:/app/knowledge:ro
      - ./config/personas.json:/app/config/personas.json:ro
    restart: unless-stopped
    networks:
      - universal-brain-network

  postgres:
    image: pgvector/pgvector:pg16
    container_name: universal-brain-postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=universal_brain
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - universal-brain-network

  redis:
    image: redis:7-alpine
    container_name: universal-brain-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - universal-brain-network

  ollama:
    image: ollama/ollama:latest
    container_name: universal-brain-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped
    networks:
      - universal-brain-network

volumes:
  postgres-data:
  redis-data:
  ollama-data:

networks:
  universal-brain-network:
    driver: bridge
```

### Background Job Processing with BullMQ

#### Queue Configuration

```typescript
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      {
        name: 'document-ingestion',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      },
      {
        name: 'embedding-generation',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      }
    ),
  ],
})
export class JobsModule {}

#### Job Processors

```typescript
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('document-ingestion')
export class DocumentIngestionProcessor {
  constructor(
    private readonly pdfParser: PDFParserService,
    private readonly embeddingService: EmbeddingService,
    private readonly chunkRepository: KnowledgeChunkRepository,
    private readonly logger: Logger
  ) {}
  
  @Process()
  async processIngestion(job: Job<IngestDocumentJob>): Promise<void> {
    const { filePath, category } = job.data;
    
    this.logger.log({
      message: 'Starting document ingestion',
      jobId: job.id,
      filePath,
      category
    });
    
    try {
      // Extract text from PDF
      await job.progress(10);
      const text = await this.pdfParser.extractText(filePath);
      
      // Split into chunks
      await job.progress(30);
      const chunks = await this.pdfParser.chunkText(text, {
        maxTokens: 512,
        overlap: 50
      });
      
      // Generate embeddings
      await job.progress(50);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(
        chunks.map(c => c.content)
      );
      
      // Store in database
      await job.progress(80);
      const knowledgeChunks = chunks.map((chunk, index) => ({
        documentId: filePath,
        chunkIndex: index,
        content: chunk.content,
        embedding: embeddings[index],
        tokenCount: chunk.tokenCount,
        category
      }));
      
      await this.chunkRepository.saveBatch(knowledgeChunks);
      
      await job.progress(100);
      
      this.logger.log({
        message: 'Document ingestion completed',
        jobId: job.id,
        chunksCreated: chunks.length
      });
    } catch (error) {
      this.logger.error({
        message: 'Document ingestion failed',
        jobId: job.id,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

### Health Check Implementation

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly llmProviders: LLMProviderHealthIndicator
  ) {}
  
  @Get()
  @HealthCheck()
  check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    };
  }
  
  @Get('ready')
  @HealthCheck()
  async readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.llmProviders.check('llm-providers')
    ]);
  }
}

@Injectable()
export class LLMProviderHealthIndicator extends HealthIndicator {
  constructor(private readonly providerFactory: LLMProviderFactory) {}
  
  async check(key: string): Promise<HealthIndicatorResult> {
    const providers = this.providerFactory.getAllProviders();
    const results = await Promise.all(
      providers.map(async (provider) => ({
        name: provider.getName(),
        available: await provider.isAvailable()
      }))
    );
    
    const allAvailable = results.every(r => r.available);
    const someAvailable = results.some(r => r.available);
    
    if (allAvailable) {
      return this.getStatus(key, true, { providers: results });
    } else if (someAvailable) {
      return this.getStatus(key, true, { 
        providers: results,
        warning: 'Some providers unavailable'
      });
    } else {
      return this.getStatus(key, false, { 
        providers: results,
        error: 'All providers unavailable'
      });
    }
  }
}
```

### Security Implementation

#### Security Headers Middleware

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
    );
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // HTTPS enforcement (production only)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    next();
  }
}

#### Rate Limiting

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,        // Time window in seconds
      limit: 100,     // Max requests per window
    }),
  ],
})
export class AppModule {}

// Custom rate limiting for specific endpoints
@Controller('api/chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  @Post()
  @Throttle(10, 60)  // 10 requests per minute for chat
  async chat(@Body() request: ChatRequest): Promise<ChatResponse> {
    // Implementation
  }
}

// Custom throttler exception filter
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(429).json({
      type: 'https://api.example.com/errors/rate-limit',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests. Please try again later.',
      instance: ctx.getRequest().url,
      retryAfter: 60
    });
  }
}
```

#### Input Validation

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
  agent_id: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
  question: string;
  
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class CreatePersonaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => value.trim().toLowerCase())
  id: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  systemPrompt: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  knowledgeCategory: string;
}

// Global validation pipe
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,           // Strip unknown properties
        forbidNonWhitelisted: true, // Throw error on unknown properties
        transform: true,            // Auto-transform to DTO types
        transformOptions: {
          enableImplicitConversion: true
        }
      })
    }
  ]
})
export class AppModule {}
```

### Observability

#### Structured Logging

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class StructuredLogger implements LoggerService {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'universal-brain',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });
  }
  
  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }
  
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }
  
  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }
  
  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }
  
  // Structured logging with context
  logWithContext(level: string, message: string, metadata: Record<string, any>) {
    this.logger.log(level, message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      requestId: metadata.requestId || 'unknown',
      userId: this.redactPII(metadata.userId)
    });
  }
  
  private redactPII(value: any): string {
    if (!value) return 'anonymous';
    return '***REDACTED***';
  }
}

// Request context middleware
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['requestId'] = randomUUID();
    req['startTime'] = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - req['startTime'];
      
      logger.logWithContext('info', 'Request completed', {
        requestId: req['requestId'],
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent')
      });
    });
    
    next();
  }
}
```

## Module Organization

### Module Structure

```
src/
├── main.ts                           # Application entry point
├── app.module.ts                     # Root module
├── config/
│   ├── config.module.ts              # Configuration module
│   ├── config.service.ts             # Configuration service
│   └── configuration.ts              # Configuration schema
├── model-router/
│   ├── model-router.module.ts        # Model Router module
│   ├── model-router.service.ts       # Failover orchestration
│   ├── providers/
│   │   ├── llm-provider.interface.ts # Provider interface
│   │   ├── gpt4.provider.ts          # GPT-4o implementation
│   │   ├── claude.provider.ts        # Claude implementation
│   │   └── ollama.provider.ts        # Ollama implementation
│   ├── circuit-breaker.ts            # Circuit breaker implementation
│   └── provider.factory.ts           # Provider factory
├── rag/
│   ├── rag.module.ts                 # RAG module
│   ├── rag.service.ts                # RAG orchestration
│   ├── pdf-parser.service.ts         # PDF parsing
│   ├── embedding.service.ts          # Embedding generation
│   ├── repositories/
│   │   ├── knowledge-chunk.repository.ts
│   │   └── postgres-chunk.repository.ts
│   └── queries/
│       └── search-knowledge.handler.ts
├── persona/
│   ├── persona.module.ts             # Persona module
│   ├── persona.service.ts            # Persona management
│   ├── repositories/
│   │   ├── persona.repository.ts     # Repository interface
│   │   ├── postgres-persona.repository.ts
│   │   └── json-persona.repository.ts
│   ├── commands/
│   │   ├── create-persona.handler.ts
│   │   ├── update-persona.handler.ts
│   │   └── delete-persona.handler.ts
│   └── queries/
│       ├── get-persona.handler.ts
│       └── list-personas.handler.ts
├── mcp/
│   ├── mcp.module.ts                 # MCP Server module
│   ├── mcp.server.ts                 # MCP protocol implementation
│   └── tools/
│       ├── ask-agent.tool.ts
│       └── search-knowledge.tool.ts
├── chat/
│   ├── chat.module.ts                # Chat module
│   ├── chat.controller.ts            # REST API controller
│   ├── chat.service.ts               # Chat orchestration
│   └── dto/
│       ├── chat-request.dto.ts
│       └── chat-response.dto.ts
├── jobs/
│   ├── jobs.module.ts                # Background jobs module
│   ├── processors/
│   │   ├── document-ingestion.processor.ts
│   │   └── embedding-generation.processor.ts
│   └── queues/
│       └── queue.config.ts
├── health/
│   ├── health.module.ts              # Health check module
│   ├── health.controller.ts          # Health endpoints
│   └── indicators/
│       ├── llm-provider.indicator.ts
│       └── redis.indicator.ts
└── common/
    ├── filters/
    │   ├── global-exception.filter.ts
    │   └── throttler-exception.filter.ts
    ├── middleware/
    │   ├── security-headers.middleware.ts
    │   └── request-context.middleware.ts
    ├── decorators/
    │   ├── log-execution.decorator.ts
    │   └── retry.decorator.ts
    └── utils/
        ├── logger.service.ts
        └── sanitize.util.ts
```

### Module Dependencies

```mermaid
graph TD
    App[AppModule] --> Config[ConfigModule]
    App --> Chat[ChatModule]
    App --> MCP[MCPModule]
    App --> Health[HealthModule]
    App --> Jobs[JobsModule]
    
    Chat --> Persona[PersonaModule]
    Chat --> ModelRouter[ModelRouterModule]
    Chat --> RAG[RAGModule]
    
    MCP --> Persona
    MCP --> ModelRouter
    MCP --> RAG
    
    Jobs --> RAG
    
    ModelRouter --> Config
    RAG --> Config
    Persona --> Config
    
    Health --> ModelRouter
    Health --> RAG
```

### Module Interfaces

Each module exposes a clean interface through its service:

```typescript
// PersonaModule exports
@Module({
  providers: [PersonaService, ...repositories, ...handlers],
  exports: [PersonaService]
})
export class PersonaModule {}

// ModelRouterModule exports
@Module({
  providers: [ModelRouterService, ...providers, CircuitBreaker],
  exports: [ModelRouterService]
})
export class ModelRouterModule {}

// RAGModule exports
@Module({
  providers: [RAGService, PDFParserService, EmbeddingService, ...repositories],
  exports: [RAGService]
})
export class RAGModule {}
```

### Configuration Management

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

export const configurationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  OPENROUTER_API_KEY: Joi.string().required(),
  OLLAMA_URL: Joi.string().default('http://localhost:11434'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  PERSONA_CONFIG_PATH: Joi.string().default('./config/personas.json'),
  STORAGE_TYPE: Joi.string().valid('database', 'file').default('database'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configurationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
})
export class AppModule {}

// Usage in services
@Injectable()
export class ModelRouterService {
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    // Use configuration
  }
}
```

## Design Rationale

### Architectural Pattern Choices

**CQRS (Command Query Responsibility Segregation)**
- Rationale: Separates read and write operations for better scalability and maintainability
- Benefit: Allows independent optimization of read and write paths
- Trade-off: Adds complexity but provides clear separation of concerns

**Repository Pattern**
- Rationale: Abstracts data access layer to enable swapping storage backends
- Benefit: Supports both database and file-based storage without changing business logic
- Trade-off: Additional abstraction layer but provides flexibility

**Strategy Pattern for Providers**
- Rationale: Enables runtime selection of LLM providers, embedding services, and storage backends
- Benefit: Easy to add new providers without modifying existing code
- Trade-off: More interfaces to maintain but excellent extensibility

**Circuit Breaker Pattern**
- Rationale: Prevents cascading failures when external services are unavailable
- Benefit: Fast failure detection and automatic recovery
- Trade-off: Additional state management but critical for resilience

**Factory Pattern**
- Rationale: Centralizes object creation logic for complex dependencies
- Benefit: Consistent instantiation and easier testing
- Trade-off: Additional indirection but cleaner dependency management

**Decorator Pattern**
- Rationale: Adds cross-cutting concerns (logging, retry) without modifying core logic
- Benefit: Separation of concerns and reusable decorators
- Trade-off: Can make code harder to trace but keeps business logic clean

### Technology Choices

**NestJS**
- Rationale: TypeScript-first framework with excellent DI, modularity, and testing support
- Alternatives considered: Express (too minimal), Fastify (less ecosystem)

**PostgreSQL with pgvector**
- Rationale: Mature database with native vector similarity search
- Alternatives considered: Pinecone (vendor lock-in), Weaviate (operational complexity)

**BullMQ**
- Rationale: Robust job queue with Redis backend, excellent retry and monitoring
- Alternatives considered: Agenda (MongoDB dependency), Bee-Queue (less features)

**fast-check**
- Rationale: Mature property-based testing library for TypeScript
- Alternatives considered: jsverify (less maintained), testcheck-js (less TypeScript support)

### Scalability Considerations

**Horizontal Scaling**
- API servers: Stateless design allows multiple instances behind load balancer
- Background workers: Multiple worker processes can consume from same queue
- Database: Read replicas for query scaling, connection pooling

**Vertical Scaling**
- Embedding generation: CPU/GPU intensive, benefits from more cores
- Vector search: Memory intensive, benefits from more RAM
- LLM inference (Ollama): GPU acceleration for local models

**Caching Strategy**
- Persona configurations: In-memory cache (rarely change)
- Embeddings: Database-backed (too large for memory)
- LLM responses: Optional Redis cache for repeated queries

### Security Considerations

**Defense in Depth**
1. Input validation at API boundary (DTOs with class-validator)
2. Sanitization of user inputs (sanitize-html)
3. Parameterized queries (TypeORM prevents SQL injection)
4. Security headers (CSP, X-Frame-Options, etc.)
5. Rate limiting (per-IP and per-endpoint)
6. HTTPS enforcement in production

**Secret Management**
- Environment variables for configuration
- Never log sensitive data (API keys, passwords)
- Redact PII in logs
- Validate API key format at startup

**Least Privilege**
- Non-root user in Docker container
- Database user with minimal permissions
- Read-only volume mounts for knowledge files

### Performance Optimization

**Database Optimization**
- Vector index (IVFFlat) for fast similarity search
- Composite indexes on frequently queried columns
- Connection pooling to reduce overhead

**Background Processing**
- Async job queue prevents blocking API requests
- Batch embedding generation reduces API calls
- Configurable concurrency for workers

**Caching**
- In-memory persona cache (loaded at startup)
- Optional Redis cache for LLM responses
- HTTP caching headers for static content

**Request Optimization**
- Streaming responses for long-running operations
- Pagination for list endpoints
- Compression middleware (gzip)

## Summary

This design document provides a comprehensive blueprint for the Universal Brain system, a production-ready NestJS backend that combines LLM routing with automatic failover, RAG-based knowledge retrieval, and dynamic persona management.

The architecture follows established patterns (CQRS, Repository, Strategy, Circuit Breaker, Factory, Decorator) to ensure maintainability, testability, and extensibility. The system is designed for container-first deployment with Docker and docker-compose, includes comprehensive observability through structured logging and health checks, and implements security best practices including input validation, rate limiting, and security headers.

The dual testing approach combines property-based testing for universal correctness guarantees with unit and integration tests for specific behaviors and edge cases, ensuring robust validation of all 21 requirements and their 100+ acceptance criteria.
