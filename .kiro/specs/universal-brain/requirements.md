# Requirements Document

## Introduction

Purpose-Agnostic Agent is a NestJS backend system that provides intelligent agent capabilities through a combination of LLM routing with failover support, RAG-based knowledge retrieval using pgvector, and dynamic persona management. The system exposes both MCP Server tools and REST API endpoints to enable flexible interaction with multiple AI agents, each configured with specific roles and knowledge domains.

## Glossary

- **Purpose_Agnostic_Agent**: The NestJS backend system that orchestrates LLM interactions, knowledge retrieval, and persona management
- **Model_Router**: The component responsible for routing LLM requests to available providers with automatic failover
- **RAG_System**: Retrieval-Augmented Generation system that retrieves relevant knowledge chunks from the vector database
- **Knowledge_Category**: A classification tag for knowledge documents based on folder structure
- **Persona**: A configured AI agent with a specific role, system prompt, and associated knowledge category
- **Persona_Manager**: The component that loads and manages persona configurations
- **MCP_Server**: Model Context Protocol server that exposes tools for agent interaction
- **Agent_ID**: A unique identifier for a persona configuration (e.g., "medical-doc", "legal-advisor")
- **Session_ID**: A unique identifier for tracking conversation context across multiple requests
- **Citation**: A reference to the source document and location of retrieved knowledge
- **Failover**: The automatic switching from a failed LLM provider to an available backup provider
- **Vector_Database**: PostgreSQL with pgvector extension for storing and querying document embeddings

## Requirements

### Requirement 1: Model Router with Failover Support

**User Story:** As a system administrator, I want the system to automatically failover between LLM providers, so that the service remains available even when a primary provider fails.

#### Acceptance Criteria

1. THE Model_Router SHALL support three provider tiers: Primary (GPT-4o), Fallback (Claude-3.5), and Local (Ollama)
2. WHEN the Primary provider fails or times out, THE Model_Router SHALL automatically route the request to the Fallback provider
3. WHEN both Primary and Fallback providers fail, THE Model_Router SHALL route the request to the Local provider
4. THE Model_Router SHALL use the OPENROUTER_API_KEY environment variable for authentication
5. WHEN a request completes successfully, THE Model_Router SHALL return the name of the provider that handled the request
6. THE Model_Router SHALL log each failover event with timestamp and reason

### Requirement 2: RAG System with Categorized Knowledge

**User Story:** As a developer, I want to organize knowledge documents into categories, so that agents can access domain-specific information.

#### Acceptance Criteria

1. THE RAG_System SHALL use PostgreSQL with pgvector extension as the Vector_Database
2. WHEN documents are ingested from `/knowledge/{category}/*.pdf`, THE RAG_System SHALL tag each document chunk with its Knowledge_Category
3. THE RAG_System SHALL generate embeddings for each document chunk and store them in the Vector_Database
4. WHEN a search query is received, THE RAG_System SHALL retrieve the top-k most relevant chunks based on vector similarity
5. WHERE a Knowledge_Category is specified in the search, THE RAG_System SHALL filter results to only that category
6. THE RAG_System SHALL include source document path and chunk location in each retrieved result
7. THE RAG_System SHALL support PDF file format for knowledge ingestion

### Requirement 3: Persona Manager with Configuration-Based Roles

**User Story:** As a system administrator, I want to define different AI personas in a configuration file, so that I can create specialized agents without code changes.

#### Acceptance Criteria

1. THE Persona_Manager SHALL load persona configurations from a JSON configuration file
2. THE Persona_Manager SHALL validate that each Persona contains required fields: Agent_ID, system_prompt, and knowledge_category
3. WHEN a request includes an Agent_ID, THE Persona_Manager SHALL load the corresponding Persona configuration
4. THE Persona_Manager SHALL ensure the LLM receives the system_prompt only at request time, not during initialization
5. WHERE a Persona specifies a knowledge_category, THE Persona_Manager SHALL pass this filter to the RAG_System
6. THE Persona_Manager SHALL return an error when an invalid Agent_ID is requested

### Requirement 4: MCP Server Tool Exposure

**User Story:** As a client application, I want to interact with agents through MCP tools, so that I can integrate with MCP-compatible systems.

#### Acceptance Criteria

1. THE MCP_Server SHALL expose a tool named `ask_agent` that accepts parameters: agent_id and question
2. WHEN `ask_agent` is invoked, THE MCP_Server SHALL route the request through the Persona_Manager and Model_Router
3. THE MCP_Server SHALL expose a tool named `search_knowledge` that accepts parameters: query and category
4. WHEN `search_knowledge` is invoked, THE MCP_Server SHALL query the RAG_System and return relevant chunks with citations
5. THE MCP_Server SHALL return structured responses including answer text and metadata

### Requirement 5: REST API for Chat Interactions

**User Story:** As a frontend developer, I want a REST API endpoint for chat interactions, so that I can build web applications that communicate with AI agents.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL expose a REST endpoint `POST /api/chat`
2. WHEN a POST request is received at `/api/chat`, THE Purpose_Agnostic_Agent SHALL accept a JSON body containing: agent_id, question, and sessionId
3. WHEN processing a chat request, THE Purpose_Agnostic_Agent SHALL retrieve the Persona configuration using the provided agent_id
4. WHEN processing a chat request, THE Purpose_Agnostic_Agent SHALL query the RAG_System using the question and the Persona's knowledge_category
5. WHEN processing a chat request, THE Purpose_Agnostic_Agent SHALL send the system_prompt, retrieved context, and question to the Model_Router
6. WHEN a chat request completes, THE Purpose_Agnostic_Agent SHALL return a JSON response containing: answer, citations, and modelUsed
7. THE Purpose_Agnostic_Agent SHALL use the sessionId to maintain conversation context across multiple requests

### Requirement 6: Agent Listing API

**User Story:** As a frontend developer, I want to retrieve a list of available agents, so that I can display options to end users.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL expose a REST endpoint `GET /api/agents`
2. WHEN a GET request is received at `/api/agents`, THE Purpose_Agnostic_Agent SHALL return a JSON array of available Persona configurations
3. THE Purpose_Agnostic_Agent SHALL include the following fields for each Persona: id, name, description, and knowledge_category

### Requirement 7: Environment Configuration

**User Story:** As a system administrator, I want clear documentation of required environment variables, so that I can configure the system correctly.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL include a `.env.example` file in the project root
2. THE `.env.example` file SHALL list the OPENROUTER_API_KEY variable with a descriptive comment
3. THE Purpose_Agnostic_Agent SHALL validate that OPENROUTER_API_KEY is present at startup
4. WHEN OPENROUTER_API_KEY is missing, THE Purpose_Agnostic_Agent SHALL log an error and fail to start

### Requirement 8: Citation Tracking

**User Story:** As an end user, I want to see sources for the information provided by agents, so that I can verify the accuracy of responses.

#### Acceptance Criteria

1. WHEN the RAG_System retrieves knowledge chunks, THE Purpose_Agnostic_Agent SHALL capture the source document path and chunk location
2. WHEN returning a chat response, THE Purpose_Agnostic_Agent SHALL include an array of Citation objects
3. THE Citation object SHALL contain: source document path, chunk text, and relevance score
4. THE Purpose_Agnostic_Agent SHALL include citations for all knowledge chunks used to generate the response

### Requirement 9: Knowledge Ingestion Parser

**User Story:** As a system administrator, I want to ingest PDF documents into the knowledge base, so that agents can access the information.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL provide a PDF parser that extracts text content from PDF files
2. WHEN parsing a PDF, THE Purpose_Agnostic_Agent SHALL split the content into chunks of configurable size
3. WHEN parsing a PDF from `/knowledge/{category}/`, THE Purpose_Agnostic_Agent SHALL tag all chunks with the corresponding Knowledge_Category
4. THE Purpose_Agnostic_Agent SHALL generate embeddings for each chunk using a consistent embedding model
5. THE Purpose_Agnostic_Agent SHALL store chunks and embeddings in the Vector_Database with metadata including: source_path, category, chunk_index, and timestamp

### Requirement 10: Round-Trip Configuration Validation

**User Story:** As a developer, I want to ensure persona configurations are valid, so that I can catch errors before runtime.

#### Acceptance Criteria

1. THE Persona_Manager SHALL provide a configuration validator that checks JSON schema compliance
2. WHEN loading persona configurations, THE Persona_Manager SHALL parse the JSON file into Persona objects
3. THE Persona_Manager SHALL provide a serializer that formats Persona objects back into valid JSON
4. FOR ALL valid Persona objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)
5. WHEN a configuration file contains invalid JSON or missing required fields, THE Persona_Manager SHALL return a descriptive error message

### Requirement 11: Standardized Error Handling

**User Story:** As a developer, I want consistent error handling across the application, so that errors are predictable and easy to debug.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL implement a global error handling middleware that catches all unhandled exceptions
2. WHEN an error occurs, THE Purpose_Agnostic_Agent SHALL return a standardized error response following RFC 7807 ProblemDetails format
3. THE error response SHALL include: type, title, status, detail, and instance fields
4. THE Purpose_Agnostic_Agent SHALL NOT use scattered try-catch blocks except for specific business logic error handling
5. WHEN an error is caught by the global middleware, THE Purpose_Agnostic_Agent SHALL log the error with full context before returning the response
6. THE Purpose_Agnostic_Agent SHALL distinguish between operational errors (expected) and programmer errors (bugs)

### Requirement 12: Container-First Infrastructure

**User Story:** As a developer, I want to run the entire system locally with a single command, so that I can start development quickly.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL provide a Dockerfile for the NestJS application
2. THE Purpose_Agnostic_Agent SHALL provide a docker-compose.yml file that orchestrates all services: API, PostgreSQL with pgvector, and Redis
3. THE Purpose_Agnostic_Agent SHALL use .env files for all configuration values
4. THE Purpose_Agnostic_Agent SHALL provide a setup script that handles initial setup and service startup
5. WHEN the setup script is executed, THE Purpose_Agnostic_Agent SHALL verify all services are healthy before completing
6. THE Purpose_Agnostic_Agent SHALL ensure all data persists across container restarts using Docker volumes

### Requirement 13: Background Job Processing

**User Story:** As a system administrator, I want slow operations to run in the background, so that API responses remain fast and reliable.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL use BullMQ for background job processing
2. WHEN a PDF ingestion request is received, THE Purpose_Agnostic_Agent SHALL queue the ingestion as a background job and return immediately
3. WHEN an embedding generation request is received, THE Purpose_Agnostic_Agent SHALL queue the generation as a background job
4. THE Purpose_Agnostic_Agent SHALL NOT perform PDF parsing or embedding generation in the request-response cycle
5. THE Purpose_Agnostic_Agent SHALL make all background jobs retriable with configurable retry attempts
6. THE Purpose_Agnostic_Agent SHALL provide job status tracking via a job ID returned to the client
7. WHEN a background job fails, THE Purpose_Agnostic_Agent SHALL log the failure with full context and retry according to the retry policy

### Requirement 14: Observability and Health Monitoring

**User Story:** As a DevOps engineer, I want comprehensive logging and health checks, so that I can monitor system health and debug issues quickly.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL implement structured logging in JSON format with contextual properties
2. THE Purpose_Agnostic_Agent SHALL include the following context in all logs: timestamp, level, service_name, request_id, and user_id (when available)
3. THE Purpose_Agnostic_Agent SHALL expose a GET /health endpoint that returns service health status
4. THE Purpose_Agnostic_Agent SHALL expose a GET /health/ready endpoint that checks all dependencies (database, Redis, external APIs)
5. WHEN a dependency is unavailable, THE /health/ready endpoint SHALL return HTTP 503 with details of failed dependencies
6. THE Purpose_Agnostic_Agent SHALL implement retry logic with exponential backoff for transient failures when connecting to infrastructure dependencies
7. THE Purpose_Agnostic_Agent SHALL NOT log sensitive data including passwords, API keys, or personally identifiable information

### Requirement 15: Security Headers and Best Practices

**User Story:** As a security engineer, I want the application to follow security best practices, so that it is protected against common vulnerabilities.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL set the following security headers on all HTTP responses: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy
2. THE Purpose_Agnostic_Agent SHALL implement rate limiting on all API endpoints with configurable limits per IP address
3. WHEN rate limit is exceeded, THE Purpose_Agnostic_Agent SHALL return HTTP 429 with a Retry-After header
4. THE Purpose_Agnostic_Agent SHALL validate and sanitize all user inputs before processing
5. THE Purpose_Agnostic_Agent SHALL use parameterized queries or ORM methods to prevent SQL injection
6. THE Purpose_Agnostic_Agent SHALL validate the OPENROUTER_API_KEY format at startup
7. THE Purpose_Agnostic_Agent SHALL enforce HTTPS in production environments via Strict-Transport-Security header

### Requirement 16: OpenAPI Documentation

**User Story:** As a frontend developer, I want auto-generated API documentation, so that I can understand and integrate with the API easily.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL generate OpenAPI (Swagger) documentation automatically from code annotations
2. THE Purpose_Agnostic_Agent SHALL expose the API documentation at GET /api/docs
3. THE Purpose_Agnostic_Agent SHALL include request/response schemas, parameter descriptions, and example values in the documentation
4. THE Purpose_Agnostic_Agent SHALL document all error responses with status codes and error formats
5. THE Purpose_Agnostic_Agent SHALL keep the OpenAPI specification as the single source of truth for API contracts
6. WHEN API endpoints change, THE OpenAPI documentation SHALL update automatically without manual intervention

### Requirement 17: Testing Standards

**User Story:** As a developer, I want comprehensive test coverage, so that I can refactor with confidence and catch bugs early.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL maintain at least 80% code coverage on business logic (services, handlers, utilities)
2. THE Purpose_Agnostic_Agent SHALL provide unit tests for all service methods using proper test isolation
3. THE Purpose_Agnostic_Agent SHALL provide integration tests for all REST API endpoints
4. THE Purpose_Agnostic_Agent SHALL use test databases or in-memory databases for integration tests
5. THE Purpose_Agnostic_Agent SHALL mock external dependencies (OpenRouter API, embedding services) in unit tests
6. THE Purpose_Agnostic_Agent SHALL follow the Arrange-Act-Assert pattern for all tests
7. WHEN tests are executed, THE Purpose_Agnostic_Agent SHALL ensure tests are independent and can run in any order

### Requirement 18: TypeScript Type Safety

**User Story:** As a developer, I want strict type safety throughout the codebase, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL enable strict TypeScript compiler options including strictNullChecks and noImplicitAny
2. THE Purpose_Agnostic_Agent SHALL NOT use the 'any' type anywhere in the codebase except in auto-generated files
3. THE Purpose_Agnostic_Agent SHALL define explicit types for all function parameters and return values
4. THE Purpose_Agnostic_Agent SHALL define DTOs (Data Transfer Objects) for all API request and response payloads
5. THE Purpose_Agnostic_Agent SHALL use TypeScript interfaces or types for all database entities
6. WHEN the TypeScript compiler runs, THE Purpose_Agnostic_Agent SHALL produce zero type errors
7. THE Purpose_Agnostic_Agent SHALL use discriminated unions for handling different response types or error cases

### Requirement 19: Persona Management API

**User Story:** As a system administrator, I want to create, update, and delete personas through a REST API, so that I can manage agent configurations dynamically without restarting the service.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL expose a REST endpoint `POST /api/personas` that accepts a JSON body containing: id, name, description, system_prompt, and knowledge_category
2. WHEN a POST request is received at `/api/personas`, THE Purpose_Agnostic_Agent SHALL validate that all required fields are present and properly formatted
3. WHEN persona data is valid, THE Purpose_Agnostic_Agent SHALL persist the new Persona to the configured storage backend
4. THE Purpose_Agnostic_Agent SHALL expose a REST endpoint `PUT /api/personas/:id` that accepts a JSON body with updated persona fields
5. WHEN a PUT request is received at `/api/personas/:id`, THE Purpose_Agnostic_Agent SHALL validate the persona data and update the existing Persona
6. THE Purpose_Agnostic_Agent SHALL expose a REST endpoint `DELETE /api/personas/:id` that removes a persona from storage
7. WHEN a DELETE request is received at `/api/personas/:id`, THE Purpose_Agnostic_Agent SHALL remove the Persona and return HTTP 204 on success
8. THE Purpose_Agnostic_Agent SHALL support both JSON file storage and database storage for personas based on configuration
9. WHERE JSON file storage is configured, THE Purpose_Agnostic_Agent SHALL write persona changes to the JSON configuration file atomically
10. WHERE database storage is configured, THE Purpose_Agnostic_Agent SHALL persist persona changes to the Vector_Database
11. WHEN persona validation fails, THE Purpose_Agnostic_Agent SHALL return HTTP 400 with a descriptive error message indicating which fields are invalid

### Requirement 20: Modular Architecture

**User Story:** As a developer, I want the system organized into clear, independent modules, so that I can understand, extend, and maintain the codebase easily.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL organize code into distinct modules: ModelRouterModule, RAGModule, PersonaModule, MCPModule, and ChatModule
2. THE Purpose_Agnostic_Agent SHALL ensure each module has a single, well-defined responsibility
3. THE Purpose_Agnostic_Agent SHALL define explicit interfaces for communication between modules
4. THE Purpose_Agnostic_Agent SHALL use NestJS dependency injection for all inter-module dependencies
5. THE Purpose_Agnostic_Agent SHALL NOT allow direct imports of implementation classes across module boundaries
6. THE Purpose_Agnostic_Agent SHALL centralize all configuration in a ConfigModule using environment variables
7. THE Purpose_Agnostic_Agent SHALL make all modules independently testable with mockable dependencies
8. WHEN a module needs to be replaced or extended, THE Purpose_Agnostic_Agent SHALL allow this through interface implementation without modifying dependent modules
9. THE Purpose_Agnostic_Agent SHALL document module boundaries and responsibilities in architecture documentation
10. THE Purpose_Agnostic_Agent SHALL ensure configuration values are injected into modules rather than accessed directly from environment variables

### Requirement 21: Architectural Patterns and Best Practices

**User Story:** As a developer, I want the system to follow established architectural patterns, so that the codebase is maintainable, testable, and follows industry best practices.

#### Acceptance Criteria

1. THE Purpose_Agnostic_Agent SHALL implement CQRS (Command Query Responsibility Segregation) using the NestJS CQRS module to separate write operations from read operations
2. WHEN a write operation is requested (creating personas, updating personas, ingesting documents), THE Purpose_Agnostic_Agent SHALL handle it through a command handler
3. WHEN a read operation is requested (searching knowledge, getting agents, retrieving personas), THE Purpose_Agnostic_Agent SHALL handle it through a query handler
4. THE Purpose_Agnostic_Agent SHALL implement the Repository Pattern with abstract repository interfaces for Persona, KnowledgeChunk, and Session entities
5. THE Purpose_Agnostic_Agent SHALL provide concrete repository implementations that support swapping storage backends (JSON file storage, PostgreSQL, or other databases)
6. THE Purpose_Agnostic_Agent SHALL implement the Strategy Pattern for the Model_Router to enable switching between LLM providers (GPT-4o, Claude, Ollama)
7. THE Purpose_Agnostic_Agent SHALL implement the Strategy Pattern for storage backends to allow runtime selection between file-based and database storage
8. THE Purpose_Agnostic_Agent SHALL implement the Strategy Pattern for embedding generation to support different embedding service providers
9. THE Purpose_Agnostic_Agent SHALL implement the Circuit Breaker Pattern for all external API calls to OpenRouter and embedding services
10. WHEN an external service fails repeatedly, THE Circuit_Breaker SHALL open to prevent cascading failures and return fast failures to clients
11. WHEN the Circuit_Breaker is open, THE Purpose_Agnostic_Agent SHALL periodically test if the external service has recovered
12. WHEN the external service recovers, THE Circuit_Breaker SHALL automatically close and resume normal operation
13. THE Purpose_Agnostic_Agent SHALL implement the Factory Pattern for creating LLM provider instances based on configuration
14. THE Purpose_Agnostic_Agent SHALL implement the Factory Pattern for creating embedding generator instances based on configuration
15. THE Purpose_Agnostic_Agent SHALL implement the Factory Pattern for creating storage adapter instances based on configuration
16. WHERE additional cross-cutting concerns are needed (logging, caching, retry logic), THE Purpose_Agnostic_Agent SHALL use the Decorator Pattern to wrap services without modifying core business logic
17. THE Purpose_Agnostic_Agent SHALL document the rationale for each architectural pattern in the design documentation
18. THE Purpose_Agnostic_Agent SHALL ensure all pattern implementations follow their canonical definitions and do not introduce anti-patterns
