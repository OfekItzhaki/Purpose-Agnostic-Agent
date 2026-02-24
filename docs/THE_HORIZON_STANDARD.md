# 🏆 The Horizon Standard: Universal Architecture & Excellence Blueprint

This document defines **The Horizon Standard** - a universal set of architectural principles and coding standards for **all software projects**, regardless of platform or technology. It is intended for both human developers and AI agents to ensure consistency, scalability, and high code quality across any codebase.

**The Horizon Standard applies to:**

- Web applications (React, Vue, Angular, etc.)
- Backend services (.NET, Node.js, Python, etc.)
- Mobile applications (React Native, Flutter, etc.)
- Desktop applications
- Any software project that values quality and maintainability

---

## 🏗️ Architectural Pillars

These principles apply to **any project** adopting The Horizon Standard:

### 1. The "Single Source of Truth" API

- **Tooling**: Use **NSwag**, **OpenAPI**, or equivalent code generation tools for your stack.
- **Models & Structure**: Auto-generate client code from API definitions. Never manually define these in the frontend.
- **Rule**: Whenever the backend contracts change, re-run the client generator.
- **Benefit**: Zero "type mismatch" bugs.
- **Applies to**: REST APIs, GraphQL, gRPC, or any API-first architecture.
- **Content Management**: **Never hardcode content in code.** Use a CMS (Sanity, Contentful, Strapi, etc.) for all dynamic content (products, URLs, descriptions). Content belongs in the CMS, not in the codebase.

### 2. Standardized Error Handling

- **Backend**: Use a global error handling middleware. No scattered `try-catch` blocks unless for specific logic.
- **Responses**: Return standardized error formats (e.g., `ProblemDetails` RFC 7807, or equivalent for your stack).
- **Frontend**: Use a central notification system to display errors consistently.
- **Applies to**: Any client-server architecture.

### 3. Container-First & Infrastructure-as-Code

- **Docker**: Every core dependency (API, Web, DB, Cache) should be containerized.
- **Environment**: Use `.env` files for configuration. Use infrastructure-as-code tools (Docker Compose, Kubernetes, Terraform, etc.).
- **Rules**: Local dev must be "Plug & Play" with a single helper script that handles setup and service startup.
- **Applies to**: Any project with multiple services or dependencies.

### 4. Background Job & Multi-Channel Delivery

- **Offloading**: Never perform slow operations (Email, external API sync, heavy processing) in the request-response cycle.
- **Tools**: Use job queues appropriate for your stack (BullMQ for Node.js, Hangfire for .NET, Celery for Python, etc.).
- **Reliability**: Jobs should be retriable and traceable.
- **Fallback**: Implement multi-channel defaults (e.g., WebSocket for real-time, Email for fallback).
- **Applies to**: Any application with async operations or background processing.

### 5. Resilient Session Management

- **UX Requirement**: Users should never be kicked out due to expired short-lived tokens.
- **Pattern**: Implement a 401 Interceptor that triggers an automatic renewal (refresh token) and retries the original request seamlessly.

### 6. Universal State & Caching

- **Standard**: Always use a robust data-fetching library with built-in caching.
- **Examples**: `@tanstack/react-query` (React), SWR (React), Apollo Client (GraphQL), RTK Query (Redux), etc.
- **Benefit**: Ensures a "snappy" UI with built-in optimistic updates and automated background refetching.
- **Parity**: All frontends (Web, Mobile) MUST adopt the same caching logic.
- **Applies to**: Any application with API data fetching.

### 7. Real-time Communication & Presence

- **Technology**: Use appropriate real-time tech for your stack (Socket.IO, SignalR, WebSockets, Server-Sent Events, etc.).
- **Pattern**: Implement room-based/hub-based communication for scoped updates.
- **Mobile Integration**: Use singleton instances for persistent connections across screens.
- **Fallback**: Always ensure REST APIs are available as fallback for critical operations.
- **Applies to**: Any application requiring real-time updates.

### 8. Observability & Health Monitoring

- **Structured Logging**: All logs must be structured (JSON format with contextual properties).
- **Log Aggregation**: Use centralized logging (Seq, ELK Stack, Datadog, CloudWatch, etc.).
- **Health Checks**: Implement `/health` endpoints for orchestration and monitoring.
- **Transient Fault Handling**: Implement retries and circuit breakers for infrastructure dependencies.
- **Persistence Strategy**: All infrastructure data (DB, Cache, Logs) must persist across restarts.
- **Applies to**: Any production application.

### 9. Pluggable Storage Abstraction

- **Abstraction**: Applications must interact with storage via an interface (e.g., `IStorageService`, `StorageAdapter`) rather than direct filesystem/cloud calls.
- **Hybrid Support**: The architecture should support multiple providers (Local Disk, S3, Azure Blob, Cloudinary, etc.) switchable via configuration.
- **Path Resolution**: Use a centralized resolver to handle transitions between relative local paths and absolute production URLs.
- **Applies to**: Any application handling file storage.

### 10. Implementation Excellence & Patterns

- **Standardized Onboarding**: Complex flows must be broken into discrete, verifiable steps.
- **Tooling Automation**: Repetitive developer tasks (setup, verification, seeding) MUST be scripted.
- **Dynamic Infrastructure**: Setup scripts should handle environmental conflicts automatically (port allocation, service health checks, etc.).
- **Self-Healing**: Scripts should clear zombie services/orphans before launch.
- **Applies to**: Any project with complex setup or multiple services.

---

## 🚀 DevOps Workflow Patterns

### Northern Workflow (Build & Test)

- **Goal**: Code quality, formatting, and logical correctness.
- **Tools**: IDE, Linters (ESLint, Prettier, etc.), CI/CD (GitHub Actions, GitLab CI, Jenkins, etc.).
- **Rule**: Never merge if formatting checks, linting, or tests fail.
- **Pre-Commit Checklist**:

```bash
# Frontend (TypeScript/React/Vue/etc.)
npm run lint          # Check for linting errors
npm run lint -- --fix # Auto-fix linting errors
npm run build         # Ensure build succeeds

# Backend (.NET)
dotnet build          # Ensure build succeeds
dotnet test           # Run all tests

# Backend (Node.js)
npm run lint
npm run build
npm test

# Backend (Python)
flake8 .              # Linting
pytest                # Tests
```

### Southern Workflow (Docker & Deploy)

- **Goal**: Environment parity and deployment reliability.
- **Rules**: A feature is only "Done" when it passes health checks in the container mesh. All infrastructure MUST be ephemeral-ready.
- **Applies to**: Any containerized application.

### Automated Pre-Commit Testing

- **Goal**: Catch errors before they reach CI/CD, ensuring code quality at commit time.
- **Implementation**: Use Git hooks (Husky) with lint-staged to automatically run tests on changed files.
- **What Runs Automatically**:
  - **Linting**: Auto-fix code style issues
  - **Formatting**: Apply Prettier formatting
  - **Testing**: Run tests for modified files only (`--findRelatedTests`)
- **Benefits**:
  - Prevents broken code from being committed
  - Catches test failures immediately
  - Faster feedback loop than waiting for CI/CD
  - Reduces CI/CD failures and build times
- **Configuration Example** (package.json):

```json
"lint-staged": {
  "src/**/*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix",
    "npm test -- --bail --findRelatedTests"
  ]
}
```

- **Applies to**: Any project with automated testing

---

## 🌿 Git & Collaboration

### Git Tagging & Semantic Versioning

- **Versioning Standard**: Follow **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`.
  - **MAJOR**: Breaking changes, incompatible API changes
  - **MINOR**: New features, backward-compatible
  - **PATCH**: Bug fixes, backward-compatible
- **Automated Management**: Use automation tools to manage versions and changelogs:
  - **Node.js**: semantic-release, standard-version
  - **.NET**: GitVersion, Nerdbank.GitVersioning
  - **Universal**: Google's Release Please, conventional-changelog
- **Rule**: Never manually edit `CHANGELOG.md` files managed by automation.

### Commit & PR Strategy

- **Atomic Commits**: Each commit should represent a single logical change. Commits should be kept short and broken into smaller commits by features. If changes are related or dependent, they should be committed together.
- **Conventional Commits**: Use the `type(scope): description` format
  - **Description Rules**:
    - **Maximum 50 characters** for the description (after `type(scope): `)
    - Use imperative mood ("add" not "added" or "adds")
    - No period at the end
    - Be concise and specific
  - **Types**:
    - `feat`: New feature
    - `fix`: Bug fix
    - `chore`: Maintenance tasks (dependencies, config)
    - `refactor`: Code restructuring without behavior change
    - `docs`: Documentation changes
    - `style`: Formatting, whitespace (no code change)
    - `test`: Adding or updating tests
    - `perf`: Performance improvements
    - `ci`: CI/CD changes
    - `build`: Build system changes
  - **Examples**:
    - `feat(ui): add dark mode support`
    - `fix(api): resolve upload timeout`
    - `chore(deps): update dependencies`
    - `refactor(auth): simplify token validation`
    - `docs(readme): add install instructions`
- **Squash Merge**: Default for feature branches to keep history clean.
- **Pre-Commit Requirements**:
  1. Run linting and auto-fix: `npm run lint -- --fix` (Frontend)
  2. Ensure builds succeed: `npm run build` or `dotnet build`
  3. Run tests: `npm test` or `dotnet test`
  4. Stage changes: `git add .`
  5. Commit with conventional format: `git commit -m "type(scope): description"`
  6. Push to remote: `git push`

### Code Review Standards

- **Review Checklist**:
  - ✅ Code follows project conventions and standards
  - ✅ No hardcoded secrets or sensitive data
  - ✅ Proper error handling implemented
  - ✅ Tests included for new functionality
  - ✅ Documentation updated if needed
  - ✅ No unnecessary complexity
  - ✅ Performance considerations addressed
  - ✅ Security best practices followed
- **Review Etiquette**:
  - Be constructive and respectful
  - Explain the "why" behind suggestions
  - Distinguish between blocking issues and suggestions
  - Approve when standards are met, even if you'd do it differently

### Branch Strategy

- **Main/Master**: Production-ready code only
- **Develop**: Integration branch for features
- **Feature Branches**: `feature/description` or `feat/description`
- **Bugfix Branches**: `fix/description` or `bugfix/description`
- **Hotfix Branches**: `hotfix/description` for urgent production fixes
- **Release Branches**: `release/version` for release preparation

---

## 🛡️ Security & Performance Standards

### Security Headers

Every project must implement:

- **CSP (Content-Security-Policy)**: Prevent XSS attacks
- **X-Frame-Options: DENY**: Prevent clickjacking
- **X-Content-Type-Options: nosniff**: Prevent MIME sniffing
- **Referrer-Policy: no-referrer**: Protect user privacy
- **Strict-Transport-Security**: Enforce HTTPS
- **Rate Limiting**: IP-based rate limiting to prevent abuse

### Security Best Practices

- **Authentication**: Use industry-standard auth (OAuth 2.0, JWT, etc.)
- **Authorization**: Implement role-based or attribute-based access control
- **Input Validation**: Validate and sanitize all user inputs
- **SQL Injection**: Use parameterized queries or ORMs
- **XSS Prevention**: Escape output, use Content Security Policy
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **Secrets Management**: Never commit secrets, use environment variables or secret managers
- **Dependencies**: Regularly update dependencies and scan for vulnerabilities
- **Logging**: Never log sensitive data (passwords, tokens, PII)

### Performance Standards

- **Response Times**:
  - API endpoints: < 200ms for simple queries, < 1s for complex operations
  - Page load: < 3s for initial load, < 1s for subsequent navigation
- **Caching**: Implement appropriate caching strategies
- **Database**: Use indexes, optimize queries, implement connection pooling
- **Assets**: Minify and compress static assets, use CDN
- **Lazy Loading**: Load resources on-demand when appropriate
- **Monitoring**: Track performance metrics and set up alerts

---

## 📚 Documentation Standards

### README.md Requirements

Every project must have a comprehensive README with:

1. **Project Overview**: What the project does and why it exists
2. **Prerequisites**: Required tools, versions, and dependencies
3. **Installation**: Step-by-step setup instructions
4. **Configuration**: Environment variables and configuration options
5. **Usage**: How to run the project locally
6. **Testing**: How to run tests
7. **Deployment**: How to deploy to production
8. **Contributing**: Guidelines for contributors
9. **License**: Project license information

### Code Documentation

- **Functions/Methods**: Document complex logic, parameters, and return values
  - TypeScript: Use JSDoc comments
  - C#: Use XML documentation comments
  - Python: Use docstrings
  - Java: Use Javadoc
- **Classes**: Document purpose and responsibilities
- **APIs**: Use OpenAPI/Swagger for API documentation
- **Architecture**: Maintain architecture diagrams and ADRs

### Documentation Tools

- **API Docs**: Swagger/OpenAPI, Postman, Insomnia
- **Code Docs**: JSDoc, TSDoc, Sphinx, Doxygen
- **Diagrams**: Mermaid, PlantUML, Draw.io, Lucidchart
- **Wiki**: GitHub Wiki, Confluence, Notion

---

## 📜 Naming Conventions & Style

### TypeScript / React

- **Components**: PascalCase (e.g., `FileList`, `Dashboard`)
- **Files**: Match component name (e.g., `FileList.tsx`)
- **Hooks**: Start with `use` (e.g., `useTheme`, `useAuth`)
- **Types/Interfaces**: PascalCase (e.g., `FileItemDto`, `UserProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`)
- **Functions/Variables**: camelCase (e.g., `handleSubmit`, `isLoading`)

### C# / .NET

- **Namespaces**: Use file-scoped namespaces (C#) and consistent directory structures.
- **Interfaces**: Start with `I` (e.g., `IStorageService`, `IRepository`).
- **Async**: Methods must end in `Async` (e.g., `GetFileAsync`, `SaveAsync`).
- **Classes**: PascalCase (e.g., `FileRepository`, `UserService`)
- **Private Fields**: \_camelCase with underscore prefix (e.g., `_dbContext`, `_logger`)
- **Properties**: PascalCase (e.g., `FileName`, `CreatedDate`)

### General Rules

- **No `any` types**: Always use proper TypeScript types
- **Descriptive names**: Use meaningful, self-documenting names
- **Avoid abbreviations**: Unless widely understood (e.g., `id`, `url`, `api`)
- **Consistency**: Follow existing patterns in the codebase

---

## 📖 Architecture Decision Records (ADR)

Projects should document project-specific ADRs separately. **The Horizon Standard** provides recommendations for common architectural decisions:

### Database Selection

- **Relational**: PostgreSQL (preferred), MySQL, SQL Server, Oracle
  - Use for: Transactional data, complex relationships, ACID requirements
- **Document**: MongoDB, CouchDB, DynamoDB
  - Use for: Flexible schemas, hierarchical data, high write throughput
- **Key-Value**: Redis, Memcached
  - Use for: Caching, session storage, real-time data
- **Time-Series**: InfluxDB, TimescaleDB
  - Use for: Metrics, logs, IoT data
- **Graph**: Neo4j, ArangoDB
  - Use for: Social networks, recommendation engines, knowledge graphs

### Observability Stack

- **Logging**:
  - Structured logging (JSON format with context)
  - Tools: Seq, ELK Stack (Elasticsearch, Logstash, Kibana), Datadog, Splunk, CloudWatch
- **Metrics**: Prometheus, Grafana, Application Insights, New Relic
- **Tracing**: Jaeger, Zipkin, OpenTelemetry
- **Health Checks**: Implement `/health` and `/ready` endpoints

### Caching Strategy

- **Distributed**: Redis (preferred), Memcached
  - Use for: Horizontally scalable services, shared cache
- **In-Memory**: Built-in caching (MemoryCache, etc.)
  - Use for: Single-instance applications, simple caching needs
- **CDN**: CloudFlare, AWS CloudFront, Azure CDN
  - Use for: Static assets, global distribution

### Message Queues & Event Streaming

- **Message Queues**: RabbitMQ, AWS SQS, Azure Service Bus
  - Use for: Task queues, async processing, decoupling services
- **Event Streaming**: Apache Kafka, AWS Kinesis, Azure Event Hubs
  - Use for: Event sourcing, real-time analytics, high-throughput events
- **Pub/Sub**: Redis Pub/Sub, Google Pub/Sub, MQTT
  - Use for: Real-time notifications, lightweight messaging

### API Architecture

- **REST**: Standard HTTP APIs with JSON
  - Use for: CRUD operations, public APIs, simple integrations
- **GraphQL**: Query language for APIs
  - Use for: Complex data requirements, mobile apps, flexible queries
- **gRPC**: High-performance RPC framework
  - Use for: Microservices communication, high-performance needs
- **WebSockets/SignalR**: Real-time bidirectional communication
  - Use for: Chat, notifications, live updates

### Authentication & Authorization

- **JWT**: JSON Web Tokens for stateless auth
- **OAuth 2.0**: For third-party integrations
- **OpenID Connect**: For identity layer on top of OAuth 2.0
- **Session-based**: For traditional web applications
- **API Keys**: For service-to-service communication

### Storage Solutions

- **Object Storage**: AWS S3, Azure Blob Storage, Google Cloud Storage, Cloudinary
  - Use for: Files, images, videos, backups
- **File System**: Local disk, NFS, SMB
  - Use for: Development, small-scale deployments
- **CDN**: For global content delivery

### Background Jobs

- **Node.js**: BullMQ, Agenda, Bee-Queue
- **.NET**: Hangfire, Quartz.NET
- **Python**: Celery, RQ (Redis Queue)
- **Java**: Quartz, Spring Batch

---

## 🧪 Testing Standards

### Unit Testing

- **Coverage**: Aim for 80%+ code coverage on business logic
- **Naming**: Test names should describe what is being tested and expected outcome
  - Example: `test_user_login_with_invalid_credentials_returns_401`
  - Example: `should_throw_error_when_file_not_found`
- **Arrange-Act-Assert**: Follow AAA pattern for test structure
- **Isolation**: Tests should be independent and not rely on execution order

### Integration Testing

- **API Tests**: Test all API endpoints with various scenarios
- **Database Tests**: Use test databases or in-memory databases
- **External Services**: Mock external dependencies appropriately

### End-to-End Testing

- **Critical Paths**: Test main user journeys
- **Tools**: Use appropriate E2E tools (Playwright, Cypress, Selenium, etc.)
- **CI Integration**: E2E tests should run in CI pipeline

### Testing Tools by Stack

- **JavaScript/TypeScript**: Jest, Vitest, Mocha, Chai, Testing Library
- **.NET**: xUnit, NUnit, MSTest, Moq, FluentAssertions
- **Python**: pytest, unittest, mock
- **Java**: JUnit, Mockito, TestNG

---

## ✅ Gold Standard Verification

### Frontend (TypeScript/React/Vue/Angular)

1. **Zero-Error Build**: Build command succeeds without errors
   - React/Vue: `npm run build`
   - Angular: `ng build`
2. **Zero `any` Types**: No `any` types in codebase (except auto-generated files)
3. **Linting Passes**: Linting returns 0 errors
   - ESLint: `npm run lint`
   - TSLint: `tslint --project .`
4. **Formatted Code**: Code formatted with Prettier or equivalent
   - Auto-fix: `npm run lint -- --fix` or `prettier --write .`
5. **Type Safety**: All props, state, and API responses properly typed
6. **Tests Pass**: All unit and integration tests passing
   - Jest/Vitest: `npm test`
   - Karma: `ng test`

### Backend (.NET)

1. **Zero-Error Build**: `dotnet build` succeeds without errors
2. **Tests Pass**: `dotnet test` all tests passing
3. **No Warnings**: Build produces no warnings (or only acceptable warnings)
4. **Proper DI**: All dependencies injected via constructor
5. **CQRS Pattern**: Commands and Queries properly separated (if applicable)
6. **Validation**: FluentValidation or Data Annotations properly implemented

### Backend (Node.js)

1. **Zero-Error Build**: `npm run build` or `tsc` succeeds without errors
2. **Tests Pass**: `npm test` all tests passing
3. **Linting Passes**: `npm run lint` returns 0 errors
4. **Type Safety**: Proper TypeScript types throughout
5. **Error Handling**: Centralized error middleware implemented

### Backend (Python)

1. **Zero-Error Build**: No syntax errors, imports resolve
2. **Tests Pass**: `pytest` all tests passing
3. **Linting Passes**: `flake8 .` or `pylint` returns 0 errors
4. **Type Hints**: Type hints used throughout (checked with `mypy`)
5. **Formatting**: Code formatted with `black` or `autopep8`

### Infrastructure

1. **Stable Infrastructure**: Health checks green for all services
2. **Container Orchestration**: All services start successfully
   - Docker Compose: `docker-compose up`
   - Kubernetes: `kubectl get pods` all running
3. **Environment Parity**: Local dev matches production architecture
4. **Logs Structured**: All logs in JSON format with context
5. **Secrets Management**: No hardcoded secrets, using environment variables or secret managers

### General

1. **Standardized Formatting**: Ruleset-compliant project-wide
2. **Conventional Commits**: All commits follow `type(scope): description` format
3. **Documentation**: README and architecture docs up to date
4. **Security**: Security headers and best practices implemented
5. **Performance**: No obvious performance bottlenecks or anti-patterns

---

## 🤖 AI Agent Instructions

### Before Starting Work

1. **Read the Blueprint**: Always check this file first to understand the standards
2. **Check Steering Files**: Review `.kiro/steering/` or equivalent for project-specific rules
3. **Understand the Stack**: Identify the technology stack (Frontend framework, Backend language, Database, etc.)
4. **Review Existing Code**: Look at existing patterns and conventions in the codebase
5. **Check Dependencies**: Understand what libraries and tools are already in use

### During Development

1. **Follow Patterns**: Use existing code patterns as reference - consistency is key
2. **Type Everything**:
   - TypeScript: No `any` types - use proper types
   - Python: Use type hints
   - C#: Use strong typing
   - Java: Use generics appropriately
3. **Modularize First**: If a file exceeds 200 lines, extract logic into smaller modules
4. **Audit the Chain**: Ensure changes propagate correctly:
   - Backend: Entity → DTO → Handler/Service → API → Client
   - Frontend: API Client → State Management → Component → UI
5. **Test Locally**: Run builds and tests before committing
6. **Error Handling**: Implement proper error handling at every layer
7. **Security First**: Never commit secrets, always validate inputs, follow security best practices

### Before Committing

**CRITICAL**: Always run these checks before committing:

#### Frontend (JavaScript/TypeScript)

```bash
# React/Vue/Angular
npm run lint -- --fix  # Auto-fix linting errors
npm run build          # Ensure build succeeds
npm test               # Run tests (if applicable)
```

#### Backend (.NET)

```bash
dotnet build           # Ensure build succeeds
dotnet test            # Run all tests
```

#### Backend (Node.js)

```bash
npm run lint -- --fix  # Auto-fix linting errors
npm run build          # Compile TypeScript
npm test               # Run tests
```

#### Backend (Python)

```bash
flake8 .               # Check linting
black .                # Format code
pytest                 # Run tests
mypy .                 # Type checking
```

#### Git Workflow

```bash
git add .
git commit -m "type(scope): description"
git push
```

### Code Quality Checklist

Before marking any task as complete, verify:

- ✅ **No type shortcuts**: No `any` types (TS), proper type hints (Python), strong typing (C#/Java)
- ✅ **Proper error handling**: Centralized error handling, no silent failures
- ✅ **Follows naming conventions**: Consistent with project standards
- ✅ **Uses dependency injection**: Services properly injected, not instantiated
- ✅ **Implements validation**: Input validation at API boundaries
- ✅ **Passes linting**: Zero linting errors
- ✅ **Builds successfully**: No build errors or warnings
- ✅ **Tests pass**: All unit and integration tests passing
- ✅ **Committed properly**: Conventional commit format used
- ✅ **Security checked**: No secrets, proper authentication/authorization
- ✅ **Performance considered**: No obvious bottlenecks or anti-patterns

### Common Pitfalls to Avoid

1. **Don't skip linting**: Always run and fix linting errors before committing
2. **Don't use `any`**: Take the time to define proper types
3. **Don't hardcode values**: Use configuration files and environment variables. **Never hardcode content** - use a CMS for dynamic content
4. **Don't ignore errors**: Implement proper error handling and logging
5. **Don't break patterns**: Follow existing architectural patterns in the codebase
6. **Don't commit secrets**: Use environment variables or secret managers
7. **Don't skip tests**: Write tests for new functionality
8. **Don't create god classes**: Keep classes and functions focused and small

### When Stuck

1. **Review similar code**: Look for similar functionality already implemented
2. **Check documentation**: Review API docs, library docs, and project docs
3. **Ask for clarification**: If requirements are unclear, ask the user
4. **Start simple**: Implement the simplest solution first, then refactor
5. **Test incrementally**: Test each piece as you build it

---

## 🎯 Summary: Definition of Done

A feature or task is only considered "Done" when ALL of the following are met:

### Code Quality

- ✅ Code builds without errors
- ✅ All tests pass
- ✅ Linting passes with 0 errors
- ✅ Code formatted according to project standards
- ✅ No type shortcuts (no `any` in TypeScript, proper type hints in Python, etc.)
- ✅ Follows naming conventions
- ✅ Proper error handling implemented
- ✅ Security best practices followed

### Testing

- ✅ Unit tests written for new functionality
- ✅ Integration tests for API endpoints
- ✅ Edge cases covered
- ✅ All tests passing

### Documentation

- ✅ Code comments for complex logic
- ✅ API documentation updated (if applicable)
- ✅ README updated (if applicable)
- ✅ Architecture docs updated (if applicable)

### Git & Deployment

- ✅ Committed with conventional commit format
- ✅ Pushed to remote repository
- ✅ Passes CI/CD pipeline
- ✅ Health checks pass in containerized environment (if applicable)

### Review

- ✅ Code reviewed by at least one other developer (if team project)
- ✅ All review comments addressed
- ✅ Approved for merge

---

_The Horizon Standard - Universal Architecture & Excellence Blueprint_  
_Created February 2026_  
_Version 1.0_

**This document is designed to be copied and adapted for any software project.**  
**Customize the technology-specific sections while maintaining the core principles.**
