# Design Document: Admin Panel for Persona and Knowledge Management

## Overview

This design document specifies the architecture and implementation approach for an administrative panel that enables system administrators to manage personas and knowledge base content in the RAG system.

### Architectural Pattern Decision: CQRS vs Traditional Service Layer

**Question: Should we use CQRS (Command Query Responsibility Segregation)?**

**Recommendation: No, stick with traditional service layer pattern**

**Rationale:**
- The existing codebase uses a consistent service-controller-repository pattern
- Admin operations are relatively simple CRUD with moderate complexity
- Read/write patterns are not sufficiently divergent to justify CQRS overhead
- No evidence of read-heavy workloads that would benefit from separate read models
- CQRS adds complexity without clear benefits for this use case
- The system already has effective patterns: Registry, Circuit breaker, Queue-based processing

**Chosen Pattern: Enhanced Service Layer with Command Pattern for Complex Operations**

We'll use:
- Traditional service layer for simple CRUD operations
- Command pattern for complex multi-step operations (bulk uploads)
- Repository pattern for data access
- Decorator pattern for audit logging

### Core Design Principles

1. Consistency with existing architecture
2. Separation of concerns
3. Security first
4. Observability
5. Testability



## Architecture

### Module Structure

```
src/admin/
├── controllers/
│   ├── admin-persona.controller.ts
│   ├── admin-knowledge.controller.ts
│   ├── admin-category.controller.ts
│   └── admin-statistics.controller.ts
├── services/
│   ├── admin-persona.service.ts
│   ├── admin-knowledge.service.ts
│   ├── admin-category.service.ts
│   ├── statistics.service.ts
│   └── audit.service.ts
├── commands/
│   ├── bulk-upload.command.ts
│   └── bulk-category-reassign.command.ts
├── repositories/
│   ├── audit-log.repository.ts
│   └── category.repository.ts
├── guards/
│   ├── admin-auth.guard.ts
│   └── admin-rate-limit.guard.ts
├── decorators/
│   └── audit-log.decorator.ts
├── dto/
│   ├── upload-document.dto.ts
│   ├── bulk-upload.dto.ts
│   ├── create-category.dto.ts
│   └── test-persona.dto.ts
└── entities/
    ├── audit-log.entity.ts
    └── knowledge-category.entity.ts
```

## Components and Interfaces

### 1. Authentication & Authorization

**AdminAuthGuard**
```typescript
interface AdminAuthGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
  validateToken(token: string): Promise<AdminUser>;
  checkPermissions(user: AdminUser, resource: string, action: string): boolean;
}
```

**AdminUser Interface**
```typescript
interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
}
```



### 2. Admin Persona Service

```typescript
interface AdminPersonaService {
  createPersona(dto: CreatePersonaDto, adminUser: AdminUser): Promise<Persona>;
  updatePersona(id: string, dto: UpdatePersonaDto, adminUser: AdminUser): Promise<Persona>;
  deletePersona(id: string, adminUser: AdminUser): Promise<void>;
  listPersonas(filters?: PersonaFilters): Promise<Persona[]>;
  getPersonaDetails(id: string): Promise<PersonaDetails>;
  checkPersonaInUse(id: string): Promise<{ inUse: boolean; activeSessions: number }>;
  testPersona(id: string, testQuery: string): Promise<TestPersonaResult>;
  validatePersonaConfig(dto: CreatePersonaDto): Promise<ValidationResult>;
}
```

### 3. Admin Knowledge Service

```typescript
interface AdminKnowledgeService {
  uploadDocument(file: Express.Multer.File, category: string, adminUser: AdminUser): Promise<UploadResult>;
  bulkUploadDocuments(files: Express.Multer.File[], category: string, adminUser: AdminUser): Promise<BulkUploadResult>;
  updateDocument(id: string, file: Express.Multer.File, adminUser: AdminUser): Promise<UploadResult>;
  deleteDocument(id: string, adminUser: AdminUser): Promise<void>;
  bulkDeleteDocuments(ids: string[], adminUser: AdminUser): Promise<BulkDeleteResult>;
  listDocuments(filters: DocumentFilters): Promise<KnowledgeDocument[]>;
  getDocumentDetails(id: string): Promise<DocumentDetails>;
  searchDocuments(query: string, category?: string): Promise<KnowledgeDocument[]>;
  getIngestionStatus(documentId: string): Promise<IngestionStatus>;
  retryFailedIngestion(documentId: string): Promise<void>;
  getIngestionQueue(): Promise<QueueStatus>;
}
```

### 4. Category Management Service

```typescript
interface AdminCategoryService {
  createCategory(dto: CreateCategoryDto, adminUser: AdminUser): Promise<KnowledgeCategory>;
  listCategories(): Promise<CategorySummary[]>;
  getCategoryDetails(name: string): Promise<CategoryDetails>;
  deleteCategory(name: string, adminUser: AdminUser): Promise<void>;
  reassignDocuments(fromCategory: string, toCategory: string, adminUser: AdminUser): Promise<ReassignResult>;
}
```

### 5. Statistics Service

```typescript
interface StatisticsService {
  getOverallStats(): Promise<OverallStatistics>;
  getCategoryStats(category: string): Promise<CategoryStatistics>;
  getIngestionStats(timeRange: TimeRange): Promise<IngestionStatistics>;
  getRecentDocuments(limit: number): Promise<KnowledgeDocument[]>;
  getStorageMetrics(): Promise<StorageMetrics>;
}
```

### 6. Audit Service

```typescript
interface AuditService {
  logAction(action: AuditAction): Promise<void>;
  getAuditLogs(filters: AuditFilters): Promise<AuditLog[]>;
  getRecentLogs(limit: number): Promise<AuditLog[]>;
}

interface AuditAction {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  timestamp: Date;
}
```



## Data Models

### Audit Log Entity

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column('jsonb', { nullable: true })
  details: Record<string, any>;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Index()
  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}
```

### Knowledge Category Entity

```typescript
@Entity('knowledge_categories')
export class KnowledgeCategory {
  @PrimaryColumn()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  documentCount?: number;
  chunkCount?: number;
  totalSize?: number;
}
```

### Document Metadata Extension

```sql
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(255);
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS ingestion_error TEXT;
```

### DTOs

**UploadDocumentDto**
```typescript
export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

**CreateCategoryDto**
```typescript
export class CreateCategoryDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

**TestPersonaDto**
```typescript
export class TestPersonaDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsBoolean()
  includeRetrievalDetails?: boolean;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Required for All Admin Operations

*For any* admin endpoint and any request without valid authentication credentials, the system should reject the request with a 401 Unauthorized status.

**Validates: Requirements 1.1**

### Property 2: Valid Credentials Produce Session Token

*For any* valid admin credentials, authentication should produce a session token with expiration time and user identifier.

**Validates: Requirements 1.2**

### Property 3: Invalid Credentials Rejected

*For any* invalid credentials, authentication should fail and return an error message.

**Validates: Requirements 1.3**

### Property 4: Expired Tokens Rejected

*For any* expired session token, requests using that token should be rejected with a 401 Unauthorized status.

**Validates: Requirements 1.4**

### Property 5: Rate Limiting Prevents Brute Force

*For any* sequence of login attempts exceeding the rate limit threshold from the same IP address, subsequent attempts should be throttled with a 429 Too Many Requests status.

**Validates: Requirements 1.6**

### Property 6: Persona Creation Validates Required Fields

*For any* persona creation request missing required fields, the system should reject the request with validation errors.

**Validates: Requirements 2.1**

### Property 7: Duplicate Persona IDs Rejected

*For any* persona creation request with an ID that already exists, the system should reject the request with a conflict error.

**Validates: Requirements 2.2**

### Property 8: Persona CRUD Round Trip

*For any* valid persona, creating it, retrieving it, updating it, and retrieving again should preserve all fields correctly with updates applied.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 9: Active Persona Usage Detection

*For any* persona with active chat sessions, attempting to delete it should return a warning indicating the number of active sessions.

**Validates: Requirements 2.7**

### Property 10: Supported File Formats Accepted

*For any* document in text, PDF, or markdown format, the upload endpoint should accept the file and initiate processing.

**Validates: Requirements 3.1**

### Property 11: Document Upload Requires Category

*For any* document upload request without a category assignment, the system should reject the request with a validation error.

**Validates: Requirements 3.2**

### Property 12: Document Upload Triggers Ingestion

*For any* successfully uploaded document, the system should enqueue an ingestion job in the processing pipeline.

**Validates: Requirements 3.3**

### Property 13: Ingestion Status Queryable

*For any* document being processed, querying its status should return the current processing state.

**Validates: Requirements 3.4, 3.5, 3.6**

### Property 14: File Size Validation

*For any* file exceeding 10MB, the upload endpoint should reject the file with a validation error before processing.

**Validates: Requirements 3.7**

### Property 15: File Type Validation

*For any* file with an unsupported extension or MIME type, the upload endpoint should reject the file with a validation error.

**Validates: Requirements 3.8**

### Property 16: Documents Grouped by Category

*For any* set of documents in the system, listing them should return results grouped by their assigned knowledge category.

**Validates: Requirements 4.1**

### Property 17: Document Metadata Completeness

*For any* document retrieved by ID, the response should include all metadata fields: source path, category, ingestion date, and chunk count.

**Validates: Requirements 4.2**

### Property 18: Document Update Triggers Re-ingestion

*For any* document update operation, the system should enqueue a new ingestion job to regenerate embeddings.

**Validates: Requirements 4.3**

### Property 19: Document Deletion Cascades to Chunks

*For any* document deletion, all associated knowledge chunks should be removed from the database.

**Validates: Requirements 4.4**

### Property 20: Document Search Filters Work Correctly

*For any* search query with filters, the results should only include documents matching all specified filters.

**Validates: Requirements 4.5**

### Property 21: Category Statistics Accuracy

*For any* knowledge category, the displayed statistics should match the actual aggregated values from the database.

**Validates: Requirements 4.6, 9.1, 9.2, 9.3, 9.4**

### Property 22: Category Name Uniqueness

*For any* category creation request with a name that already exists, the system should reject the request with a conflict error.

**Validates: Requirements 5.1**

### Property 23: Category Name Format Validation

*For any* category name containing invalid characters or empty string, the system should reject the request with a validation error.

**Validates: Requirements 5.2**

### Property 24: Non-Empty Category Deletion Prevented

*For any* category containing one or more documents, deletion attempts should be rejected with an error.

**Validates: Requirements 5.4, 5.5**

### Property 25: Empty Category Deletion Allowed

*For any* category containing zero documents, deletion should succeed and remove the category from the system.

**Validates: Requirements 5.6**

### Property 26: Bulk Upload Processes All Files

*For any* bulk upload request with multiple files, the system should create separate ingestion jobs for each file.

**Validates: Requirements 6.1, 6.2**

### Property 27: Bulk Upload Progress Tracking

*For any* bulk upload operation, querying the status should return individual processing states for each uploaded document.

**Validates: Requirements 6.3**

### Property 28: Bulk Deletion Removes All Selected

*For any* set of document IDs in a bulk deletion request, all specified documents should be removed from the system.

**Validates: Requirements 6.4**

### Property 29: Bulk Category Reassignment

*For any* set of documents and a target category, bulk reassignment should update all selected documents to the new category.

**Validates: Requirements 6.6**

### Property 30: Audit Logging for Mutations

*For any* create, update, or delete operation, an audit log entry should be created with timestamp, user ID, action, and resource details.

**Validates: Requirements 7.1**

### Property 31: Authentication Event Logging

*For any* authentication event, an audit log entry should be created with timestamp, user ID, and event type.

**Validates: Requirements 7.2**

### Property 32: Audit Log Filtering

*For any* audit log query with filters, the results should only include log entries matching all specified filters.

**Validates: Requirements 7.3**

### Property 33: Pipeline Event Logging

*For any* ingestion pipeline event, an audit log entry should be created with the document identifier and event details.

**Validates: Requirements 7.5**

### Property 34: Persona Temperature Validation

*For any* persona creation or update with temperature value outside the range [0.0, 1.0], the system should reject the request.

**Validates: Requirements 8.1**

### Property 35: Persona Max Tokens Validation

*For any* persona creation or update with max_tokens that is not a positive integer, the system should reject the request.

**Validates: Requirements 8.2**

### Property 36: Persona Category Reference Validation

*For any* persona creation or update referencing a non-existent knowledge category, the system should reject the request.

**Validates: Requirements 8.3, 8.4**

### Property 37: Persona ID Format Validation

*For any* persona ID containing invalid characters, the system should reject the request with a validation error.

**Validates: Requirements 8.5**

### Property 38: Recent Documents Ordered by Timestamp

*For any* query for recently ingested documents, the results should be ordered by ingestion timestamp in descending order.

**Validates: Requirements 9.5**

### Property 39: API Authorization Enforcement

*For any* API request without a valid API key or token, the system should reject the request with a 401 or 403 status code.

**Validates: Requirements 10.3, 10.4**

### Property 40: API Validation Consistency

*For any* validation rule applied to UI operations, the same validation should be applied to equivalent API operations.

**Validates: Requirements 10.6**

### Property 41: Consistent Error Response Format

*For any* error response from any admin API endpoint, the response should follow a consistent structure.

**Validates: Requirements 10.7**

### Property 42: Ingestion Pipeline Status Visibility

*For any* point in time, querying the pipeline status should return the current state and any active jobs.

**Validates: Requirements 11.1, 11.2**

### Property 43: Ingestion Statistics Calculation

*For any* set of completed ingestion operations, the statistics should correctly calculate average, minimum, and maximum processing times.

**Validates: Requirements 11.3**

### Property 44: Ingestion Error Capture

*For any* ingestion operation that fails, the error message and affected document ID should be stored and retrievable.

**Validates: Requirements 11.4**

### Property 45: Ingestion Retry Re-enqueues Job

*For any* failed ingestion operation, triggering a retry should create a new job in the ingestion queue.

**Validates: Requirements 11.5**

### Property 46: Embedding Provider Tracking

*For any* ingestion operation, the system should record which embedding provider was used.

**Validates: Requirements 11.6**

### Property 47: Persona Test Execution

*For any* test query sent to a persona, the system should return a response containing the answer, retrieved chunks, relevance scores, model provider, and token usage.

**Validates: Requirements 12.2, 12.3, 12.4, 12.6**

### Property 48: Persona Test Session Isolation

*For any* persona test query, the system should not create a persistent chat session in the session repository.

**Validates: Requirements 12.5**



## Error Handling

### Error Response Format

All API endpoints will return errors in RFC 7807 Problem Details format:

```typescript
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: ValidationError[];
}
```

### Error Categories

**Authentication Errors (401)**: Invalid credentials, expired token, missing auth header
**Authorization Errors (403)**: Insufficient permissions, invalid API key
**Validation Errors (400)**: Missing fields, invalid format, out-of-range values
**Conflict Errors (409)**: Duplicate ID, duplicate name, category not empty
**Not Found Errors (404)**: Persona/document/category not found
**Rate Limit Errors (429)**: Too many login attempts, API rate limit exceeded
**Server Errors (500)**: Database failure, ingestion pipeline failure

### Error Handling Strategy

**Retry Logic**: Exponential backoff for transient failures, max 3 retry attempts
**Graceful Degradation**: Return partial data with warnings when possible
**Error Logging**: Structured logging with context, stack traces for 500 errors

## Testing Strategy

### Dual Testing Approach

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Both are complementary and necessary for comprehensive coverage.

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)
**Configuration**: Minimum 100 iterations per property test
**Tagging**: Each property test must reference its design document property

Tag format: `Feature: admin-panel-persona-knowledge-management, Property {number}: {property_text}`

### Test Organization

```
test/
├── unit/
│   ├── admin-persona.spec.ts
│   ├── admin-knowledge.spec.ts
│   ├── admin-category.spec.ts
│   ├── admin-auth.spec.ts
│   └── audit-service.spec.ts
├── property/
│   ├── admin-persona.pbt.spec.ts
│   ├── admin-knowledge.pbt.spec.ts
│   ├── admin-validation.pbt.spec.ts
│   ├── admin-auth.pbt.spec.ts
│   └── audit-logging.pbt.spec.ts
└── arbitraries/
    ├── admin-user.arbitraries.ts
    ├── persona.arbitraries.ts
    ├── document.arbitraries.ts
    └── category.arbitraries.ts
```

### Property Test Examples

**Property 8: Persona CRUD Round Trip**
```typescript
// Feature: admin-panel-persona-knowledge-management, Property 8: Persona CRUD Round Trip
it('should preserve persona data through create-read-update-read cycle', async () => {
  await fc.assert(
    fc.asyncProperty(
      personaArbitrary(),
      personaUpdateArbitrary(),
      async (persona, update) => {
        const created = await adminPersonaService.createPersona(persona, adminUser);
        const retrieved1 = await adminPersonaService.getPersonaDetails(created.id);
        expect(retrieved1).toMatchObject(persona);
        
        const updated = await adminPersonaService.updatePersona(created.id, update, adminUser);
        const retrieved2 = await adminPersonaService.getPersonaDetails(created.id);
        expect(retrieved2).toMatchObject({ ...persona, ...update });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 19: Document Deletion Cascades**
```typescript
// Feature: admin-panel-persona-knowledge-management, Property 19: Document Deletion Cascades to Chunks
it('should remove all chunks when document is deleted', async () => {
  await fc.assert(
    fc.asyncProperty(
      documentArbitrary(),
      fc.array(chunkArbitrary(), { minLength: 1, maxLength: 10 }),
      async (document, chunks) => {
        const doc = await createDocumentWithChunks(document, chunks);
        const chunksBefore = await knowledgeRepo.findChunksByDocument(doc.id);
        expect(chunksBefore.length).toBe(chunks.length);
        
        await adminKnowledgeService.deleteDocument(doc.id, adminUser);
        
        const chunksAfter = await knowledgeRepo.findChunksByDocument(doc.id);
        expect(chunksAfter.length).toBe(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Test Focus Areas

**Specific Examples**: Login with specific credentials, upload specific PDF
**Edge Cases**: Empty file, max length category name, temperature exactly 0.0 or 1.0
**Error Conditions**: Database failure, queue full, concurrent deletion
**Integration Points**: Admin service calling PersonaService, triggering BullMQ jobs

### Test Coverage Goals

- Line coverage: >80%
- Branch coverage: >75%
- Property test coverage: All 48 correctness properties
- Unit test coverage: All edge cases and error conditions

### Testing Tools

- **Jest**: Test runner and assertion library
- **fast-check**: Property-based testing
- **Supertest**: HTTP endpoint testing
- **@nestjs/testing**: NestJS testing utilities
- **testcontainers**: PostgreSQL container for integration tests
