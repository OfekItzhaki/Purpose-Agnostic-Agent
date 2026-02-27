# Implementation Plan: Admin Panel for Persona and Knowledge Management

## Overview

This implementation plan breaks down the admin panel feature into incremental, testable tasks. The approach follows a bottom-up strategy: database schema → core services → controllers → integration. Each task builds on previous work, ensuring the system remains functional at every checkpoint.

## Tasks

- [x] 1. Database schema extensions for admin functionality
  - [x] 1.1 Create admin_users table with authentication fields
    - Add table with columns: id, username, password_hash, email, role, created_at, updated_at
    - Add unique constraints on username and email
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 1.2 Create audit_logs table for tracking admin actions
    - Add table with columns: id, admin_user_id, action_type, entity_type, entity_id, details (JSONB), ip_address, timestamp
    - Add foreign key to admin_users table
    - Add indexes on timestamp and admin_user_id for efficient querying
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 1.3 Create knowledge_categories table
    - Add table with columns: id, name, description, document_count, created_at, updated_at
    - Add unique constraint on name
    - Add validation constraint for name format (alphanumeric and hyphens only)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 1.4 Add migration script for schema updates
    - Create migration file that adds all new tables
    - Include rollback logic for safe deployment
    - _Requirements: 1.1, 5.1, 7.1_

- [x] 2. Admin authentication module
  - [x] 2.1 Create AdminUser entity and repository
    - Define AdminUser entity with TypeORM decorators
    - Implement PostgresAdminUserRepository with CRUD methods
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement AdminAuthService with JWT token generation
    - Create login method with password verification using bcrypt
    - Implement JWT token generation with expiration
    - Add rate limiting logic to prevent brute force attacks
    - _Requirements: 1.2, 1.3, 1.4, 1.6_
  
  - [x]* 2.3 Write unit tests for AdminAuthService
    - Test successful login with valid credentials
    - Test failed login with invalid credentials
    - Test rate limiting behavior
    - Test token expiration handling
    - _Requirements: 1.2, 1.3, 1.4, 1.6_
  
  - [x] 2.4 Create AdminAuthGuard for protecting admin routes
    - Implement NestJS guard that validates JWT tokens
    - Add logic to extract and verify admin user from token
    - Return 401 for missing/invalid tokens
    - _Requirements: 1.1, 1.4, 10.3, 10.4_
  
  - [x] 2.5 Create AdminAuthController with login endpoint
    - Implement POST /admin/auth/login endpoint
    - Add DTO validation for login credentials
    - Return JWT token on successful authentication
    - _Requirements: 1.2, 1.3_

- [x] 3. Audit logging infrastructure
  - [x] 3.1 Create AuditLog entity and repository
    - Define AuditLog entity with TypeORM decorators
    - Implement PostgresAuditLogRepository with insert and query methods
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 3.2 Implement AuditLogService
    - Create logAction method that captures admin actions
    - Add logAuthEvent method for authentication events
    - Implement query methods with filtering by action type, user, and date range
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 3.3 Create AuditLogDecorator for automatic logging
    - Implement custom decorator that wraps controller methods
    - Automatically capture method parameters and results
    - Extract admin user from request context
    - _Requirements: 7.1, 7.2_
  
  - [x]* 3.4 Write unit tests for AuditLogService
    - Test action logging with correct timestamp and user
    - Test query filtering by action type, user, and date
    - Test log retention logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Knowledge category management
  - [x] 4.1 Create KnowledgeCategory entity and repository
    - Define KnowledgeCategory entity with TypeORM decorators
    - Implement PostgresKnowledgeCategoryRepository with CRUD methods
    - Add method to check if category has associated documents
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.2 Implement AdminKnowledgeCategoryService
    - Create createCategory method with name validation
    - Implement listCategories with document counts
    - Add deleteCategory with document check logic
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 4.3 Create DTOs for category operations
    - CreateKnowledgeCategoryDto with validation rules
    - UpdateKnowledgeCategoryDto for partial updates
    - KnowledgeCategoryResponseDto with document counts
    - _Requirements: 5.1, 5.2_
  
  - [x]* 4.4 Write unit tests for AdminKnowledgeCategoryService
    - Test category creation with valid and invalid names
    - Test deletion prevention when category has documents
    - Test successful deletion of empty category
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Admin persona management service
  - [x] 6.1 Create AdminPersonaService extending existing PersonaService
    - Implement getAllPersonas method with pagination
    - Add getPersonaById with detailed configuration
    - Implement validatePersonaConfig method
    - _Requirements: 2.3, 2.4, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 6.2 Add persona validation logic
    - Validate temperature range (0.0 to 1.0)
    - Validate max_tokens is positive integer
    - Verify knowledge category exists before assignment
    - Validate persona id format (lowercase, alphanumeric, hyphens)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 6.3 Implement checkPersonaInUse method
    - Query chat_sessions table for active sessions using persona
    - Return count of active sessions
    - _Requirements: 2.7_
  
  - [x]* 6.4 Write unit tests for AdminPersonaService
    - Test persona validation with valid and invalid configurations
    - Test category existence verification
    - Test persona in-use detection
    - _Requirements: 2.7, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Admin knowledge document service
  - [x] 7.1 Create AdminKnowledgeService
    - Implement listDocuments method with category filtering
    - Add getDocumentById with metadata and chunk count
    - Implement searchDocuments with text search
    - Add getStatistics method for knowledge base metrics
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 7.2 Implement document deletion logic
    - Create deleteDocument method that removes document and chunks
    - Use CASCADE delete from database schema
    - Update category document counts
    - _Requirements: 4.4_
  
  - [x] 7.3 Add bulk operation methods
    - Implement bulkDeleteDocuments with transaction support
    - Add bulkReassignCategory method
    - Return operation results with success/failure counts
    - _Requirements: 6.4, 6.5, 6.6_
  
  - [x]* 7.4 Write unit tests for AdminKnowledgeService
    - Test document listing with category filtering
    - Test search functionality
    - Test bulk operations with partial failures
    - Test statistics calculation
    - _Requirements: 4.1, 4.2, 4.5, 6.4, 6.5, 6.6, 9.1, 9.2, 9.3_

- [x] 8. Document upload and ingestion integration
  - [x] 8.1 Create AdminDocumentUploadService
    - Implement validateUpload method (file size, file type)
    - Add uploadDocument method that saves file and triggers ingestion
    - Implement bulkUploadDocuments for multiple files
    - _Requirements: 3.1, 3.2, 3.7, 3.8, 6.1, 6.2_
  
  - [x] 8.2 Integrate with existing DocumentIngestionProcessor
    - Trigger ingestion job for uploaded documents
    - Track ingestion status in database
    - Handle ingestion failures with retry logic
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 11.5_
  
  - [x] 8.3 Create DTOs for upload operations
    - UploadDocumentDto with file, category, and metadata
    - UploadStatusDto with processing state
    - BulkUploadResultDto with per-file results
    - _Requirements: 3.2, 3.3, 3.4, 6.2, 6.3_
  
  - [x]* 8.4 Write unit tests for AdminDocumentUploadService
    - Test file validation (size, type)
    - Test successful upload and ingestion trigger
    - Test bulk upload with mixed success/failure
    - _Requirements: 3.7, 3.8, 6.1, 6.2_

- [x] 9. Ingestion pipeline monitoring service
  - [x] 9.1 Create IngestionMonitorService
    - Implement getQueueStatus method for pending documents
    - Add getProcessingStatistics for timing metrics
    - Implement getFailedIngestions with error details
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 9.2 Add ingestion event tracking
    - Create ingestion_events table for tracking pipeline activity
    - Log start, completion, and failure events
    - Store processing time and embedding provider info
    - _Requirements: 7.5, 11.3, 11.6_
  
  - [x] 9.3 Implement retry mechanism for failed ingestions
    - Add retryIngestion method that re-triggers processing
    - Track retry attempts and prevent infinite loops
    - _Requirements: 3.6, 11.5_
  
  - [x]* 9.4 Write unit tests for IngestionMonitorService
    - Test queue status calculation
    - Test statistics aggregation
    - Test retry logic with max attempts
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Admin controllers for persona operations
  - [x] 11.1 Create AdminPersonaController
    - Implement GET /admin/personas (list all with pagination)
    - Implement GET /admin/personas/:id (get details)
    - Implement POST /admin/personas (create with validation)
    - Implement PUT /admin/personas/:id (update with validation)
    - Implement DELETE /admin/personas/:id (delete with in-use check)
    - Apply @UseGuards(AdminAuthGuard) to all endpoints
    - Apply @AuditLog decorator to all mutation endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.1_
  
  - [x] 11.2 Add Swagger/OpenAPI documentation
    - Add @ApiTags, @ApiOperation, @ApiResponse decorators
    - Document request/response schemas
    - Include authentication requirements
    - _Requirements: 10.5_
  
  - [x]* 11.3 Write integration tests for AdminPersonaController
    - Test authenticated access to all endpoints
    - Test unauthorized access returns 401
    - Test persona creation with invalid data returns 400
    - Test deletion of in-use persona shows warning
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 10.3, 10.4_

- [x] 12. Admin controllers for knowledge operations
  - [x] 12.1 Create AdminKnowledgeController
    - Implement GET /admin/knowledge/documents (list with filtering)
    - Implement GET /admin/knowledge/documents/:id (get details)
    - Implement POST /admin/knowledge/documents/upload (single upload)
    - Implement POST /admin/knowledge/documents/bulk-upload (multiple uploads)
    - Implement DELETE /admin/knowledge/documents/:id (delete document)
    - Implement POST /admin/knowledge/documents/bulk-delete (bulk deletion)
    - Implement PUT /admin/knowledge/documents/bulk-reassign (category reassignment)
    - Apply @UseGuards(AdminAuthGuard) to all endpoints
    - Apply @AuditLog decorator to all mutation endpoints
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.4, 6.5, 6.6, 10.2_
  
  - [x] 12.2 Add file upload handling with multer
    - Configure multer for file size limits (10MB)
    - Add file type validation middleware
    - Handle multipart/form-data requests
    - _Requirements: 3.7, 3.8_
  
  - [x]* 12.3 Write integration tests for AdminKnowledgeController
    - Test document upload with valid file
    - Test upload rejection for oversized files
    - Test bulk operations with partial failures
    - Test unauthorized access returns 401
    - _Requirements: 3.1, 3.7, 3.8, 6.1, 6.2, 10.3, 10.4_

- [x] 13. Admin controllers for category and monitoring
  - [x] 13.1 Create AdminCategoryController
    - Implement GET /admin/categories (list with document counts)
    - Implement POST /admin/categories (create category)
    - Implement DELETE /admin/categories/:id (delete with validation)
    - Apply @UseGuards(AdminAuthGuard) to all endpoints
    - Apply @AuditLog decorator to all mutation endpoints
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 13.2 Create AdminMonitoringController
    - Implement GET /admin/monitoring/ingestion/status (queue status)
    - Implement GET /admin/monitoring/ingestion/statistics (processing stats)
    - Implement GET /admin/monitoring/ingestion/failed (failed ingestions)
    - Implement POST /admin/monitoring/ingestion/retry/:id (retry failed)
    - Implement GET /admin/monitoring/statistics (knowledge base stats)
    - Apply @UseGuards(AdminAuthGuard) to all endpoints
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 13.3 Create AdminAuditController
    - Implement GET /admin/audit/logs (list with filtering)
    - Add query parameters for action type, user, date range
    - Apply @UseGuards(AdminAuthGuard) to all endpoints
    - _Requirements: 7.3_
  
  - [x]* 13.4 Write integration tests for admin controllers
    - Test category creation and deletion flows
    - Test monitoring endpoints return correct data
    - Test audit log filtering
    - _Requirements: 5.1, 5.4, 7.3, 11.1, 11.2_

- [x] 14. Persona testing interface
  - [x] 14.1 Create AdminPersonaTestService
    - Implement testPersona method that sends query to persona
    - Capture retrieved knowledge chunks and relevance scores
    - Track model provider and token usage
    - Ensure test queries don't create persistent sessions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [x] 14.2 Add test endpoint to AdminPersonaController
    - Implement POST /admin/personas/:id/test
    - Accept test query in request body
    - Return response with chunks, scores, and usage metrics
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_
  
  - [x]* 14.3 Write unit tests for AdminPersonaTestService
    - Test query execution without session persistence
    - Test chunk retrieval and score capture
    - Test token usage tracking
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 15. Error handling and validation
  - [x] 15.1 Create custom exception filters
    - AdminAuthenticationException for auth failures
    - AdminValidationException for validation errors
    - AdminResourceNotFoundException for missing entities
    - AdminConflictException for duplicate resources
    - _Requirements: 1.3, 2.2, 8.4, 10.4, 10.6_
  
  - [x] 15.2 Implement consistent error response format
    - Create ErrorResponseDto with type, title, status, detail fields
    - Apply exception filter globally to admin module
    - Ensure all API endpoints return consistent error format
    - _Requirements: 10.7_
  
  - [x] 15.3 Add request validation pipes
    - Configure ValidationPipe with whitelist and transform options
    - Add custom validation decorators for persona id format
    - Add custom validation for category name format
    - _Requirements: 2.1, 5.2, 8.5, 8.6, 10.6_

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Command pattern for bulk operations
  - [x] 17.1 Create BulkOperationCommand interface
    - Define execute method that returns operation results
    - Add validate method for pre-execution checks
    - Include rollback method for transaction support
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 17.2 Implement BulkDeleteDocumentsCommand
    - Execute deletion in transaction
    - Track success/failure for each document
    - Update category document counts
    - _Requirements: 6.4, 6.5_
  
  - [x] 17.3 Implement BulkReassignCategoryCommand
    - Validate target category exists
    - Execute reassignment in transaction
    - Update document counts for both categories
    - _Requirements: 6.6_
  
  - [x] 17.4 Implement BulkUploadCommand
    - Process uploads in parallel with concurrency limit
    - Track progress for each file
    - Handle partial failures gracefully
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x]* 17.5 Write unit tests for command implementations
    - Test transaction rollback on failure
    - Test partial success scenarios
    - Test progress tracking
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 18. Admin module integration
  - [x] 18.1 Create AdminModule
    - Import required modules (TypeOrmModule, JwtModule, MulterModule)
    - Register all admin services as providers
    - Export AdminAuthGuard for use in other modules
    - _Requirements: All_
  
  - [x] 18.2 Register AdminModule in AppModule
    - Add AdminModule to imports array
    - Configure JWT secret from environment variables
    - Configure multer storage options
    - _Requirements: All_
  
  - [x] 18.3 Add environment variables for admin configuration
    - ADMIN_JWT_SECRET for token signing
    - ADMIN_JWT_EXPIRATION for token lifetime
    - ADMIN_RATE_LIMIT_MAX for login attempts
    - ADMIN_RATE_LIMIT_WINDOW for rate limit window
    - _Requirements: 1.2, 1.4, 1.6_

- [x] 19. API documentation and examples
  - [x] 19.1 Generate OpenAPI specification
    - Configure Swagger module in main.ts
    - Add API documentation route at /admin/api-docs
    - Include authentication scheme in spec
    - _Requirements: 10.5_
  
  - [x] 19.2 Create API usage examples
    - Add example requests for all endpoints in Swagger
    - Include curl examples in API documentation
    - Document error response formats
    - _Requirements: 10.5_
  
  - [x] 19.3 Add README for admin API
    - Document authentication flow
    - List all available endpoints with descriptions
    - Include setup instructions for admin users
    - _Requirements: 10.5_

- [x] 20. Property-based tests for correctness properties
  - [x]* 20.1 Write property test for audit log completeness
    - **Property 1: All admin mutations are logged**
    - **Validates: Requirements 7.1, 7.2**
    - Generate random admin operations
    - Verify each operation creates corresponding audit log entry
    - Check log contains correct timestamp, user, and action details
  
  - [x]* 20.2 Write property test for persona validation consistency
    - **Property 2: Persona validation is consistent**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
    - Generate random persona configurations
    - Verify validation rules are applied consistently across create/update
    - Check invalid configs are always rejected with appropriate errors
  
  - [x]* 20.3 Write property test for bulk operation atomicity
    - **Property 3: Bulk operations maintain data consistency**
    - **Validates: Requirements 6.4, 6.5, 6.6**
    - Generate random bulk operations with some failures
    - Verify partial failures don't leave database in inconsistent state
    - Check category document counts remain accurate
  
  - [x]* 20.4 Write property test for authentication token validity
    - **Property 4: Token validation is secure**
    - **Validates: Requirements 1.2, 1.4**
    - Generate random tokens (valid, expired, malformed)
    - Verify only valid, non-expired tokens grant access
    - Check expired tokens are consistently rejected

- [x] 21. Final checkpoint and integration verification
  - [x] 21.1 Run all tests and verify passing
    - Execute unit tests for all services
    - Execute integration tests for all controllers
    - Execute property-based tests
    - _Requirements: All_
  
  - [x] 21.2 Verify API documentation completeness
    - Check all endpoints documented in Swagger
    - Verify request/response examples are accurate
    - Test API documentation UI is accessible
    - _Requirements: 10.5_
  
  - [x] 21.3 Test end-to-end admin workflows
    - Create admin user → login → create persona → upload document → test persona
    - Verify audit logs capture all actions
    - Test bulk operations with multiple documents
    - _Requirements: All_
  
  - [x] 21.4 Final checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across the system
- Unit and integration tests validate specific examples and edge cases
- The implementation uses TypeScript with NestJS framework
- Database operations use TypeORM with PostgreSQL
- Authentication uses JWT tokens with bcrypt for password hashing
- File uploads use multer middleware with validation
- All admin endpoints are protected with AdminAuthGuard
- Audit logging is applied via decorator pattern for automatic tracking
