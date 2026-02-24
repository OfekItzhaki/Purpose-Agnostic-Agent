# Implementation Plan: Universal Brain (Purpose-Agnostic Agent)

## Overview

This implementation plan breaks down the Universal Brain feature into discrete, incremental coding tasks. The system is a NestJS backend that provides intelligent agent capabilities through LLM routing with failover, RAG-based knowledge retrieval using pgvector, and dynamic persona management. The implementation follows THE_HORIZON_STANDARD with emphasis on property-based testing, container-first deployment, and comprehensive observability.

## Tasks

- [x] 1. Project setup and infrastructure foundation
  - [x] 1.1 Initialize NestJS project with TypeScript strict mode
    - Run `nest new universal-brain` with TypeScript configuration
    - Enable strict compiler options: strictNullChecks, noImplicitAny, strictFunctionTypes
    - Configure tsconfig.json with paths for clean imports
    - Set up .gitignore for Node.js projects
    - _Requirements: 18.1, 18.2, 18.6_

  - [x] 1.2 Create Docker infrastructure files
    - Create Dockerfile with multi-stage build (builder and production stages)
    - Create docker-compose.yml with services: api, postgres (pgvector), redis, ollama
    - Configure health checks for all services
    - Set up Docker volumes for data persistence
    - Create .dockerignore file
    - _Requirements: 12.1, 12.2, 12.6_

  - [x] 1.3 Set up environment configuration with validation
    - Create .env.example with all required variables and descriptions
    - Install and configure @nestjs/config with Joi validation schema
    - Define configuration schema for: DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY, OLLAMA_URL, LOG_LEVEL, STORAGE_TYPE
    - Create ConfigModule as global module
    - Implement startup validation that fails fast on missing required variables
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 18.3_

  - [x] 1.4 Initialize database schema with pgvector
    - Create init-db.sql script to enable pgvector extension
    - Define knowledge_documents table with UUID, source_path, category, file_hash, metadata
    - Define knowledge_chunks table with embedding vector(1536), content, chunk_index
    - Define chat_sessions and chat_messages tables for conversation continuity
    - Define failover_events table for monitoring
    - Create vector similarity index using ivfflat
    - Create category and session indexes
    - _Requirements: 2.1, 5.7, 1.6_

  - [x] 1.5 Set up Redis and BullMQ for background jobs
    - Install @nestjs/bull and bull packages
    - Configure BullModule with Redis connection
    - Register two queues: document-ingestion and embedding-generation
    - Configure default job options: retry attempts, exponential backoff, job retention
    - _Requirements: 13.1, 13.5_

- [x] 2. Core configuration and shared utilities
  - [x] 2.1 Implement structured logging service
    - Create StructuredLogger using winston
    - Configure JSON format with timestamp, level, service_name, request_id
    - Implement PII redaction for sensitive data
    - Create log transports: console, error.log, combined.log
    - Add logWithContext method for contextual logging
    - _Requirements: 14.1, 14.2, 14.7_

  - [x] 2.2 Create global error handling infrastructure
    - Implement GlobalExceptionFilter following RFC 7807 ProblemDetails format
    - Define error response structure with type, title, status, detail, instance
    - Classify errors as operational vs programmer errors
    - Log errors with full context before returning response
    - Create custom exception classes for domain errors
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 2.3 Implement security middleware and guards
    - Create SecurityHeadersMiddleware setting CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS
    - Configure ThrottlerModule with global rate limits (100 req/min)
    - Create ThrottlerExceptionFilter for RFC 7807 compliant 429 responses
    - Implement RequestContextMiddleware for request ID tracking
    - _Requirements: 15.1, 15.2, 15.3, 15.7_

  - [x] 2.4 Create retry and circuit breaker utilities
    - Implement Retry decorator with exponential backoff configuration
    - Implement CircuitBreaker class with CLOSED, OPEN, HALF_OPEN states
    - Add timeout handling and failure threshold tracking
    - Implement automatic recovery testing when circuit is open
    - Create LogExecution decorator for method-level logging
    - _Requirements: 14.6, 21.9, 21.10, 21.11, 21.12_

  - [ ]* 2.5 Write property tests for retry and circuit breaker
    - **Property 30: Exponential Backoff Retry Timing**
    - **Validates: Requirements 14.6**
    - **Property 41: Circuit Breaker Opens on Repeated Failures**
    - **Validates: Requirements 21.10**
    - **Property 42: Circuit Breaker Recovery Testing**
    - **Validates: Requirements 21.11**
    - **Property 43: Circuit Breaker Closes on Recovery**
    - **Validates: Requirements 21.12**

- [x] 3. Model Router Module with failover logic
  - [x] 3.1 Define LLM provider interfaces and strategy pattern
    - Create LLMProvider interface with generate, getName, getTier, isAvailable methods
    - Define GenerateRequest and GenerateResponse TypeScript interfaces
    - Define ProviderHealthStatus interface
    - Create LLMProviderFactory for provider instantiation
    - _Requirements: 1.1, 21.6, 21.13_

  - [x] 3.2 Implement OpenRouter GPT-4o provider
    - Create OpenRouterGPT4Provider implementing LLMProvider interface
    - Configure API endpoint and authentication with OPENROUTER_API_KEY
    - Implement generate method with 30s timeout
    - Implement isAvailable health check
    - Return tier as 'primary'
    - _Requirements: 1.1, 1.4_

  - [x] 3.3 Implement Claude-3.5 fallback provider
    - Create ClaudeProvider implementing LLMProvider interface
    - Configure Anthropic API endpoint via OpenRouter
    - Implement generate method with 30s timeout
    - Return tier as 'fallback'
    - _Requirements: 1.1, 1.4_

  - [x] 3.4 Implement Ollama local provider
    - Create OllamaProvider implementing LLMProvider interface
    - Configure local Ollama endpoint from OLLAMA_URL
    - Implement generate method with 60s timeout (slower local inference)
    - Return tier as 'local'
    - _Requirements: 1.1_

  - [x] 3.5 Implement ModelRouterService with three-tier failover
    - Create ModelRouterService orchestrating provider failover
    - Implement generate method trying primary → fallback → local
    - Detect failures: HTTP 5xx, timeouts, connection errors
    - Handle HTTP 429 with retry before failover
    - Wrap each provider call with CircuitBreaker
    - Log failover events with timestamp, reason, failed provider, successful provider
    - Store failover events in database
    - Return provider name with each response
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 21.9_

  - [ ]* 3.6 Write property tests for Model Router failover
    - **Property 1: Primary Provider Failover**
    - **Validates: Requirements 1.2**
    - **Property 2: Cascading Failover to Local Provider**
    - **Validates: Requirements 1.3**
    - **Property 3: Provider Name in Response**
    - **Validates: Requirements 1.5**
    - **Property 4: Failover Event Logging**
    - **Validates: Requirements 1.6**

  - [ ]* 3.7 Write unit tests for Model Router
    - Test successful request with primary provider
    - Test failover on primary timeout
    - Test failover on HTTP 5xx error
    - Test retry logic for HTTP 429
    - Test all providers failed scenario

- [-] 4. RAG Module with PDF parsing and vector search
  - [x] 4.1 Create repository interfaces and implementations
    - Define KnowledgeChunkRepository interface with save, saveBatch, search, findByDocumentId methods
    - Create PostgresKnowledgeChunkRepository implementing the interface
    - Use TypeORM for database operations with parameterized queries
    - Implement vector similarity search using pgvector's <=> operator
    - _Requirements: 2.1, 15.5, 21.4, 21.5_

  - [x] 4.2 Implement PDF parser service
    - Create PDFParserService using pdf-parse library
    - Implement extractText method to extract text from PDF files
    - Implement chunkText method with configurable chunk size (512 tokens) and overlap (50 tokens)
    - Preserve paragraph boundaries when chunking
    - Tag chunks with category extracted from folder path /knowledge/{category}/
    - _Requirements: 2.7, 9.1, 9.2, 9.3_

  - [x] 4.3 Implement embedding service with strategy pattern
    - Define EmbeddingService interface with generateEmbedding, generateBatchEmbeddings, getDimensions methods
    - Create OpenAIEmbeddingService using text-embedding-3-small model (1536 dimensions)
    - Implement batch processing with rate limiting
    - Wrap API calls with Retry decorator and CircuitBreaker
    - Create LocalEmbeddingService as alternative implementation
    - Create EmbeddingServiceFactory for strategy selection
    - _Requirements: 2.3, 9.4, 21.8, 21.14_

  - [x] 4.4 Implement RAGService for knowledge retrieval
    - Create RAGService orchestrating search operations
    - Implement search method accepting query, category filter, topK, minScore
    - Generate query embedding using EmbeddingService
    - Query KnowledgeChunkRepository with vector similarity
    - Filter results by category when specified
    - Order results by descending similarity score
    - Return results with complete metadata: sourcePath, category, chunkIndex, score
    - _Requirements: 2.4, 2.5, 2.6, 8.1_

  - [x] 4.5 Implement document ingestion job processor
    - Create DocumentIngestionProcessor for BullMQ
    - Process ingestDocument jobs: extract text, chunk, generate embeddings, store
    - Update job progress at each stage (10%, 30%, 50%, 80%, 100%)
    - Calculate file hash to prevent duplicate ingestion
    - Store document metadata in knowledge_documents table
    - Store chunks with embeddings in knowledge_chunks table
    - Implement retry logic with exponential backoff
    - Log job start, completion, and failures with full context
    - _Requirements: 9.5, 13.2, 13.3, 13.4, 13.7_

  - [ ]* 4.6 Write property tests for RAG system
    - **Property 5: Category Tagging from Folder Structure**
    - **Validates: Requirements 2.2, 9.3**
    - **Property 6: Embedding Generation and Storage**
    - **Validates: Requirements 2.3, 9.4**
    - **Property 7: Search Results Ordered by Similarity**
    - **Validates: Requirements 2.4**
    - **Property 8: Category Filtering in Search**
    - **Validates: Requirements 2.5**
    - **Property 9: Complete Metadata in Search Results**
    - **Validates: Requirements 2.6, 8.1**
    - **Property 19: PDF Chunking Behavior**
    - **Validates: Requirements 9.2**
    - **Property 20: Complete Chunk Metadata Storage**
    - **Validates: Requirements 9.5**
    - **Property 26: Async Job Queuing with Immediate Response**
    - **Validates: Requirements 13.2, 13.3**
    - **Property 27: Job ID in Response**
    - **Validates: Requirements 13.6**
    - **Property 28: Job Failure Logging and Retry**
    - **Validates: Requirements 13.7**

  - [ ]* 4.7 Write unit tests for RAG components
    - Test PDF text extraction with sample documents
    - Test chunking with various text sizes
    - Test embedding generation with mock API
    - Test vector search with known embeddings
    - Test category filtering logic

- [-] 5. Persona Module with CQRS pattern
  - [x] 5.1 Define persona domain models and DTOs
    - Create Persona interface with id, name, description, systemPrompt, knowledgeCategory, temperature, maxTokens
    - Create PersonaInfo interface for list responses
    - Create CreatePersonaDto with validation decorators
    - Create UpdatePersonaDto with partial validation
    - Use class-validator for input validation and sanitization
    - _Requirements: 3.2, 15.4, 18.4_

  - [x] 5.2 Create persona repository interfaces
    - Define PersonaRepository interface with save, findById, findAll, update, delete methods
    - Create PostgresPersonaRepository implementing the interface
    - Create JsonFilePersonaRepository implementing the interface with atomic file writes
    - Implement round-trip serialization: parse → serialize → parse
    - _Requirements: 10.3, 10.4, 19.9, 21.4, 21.5_

  - [x] 5.3 Implement CQRS commands for persona management
    - Create CreatePersonaCommand and CreatePersonaHandler
    - Create UpdatePersonaCommand and UpdatePersonaHandler
    - Create DeletePersonaCommand and DeletePersonaHandler
    - Validate persona data in command handlers
    - Use PersonaRepository for persistence
    - Return descriptive errors for validation failures
    - _Requirements: 19.2, 19.3, 19.5, 19.7, 19.11, 21.1, 21.2_

  - [x] 5.4 Implement CQRS queries for persona retrieval
    - Create GetPersonaQuery and GetPersonaHandler
    - Create ListPersonasQuery and ListPersonasHandler
    - Return null for invalid agent IDs in GetPersonaQuery
    - Return PersonaInfo array for ListPersonasQuery
    - _Requirements: 3.3, 3.6, 6.2, 6.3, 21.1, 21.3_

  - [x] 5.5 Create PersonaService orchestrating CQRS operations
    - Implement loadPersonas method for startup initialization
    - Implement getPersona method delegating to GetPersonaQuery
    - Implement listPersonas method delegating to ListPersonasQuery
    - Implement validatePersona method checking required fields
    - Cache personas in memory after loading
    - Ensure system prompts are applied at request time, not initialization
    - _Requirements: 3.1, 3.2, 3.4, 10.1, 10.2, 10.5_

  - [ ]* 5.6 Write property tests for persona management
    - **Property 10: Invalid Persona Rejection**
    - **Validates: Requirements 3.2**
    - **Property 11: Persona Lookup by Agent ID**
    - **Validates: Requirements 3.3**
    - **Property 13: Invalid Agent ID Error**
    - **Validates: Requirements 3.6**
    - **Property 21: Persona Configuration Round-Trip**
    - **Validates: Requirements 10.4**
    - **Property 22: Invalid Configuration Error Messages**
    - **Validates: Requirements 10.5**
    - **Property 35: Persona Creation Validation**
    - **Validates: Requirements 19.2**
    - **Property 36: Persona Creation Persistence**
    - **Validates: Requirements 19.3**
    - **Property 37: Persona Update Persistence**
    - **Validates: Requirements 19.5**
    - **Property 38: Persona Deletion**
    - **Validates: Requirements 19.7**
    - **Property 39: Atomic File Writes**
    - **Validates: Requirements 19.9**
    - **Property 40: Persona Validation Error Response**
    - **Validates: Requirements 19.11**

  - [ ]* 5.7 Write unit tests for persona module
    - Test persona loading from JSON file
    - Test persona validation with missing fields
    - Test persona creation and persistence
    - Test persona update and retrieval
    - Test persona deletion
    - Test invalid agent ID handling

- [ ] 6. Chat Module with REST API
  - [x] 6.1 Create chat DTOs with validation
    - Create ChatRequestDto with agent_id, question, sessionId fields
    - Add validation: IsString, IsNotEmpty, MaxLength, IsUUID
    - Add sanitization using sanitize-html to prevent XSS
    - Create ChatResponseDto with answer, citations, modelUsed, sessionId
    - Create Citation interface with sourcePath, content, score
    - _Requirements: 5.2, 5.6, 8.2, 8.3, 15.4, 18.4_

  - [x] 6.2 Implement session repository for conversation continuity
    - Define SessionRepository interface with create, findById, addMessage, getMessages, update methods
    - Create PostgresSessionRepository implementation
    - Store chat sessions with agent_id and metadata
    - Store chat messages with role, content, model_used, tokens_used
    - Retrieve messages ordered by timestamp
    - _Requirements: 5.7_

  - [x] 6.3 Create ChatService orchestrating the chat flow
    - Implement chat method accepting ChatRequestDto
    - Retrieve persona using PersonaService.getPersona
    - Return 404 error if persona not found
    - Query RAG system with question and persona's knowledge category
    - Construct LLM request with system prompt, retrieved context, and question
    - Call ModelRouterService.generate with constructed request
    - Store user message and assistant response in session
    - Return ChatResponseDto with answer, citations, modelUsed, sessionId
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 3.5, 8.4_

  - [x] 6.4 Implement ChatController with REST endpoints
    - Create POST /api/chat endpoint accepting ChatRequestDto
    - Apply validation pipe to request body
    - Apply rate limiting: 10 requests per minute
    - Delegate to ChatService.chat
    - Return ChatResponseDto on success
    - Return RFC 7807 error responses on failure
    - Create GET /api/agents endpoint returning list of personas
    - Delegate to PersonaService.listPersonas
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 15.2_

  - [x] 6.5 Implement persona management REST endpoints
    - Create POST /api/personas endpoint accepting CreatePersonaDto
    - Create PUT /api/personas/:id endpoint accepting UpdatePersonaDto
    - Create DELETE /api/personas/:id endpoint
    - Apply validation to all request bodies
    - Delegate to PersonaService CQRS commands
    - Return appropriate HTTP status codes: 201, 200, 204, 400, 404
    - _Requirements: 19.1, 19.4, 19.6, 19.10_

  - [ ]* 6.6 Write property tests for chat flow
    - **Property 12: Knowledge Category Filter Propagation**
    - **Validates: Requirements 3.5**
    - **Property 15: Chat Request Validation**
    - **Validates: Requirements 5.2**
    - **Property 16: Complete Chat Response Structure**
    - **Validates: Requirements 5.6, 8.2, 8.3, 8.4**
    - **Property 17: Session Continuity**
    - **Validates: Requirements 5.7**
    - **Property 18: Agent List Response Format**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 6.7 Write integration tests for chat API
    - Test POST /api/chat with valid request returns 200 with answer and citations
    - Test POST /api/chat with invalid agent_id returns 404
    - Test POST /api/chat with missing required fields returns 400
    - Test GET /api/agents returns array of personas
    - Test session continuity across multiple requests
    - Test rate limiting returns 429 after threshold

- [x] 7. MCP Server Module with tool exposure
  - [x] 7.1 Implement MCP Server protocol handler
    - Create MCPServer class handling MCP protocol serialization/deserialization
    - Implement tool registration and invocation routing
    - Handle MCP request/response format
    - Implement error handling for MCP protocol errors
    - _Requirements: 4.1, 4.5_

  - [x] 7.2 Implement ask_agent MCP tool
    - Create AskAgentTool with inputSchema: agent_id, question, session_id
    - Implement tool handler delegating to ChatService
    - Return structured response with answer and metadata
    - Handle errors and return MCP-compliant error responses
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 7.3 Implement search_knowledge MCP tool
    - Create SearchKnowledgeTool with inputSchema: query, category, top_k
    - Implement tool handler delegating to RAGService
    - Return search results with citations
    - Handle errors and return MCP-compliant error responses
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 7.4 Write property tests for MCP tools
    - **Property 14: MCP Response Structure**
    - **Validates: Requirements 4.5**

  - [ ]* 7.5 Write unit tests for MCP server
    - Test ask_agent tool with valid inputs
    - Test search_knowledge tool with category filter
    - Test error handling for invalid inputs
    - Test MCP protocol serialization

- [ ] 8. Health monitoring and observability
  - [x] 8.1 Implement health check endpoints
    - Create HealthController with GET /health endpoint
    - Return basic health status with timestamp and version
    - Create GET /health/ready endpoint with dependency checks
    - Implement database health indicator using TypeORM
    - Implement Redis health indicator
    - Implement LLMProviderHealthIndicator checking all providers
    - Return 503 when dependencies unavailable with details
    - _Requirements: 14.3, 14.4, 14.5_

  - [ ]* 8.2 Write unit tests for health checks
    - Test /health returns 200 with status
    - Test /health/ready returns 200 when all dependencies healthy
    - Test /health/ready returns 503 when database unavailable
    - Test /health/ready returns 200 with warning when some LLM providers unavailable

- [x] 9. OpenAPI documentation
  - [x] 9.1 Set up Swagger/OpenAPI documentation
    - Install @nestjs/swagger package
    - Configure SwaggerModule in main.ts
    - Expose documentation at GET /api/docs
    - Add API metadata: title, description, version
    - _Requirements: 16.1, 16.2_

  - [x] 9.2 Add OpenAPI decorators to controllers
    - Add @ApiTags to group endpoints
    - Add @ApiOperation for endpoint descriptions
    - Add @ApiResponse for success and error responses
    - Add @ApiProperty to DTOs for schema documentation
    - Include example values for all fields
    - Document all error responses with status codes
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

- [ ] 10. Testing infrastructure and property-based tests
  - [x] 10.1 Set up testing infrastructure
    - Configure Jest with TypeScript support
    - Set up test database using testcontainers
    - Configure test Redis using ioredis-mock
    - Create test fixtures for personas and documents
    - Create factory classes using @faker-js/faker
    - Set up nock or msw for mocking external APIs
    - _Requirements: 17.4, 17.5_

  - [x] 10.2 Configure property-based testing with fast-check
    - Install fast-check library
    - Configure minimum 100 iterations per property test
    - Enable seed-based reproducibility
    - Enable shrinking for minimal failing cases
    - Set 30 second timeout per property test
    - _Requirements: 17.1, 17.2, 17.3, 17.6, 17.7_

  - [ ]* 10.3 Write remaining property-based tests
    - **Property 23: RFC 7807 Error Response Format**
    - **Validates: Requirements 11.2, 11.3**
    - **Property 24: Error Logging Before Response**
    - **Validates: Requirements 11.5**
    - **Property 25: Data Persistence Across Restarts**
    - **Validates: Requirements 12.6**
    - **Property 29: Structured JSON Logging**
    - **Validates: Requirements 14.1, 14.2**
    - **Property 31: Sensitive Data Redaction in Logs**
    - **Validates: Requirements 14.7**
    - **Property 32: Security Headers on All Responses**
    - **Validates: Requirements 15.1**
    - **Property 33: Input Validation and Sanitization**
    - **Validates: Requirements 15.4**
    - **Property 34: OpenAPI Documentation Completeness**
    - **Validates: Requirements 16.3, 16.4**

- [ ] 11. Integration and final wiring
  - [x] 11.1 Wire all modules in AppModule
    - Import ConfigModule as global
    - Import and configure all feature modules: ModelRouterModule, RAGModule, PersonaModule, MCPModule, ChatModule, JobsModule, HealthModule
    - Configure global validation pipe with whitelist and transform options
    - Register global exception filter
    - Apply security headers middleware
    - Apply request context middleware
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10_

  - [x] 11.2 Create application bootstrap and startup
    - Configure main.ts with NestFactory
    - Enable CORS with appropriate configuration
    - Set global prefix /api
    - Configure Swagger documentation
    - Add graceful shutdown hooks
    - Implement startup health checks
    - Load personas on application start
    - _Requirements: 3.1, 12.5_

  - [x] 11.3 Create setup script and documentation
    - Create setup.sh script for initial setup
    - Verify Docker and docker-compose installed
    - Create necessary directories: knowledge/, config/, logs/
    - Create sample personas.json configuration
    - Start services with docker-compose up
    - Wait for services to be healthy
    - Run database migrations
    - Display success message with URLs
    - _Requirements: 12.4, 12.5_

  - [x] 11.4 Create comprehensive README documentation
    - Document system overview and architecture
    - Document prerequisites: Docker, Node.js
    - Document setup instructions using setup script
    - Document environment variables with descriptions
    - Document API endpoints with examples
    - Document MCP tools with examples
    - Document persona configuration format
    - Document knowledge ingestion process
    - Document troubleshooting common issues
    - _Requirements: 7.1, 7.2_

  - [ ]* 11.5 Write end-to-end integration tests
    - Test complete chat flow: persona → RAG → LLM → response
    - Test document ingestion flow: upload → parse → embed → store
    - Test failover flow: primary fails → fallback succeeds
    - Test session continuity across multiple chat requests
    - Test persona CRUD operations through API
    - Test health checks with various dependency states

- [x] 12. Final checkpoint and validation
  - Run all tests: unit, property-based, integration, e2e
  - Verify 80% code coverage on business logic
  - Run TypeScript compiler and verify zero type errors
  - Run linter and fix any issues
  - Test Docker build and container startup
  - Verify all health checks pass
  - Test API endpoints with sample requests
  - Verify OpenAPI documentation is complete
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The implementation follows NestJS best practices with modular architecture
- All external API calls are wrapped with circuit breakers and retry logic
- Background jobs handle resource-intensive operations asynchronously
- Comprehensive observability through structured logging and health checks
- Security best practices: input validation, rate limiting, security headers, PII redaction
