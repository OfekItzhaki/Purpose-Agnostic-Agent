# Admin API Documentation

**Purpose-Agnostic Agent - Administrative Interface**

This document provides comprehensive documentation for the Admin API, which enables system administrators to manage personas and their associated knowledge base content in the RAG (Retrieval-Augmented Generation) system.

---

## Quick Links

- **Interactive API Documentation (Swagger UI):** http://localhost:3000/admin/api-docs
- **API Usage Examples:** [ADMIN_API_EXAMPLES.md](./ADMIN_API_EXAMPLES.md)
- **Error Response Format:** [docs/RFC7807_ERROR_FORMAT.md](./docs/RFC7807_ERROR_FORMAT.md)
- **Security Setup Guide:** [docs/SECURITY_SETUP.md](./docs/SECURITY_SETUP.md)
- **Deployment Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Setup Instructions](#setup-instructions)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Overview

The Admin API provides secure, programmatic access to administrative operations for managing:

- **Personas:** AI agents with specific behavior, instructions, and knowledge category access
- **Knowledge Documents:** Files and text content stored in the knowledge base with embeddings
- **Knowledge Categories:** Classification labels that group related knowledge documents
- **Ingestion Pipeline:** Document processing and embedding generation monitoring
- **Audit Logs:** Tracking of all administrative actions for accountability

### Key Features

- **RESTful API Design:** Standard HTTP methods (GET, POST, PUT, DELETE) for intuitive operations
- **JWT Authentication:** Secure token-based authentication for all endpoints
- **RFC 7807 Error Format:** Standardized, machine-readable error responses
- **Comprehensive Validation:** Input validation with detailed field-level error messages
- **Audit Logging:** Automatic tracking of all administrative actions
- **Bulk Operations:** Efficient batch processing for knowledge document management
- **Real-time Monitoring:** Ingestion pipeline status and statistics
- **Persona Testing:** Test personas with sample queries before deployment

---

## Authentication

All Admin API endpoints require authentication via JWT (JSON Web Token) Bearer token.


### Authentication Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │  Admin API  │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. POST /admin/auth/login                      │
       │     { username, password }                      │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │  2. Validate credentials                        │
       │     - Check username/password                   │
       │     - Verify admin role                         │
       │                                                  │
       │  3. Return JWT token                            │
       │     { access_token, expires_in }                │
       │<────────────────────────────────────────────────┤
       │                                                  │
       │  4. Store token securely                        │
       │     (localStorage, sessionStorage, memory)      │
       │                                                  │
       │  5. Include token in subsequent requests        │
       │     Authorization: Bearer <token>               │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │  6. Validate token                              │
       │     - Verify signature                          │
       │     - Check expiration                          │
       │     - Verify admin role                         │
       │                                                  │
       │  7. Process request and return response         │
       │<────────────────────────────────────────────────┤
       │                                                  │
```

### Obtaining a JWT Token

**Endpoint:** `POST /admin/auth/login`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "type": "https://api.example.com/errors/authentication-error",
  "title": "Authentication Error",
  "status": 401,
  "detail": "Invalid credentials",
  "instance": "/admin/auth/login"
}
```

### Using the JWT Token

Include the token in the `Authorization` header for all subsequent API requests:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**
```bash
curl -X GET http://localhost:3000/admin/personas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Token Expiration

- Default token lifetime: **1 hour** (3600 seconds)
- Configurable via `JWT_EXPIRES_IN` environment variable
- When a token expires, you'll receive a `401 Unauthorized` response
- Re-authenticate by calling `/admin/auth/login` again

### Security Best Practices

1. **Store tokens securely:** Use httpOnly cookies or secure storage mechanisms
2. **Never expose tokens:** Don't log tokens or include them in URLs
3. **Implement token refresh:** Request new tokens before expiration
4. **Use HTTPS:** Always use HTTPS in production to prevent token interception
5. **Rotate credentials:** Change admin passwords regularly
6. **Monitor failed attempts:** Set up alerts for repeated failed login attempts

---

## API Endpoints

The Admin API is organized into five main categories:

### 1. Persona Management

Manage AI personas with specific behavior, instructions, and knowledge category access.

| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| GET | `/admin/personas` | List all personas with pagination | 2.3, 10.1 |
| GET | `/admin/personas/:id` | Get persona details by ID | 2.4, 10.1 |
| POST | `/admin/personas` | Create a new persona | 2.1, 2.2, 8.1-8.5, 10.1 |
| PUT | `/admin/personas/:id` | Update an existing persona | 2.5, 8.1-8.4, 10.1 |
| DELETE | `/admin/personas/:id` | Delete a persona | 2.6, 2.7, 10.1 |
| POST | `/admin/personas/:id/test` | Test persona with a query | 12.1-12.4, 12.6 |

**Key Features:**
- Pagination support for listing personas
- Comprehensive validation (temperature, max tokens, category existence, ID format)
- In-use checking before deletion (prevents deleting personas with active sessions)
- Test interface for verifying persona behavior before deployment
- Audit logging for all create, update, and delete operations

**Example: Create Persona**
```bash
curl -X POST http://localhost:3000/admin/personas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tech-support",
    "name": "Technical Support Agent",
    "description": "Helps users with technical issues and troubleshooting",
    "extraInstructions": "Be concise and technical. Use bullet points when appropriate.",
    "knowledgeCategory": "support",
    "temperature": 0.7,
    "maxTokens": 2000
  }'
```

---

### 2. Knowledge Document Management

Upload, manage, and organize knowledge documents that personas use for retrieval-augmented generation.

| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| GET | `/admin/knowledge/documents` | List all documents with optional filtering | 4.1, 4.5, 10.2 |
| GET | `/admin/knowledge/documents/:id` | Get document details by ID | 4.2, 10.2 |
| GET | `/admin/knowledge/statistics` | Get knowledge base statistics | 9.1-9.5, 10.2 |
| POST | `/admin/knowledge/documents/upload` | Upload a single document | 3.1-3.3, 3.7-3.8, 6.1, 10.2 |
| POST | `/admin/knowledge/documents/bulk-upload` | Upload multiple documents | 6.1-6.3, 3.7-3.8, 10.2 |
| DELETE | `/admin/knowledge/documents/:id` | Delete a document | 4.4, 6.4, 10.2 |
| POST | `/admin/knowledge/documents/bulk-delete` | Delete multiple documents | 6.4-6.5, 10.2 |
| PUT | `/admin/knowledge/documents/bulk-reassign` | Reassign category for multiple documents | 6.6, 10.2 |

**Key Features:**
- Support for PDF, TXT, and Markdown formats
- File size validation (max 10MB per file)
- Category filtering and search functionality
- Bulk operations for efficient management
- Automatic ingestion pipeline triggering
- Comprehensive statistics (total documents, chunks, category breakdowns)
- Audit logging for all upload and delete operations

**Example: Upload Document**
```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "category=general"
```

**Example: Bulk Delete**
```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/bulk-delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": ["doc-123", "doc-456", "doc-789"]
  }'
```

---

### 3. Knowledge Category Management

Create and manage knowledge categories for organizing documents.

| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| GET | `/admin/categories` | List all categories with document counts | 5.1, 5.3 |
| POST | `/admin/categories` | Create a new category | 5.1-5.2 |
| DELETE | `/admin/categories/:id` | Delete a category | 5.4-5.6 |

**Key Features:**
- Category name validation (alphanumeric and hyphens only)
- Document count tracking
- Deletion protection (prevents deleting categories with documents)
- Audit logging for create and delete operations

**Example: Create Category**
```bash
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "technical",
    "description": "Technical documentation and guides"
  }'
```

---

### 4. Ingestion Pipeline Monitoring

Monitor the document ingestion pipeline and manage failed ingestions.

| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| GET | `/admin/monitoring/ingestion/status` | Get ingestion queue status | 11.1-11.2 |
| GET | `/admin/monitoring/ingestion/statistics` | Get processing statistics | 11.3, 11.6 |
| GET | `/admin/monitoring/ingestion/failed` | Get failed ingestions | 11.4 |
| POST | `/admin/monitoring/ingestion/retry/:id` | Retry a failed ingestion | 3.6, 11.5 |
| GET | `/admin/monitoring/statistics` | Get knowledge base statistics | 9.1-9.6 |

**Key Features:**
- Real-time queue status (waiting, active, completed, failed)
- Processing time statistics by document type
- Failed ingestion tracking with error details
- Retry functionality with max attempt limits
- Comprehensive knowledge base metrics

**Example: Get Queue Status**
```bash
curl -X GET http://localhost:3000/admin/monitoring/ingestion/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 3,
  "delayed": 0,
  "paused": 0
}
```

---

### 5. Audit Logs

Track all administrative actions for accountability and troubleshooting.

| Method | Endpoint | Description | Requirements |
|--------|----------|-------------|--------------|
| GET | `/admin/audit/logs` | List audit logs with filtering | 7.3 |

**Key Features:**
- Filter by action type (PERSONA_CREATE, KNOWLEDGE_UPLOAD, etc.)
- Filter by user ID
- Filter by date range
- Includes IP address tracking
- Detailed action context in JSON format

**Example: Get Audit Logs**
```bash
curl -X GET "http://localhost:3000/admin/audit/logs?actionType=PERSONA_CREATE&startDate=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log-123",
      "adminUserId": "admin-456",
      "actionType": "PERSONA_CREATE",
      "entityType": "PERSONA",
      "entityId": "tech-support",
      "details": {
        "name": "Technical Support Agent",
        "knowledgeCategory": "support"
      },
      "ipAddress": "192.168.1.100",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## Setup Instructions

This section provides step-by-step instructions for setting up admin users and configuring the Admin API.

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Environment variables configured (see `.env.example`)

### Step 1: Database Setup

The admin tables are created automatically when you run the database migrations.

**Run migrations:**
```bash
npm run migration:run
```

This creates the following admin-related tables:
- `admin_users` - Admin user accounts
- `admin_audit_logs` - Audit log entries
- `knowledge_categories` - Knowledge category definitions
- `knowledge_documents` - Document metadata
- `knowledge_chunks` - Document chunks with embeddings

### Step 2: Create Admin User

Admin users are created through the database. You can use the provided SQL script or create them manually.

**Option A: Using the SQL Script**

```bash
# Generate a secure password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-secure-password', 10).then(hash => console.log(hash));"
```

Then insert the admin user:

```sql
INSERT INTO admin_users (id, username, password_hash, email, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$...', -- Use the hash generated above
  'admin@example.com',
  'admin',
  NOW(),
  NOW()
);
```

**Option B: Using the Admin Service**

Create a script to add admin users programmatically:

```typescript
// scripts/create-admin.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminUserService } from '../src/admin/services/admin-user.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminUserService = app.get(AdminUserService);

  const admin = await adminUserService.createAdminUser({
    username: 'admin',
    password: 'your-secure-password',
    email: 'admin@example.com',
    role: 'admin',
  });

  console.log('Admin user created:', admin.username);
  await app.close();
}

bootstrap();
```

Run the script:
```bash
npx ts-node scripts/create-admin.ts
```

### Step 3: Configure JWT Secret

Generate a secure JWT secret for token signing:

```bash
openssl rand -base64 32
```

Add to your `.env` file:
```env
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=1h
```

### Step 4: Configure CORS

For development, allow your frontend origin:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

For production, specify your exact domain:

```env
CORS_ORIGIN=https://yourdomain.com
```

### Step 5: Start the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The Admin API will be available at:
- **API Base URL:** http://localhost:3000/admin
- **Swagger UI:** http://localhost:3000/admin/api-docs

### Step 6: Obtain JWT Token

Test authentication by obtaining a JWT token:

```bash
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Step 7: Test API Access

Use the token to test API access:

```bash
curl -X GET http://localhost:3000/admin/personas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "personas": [],
  "total": 0,
  "page": 1,
  "pageSize": 10,
  "totalPages": 0
}
```

### Step 8: Create Initial Knowledge Categories

Create categories for organizing knowledge documents:

```bash
# Create "general" category
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "general",
    "description": "General knowledge and documentation"
  }'

# Create "technical" category
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "technical",
    "description": "Technical documentation and guides"
  }'

# Create "support" category
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "support",
    "description": "Customer support articles and FAQs"
  }'
```

### Step 9: Create Your First Persona

```bash
curl -X POST http://localhost:3000/admin/personas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "general-assistant",
    "name": "General Assistant",
    "description": "A helpful assistant for general queries",
    "extraInstructions": "Be friendly and helpful. Provide clear, concise answers.",
    "knowledgeCategory": "general",
    "temperature": 0.7,
    "maxTokens": 2000
  }'
```

### Step 10: Upload Knowledge Documents

```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/document.pdf" \
  -F "category=general"
```

### Troubleshooting

**Issue: "Invalid credentials" error**
- Verify the username and password are correct
- Check that the admin user exists in the `admin_users` table
- Ensure the password hash was generated correctly

**Issue: "Invalid or missing authentication token"**
- Verify the token is included in the `Authorization` header
- Check that the token hasn't expired (default: 1 hour)
- Ensure the JWT_SECRET matches between token generation and validation

**Issue: "Category not found" when creating persona**
- Create the knowledge category first using `/admin/categories`
- Verify the category name matches exactly (case-sensitive)

**Issue: "File too large" when uploading documents**
- Maximum file size is 10MB per requirement 3.7
- Compress or split large documents before uploading

**Issue: CORS errors in browser**
- Add your frontend origin to the CORS_ORIGIN environment variable
- Ensure the origin includes the protocol (http:// or https://)

---

## Error Handling

The Admin API uses the **RFC 7807 Problem Details for HTTP APIs** standard for all error responses. This provides a consistent, machine-readable format for error handling.

### Standard Error Response Structure

```json
{
  "type": "https://api.example.com/errors/error-type",
  "title": "Human-Readable Error Title",
  "status": 400,
  "detail": "Detailed error message explaining what went wrong",
  "instance": "/api/endpoint/that/failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

### Common Error Types

#### 400 Bad Request - Validation Error

Returned when request validation fails (invalid input, missing required fields, constraint violations).

**Example:**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Validation failed for one or more fields",
  "instance": "/admin/personas",
  "errors": [
    {
      "field": "temperature",
      "message": "temperature must not be greater than 1"
    },
    {
      "field": "id",
      "message": "id must contain only lowercase letters, numbers, and hyphens"
    }
  ]
}
```

#### 401 Unauthorized - Authentication Error

Returned when authentication fails (missing, invalid, or expired token).

**Example:**
```json
{
  "type": "https://api.example.com/errors/authentication-error",
  "title": "Authentication Error",
  "status": 401,
  "detail": "Invalid or missing authentication token",
  "instance": "/admin/personas"
}
```

#### 403 Forbidden - Authorization Error

Returned when the authenticated user lacks permission for the requested operation.

**Example:**
```json
{
  "type": "https://api.example.com/errors/authorization-error",
  "title": "Authorization Error",
  "status": 403,
  "detail": "You do not have permission to perform this action",
  "instance": "/admin/personas"
}
```

#### 404 Not Found

Returned when the requested resource does not exist.

**Example:**
```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Persona with id 'tech-support' not found",
  "instance": "/admin/personas/tech-support"
}
```

#### 409 Conflict

Returned when the request conflicts with the current state (duplicate resource, constraint violation).

**Example:**
```json
{
  "type": "https://api.example.com/errors/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "Persona with id 'tech-support' already exists",
  "instance": "/admin/personas"
}
```

#### 429 Too Many Requests - Rate Limit Exceeded

Returned when the client has exceeded rate limits.

**Example:**
```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Too many login attempts. Please try again in 15 minutes.",
  "instance": "/admin/auth/login"
}
```

#### 500 Internal Server Error

Returned when an unexpected server error occurs.

**Example:**
```json
{
  "type": "https://api.example.com/errors/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your request",
  "instance": "/admin/personas"
}
```

### Error Handling Best Practices

#### 1. Always Check HTTP Status Code First

```typescript
if (!response.ok) {
  const error = await response.json();
  // Handle error based on status code
}
```

#### 2. Use the `type` Field for Programmatic Error Handling

```typescript
switch (error.type) {
  case 'https://api.example.com/errors/validation-error':
    // Handle validation errors
    if (error.errors) {
      error.errors.forEach(err => {
        showFieldError(err.field, err.message);
      });
    }
    break;
  
  case 'https://api.example.com/errors/authentication-error':
    // Redirect to login
    redirectToLogin();
    break;
  
  case 'https://api.example.com/errors/not-found':
    // Show not found message
    showNotFoundMessage(error.detail);
    break;
  
  default:
    // Generic error handling
    showErrorMessage(error.detail);
}
```

#### 3. Display the `detail` Field to Users

The `detail` field contains a human-readable explanation suitable for display to end users.

```typescript
showErrorToast(error.detail);
```

#### 4. Handle Validation Errors Specially

For 400 validation errors, the `errors` array contains field-specific messages:

```typescript
if (error.status === 400 && error.errors) {
  // Map errors to form fields
  const fieldErrors = error.errors.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {});
  
  // Update form validation state
  setFormErrors(fieldErrors);
}
```

#### 5. Implement Retry Logic for Transient Errors

```typescript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw await response.json();
      }
      
      // Retry server errors (5xx)
      if (i === maxRetries - 1) {
        throw await response.json();
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### Complete Error Handling Example

```typescript
async function createPersona(personaData: CreatePersonaDto): Promise<Persona> {
  try {
    const response = await fetch('http://localhost:3000/admin/personas', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(personaData),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Log for debugging
      console.error('API Error:', error);
      
      // Handle specific error types
      switch (error.type) {
        case 'https://api.example.com/errors/validation-error':
          if (error.errors) {
            // Show field-specific errors
            error.errors.forEach(err => {
              showFieldError(err.field, err.message);
            });
          }
          throw new ValidationError(error.detail, error.errors);
        
        case 'https://api.example.com/errors/authentication-error':
          // Token expired or invalid
          clearAuthToken();
          redirectToLogin();
          throw new AuthenticationError(error.detail);
        
        case 'https://api.example.com/errors/conflict':
          // Duplicate persona
          throw new ConflictError(error.detail);
        
        default:
          // Generic error
          throw new ApiError(error.detail, error.status);
      }
    }

    const persona = await response.json();
    return persona;
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError) {
      throw new NetworkError('Failed to connect to API');
    }
    throw err;
  }
}
```

For more detailed error handling examples, see [ADMIN_API_EXAMPLES.md](./ADMIN_API_EXAMPLES.md) and [docs/RFC7807_ERROR_FORMAT.md](./docs/RFC7807_ERROR_FORMAT.md).

---

## Best Practices

### Security

#### 1. Use HTTPS in Production

Always use HTTPS to encrypt data in transit and prevent token interception.

```nginx
server {
  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/your-api.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-api.com/privkey.pem;
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

#### 2. Store Tokens Securely

**Browser Applications:**
- Use httpOnly cookies for maximum security
- Avoid localStorage (vulnerable to XSS attacks)
- Consider sessionStorage for single-tab sessions

**Server-Side Applications:**
- Store tokens in memory or secure key stores
- Never log tokens or include them in URLs
- Implement token refresh mechanisms

#### 3. Implement Rate Limiting

Protect against brute force attacks and abuse:

```typescript
// Per-user rate limiting
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
    getTracker: (req) => req.user?.id || req.ip,
  },
]),
```

#### 4. Rotate Credentials Regularly

- Change admin passwords every 90 days
- Rotate JWT secrets periodically
- Revoke compromised tokens immediately
- Monitor failed authentication attempts

#### 5. Use Strong Passwords

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Avoid common words and patterns
- Use a password manager

### Performance

#### 1. Use Pagination

Always use pagination when listing resources to avoid large response payloads:

```bash
# Good: Paginated request
curl -X GET "http://localhost:3000/admin/personas?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Avoid: Requesting all resources at once
curl -X GET "http://localhost:3000/admin/personas?pageSize=1000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 2. Use Bulk Operations

For multiple operations, use bulk endpoints instead of individual requests:

```bash
# Good: Bulk delete
curl -X POST http://localhost:3000/admin/knowledge/documents/bulk-delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentIds": ["doc-1", "doc-2", "doc-3"]}'

# Avoid: Multiple individual deletes
for id in doc-1 doc-2 doc-3; do
  curl -X DELETE http://localhost:3000/admin/knowledge/documents/$id \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
done
```

#### 3. Filter and Search Efficiently

Use query parameters to filter results server-side:

```bash
# Good: Server-side filtering
curl -X GET "http://localhost:3000/admin/knowledge/documents?category=general" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Avoid: Fetching all and filtering client-side
curl -X GET "http://localhost:3000/admin/knowledge/documents" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Then filter in client code
```

#### 4. Cache Responses

Cache responses that don't change frequently:

```typescript
// Cache categories for 5 minutes
const cachedCategories = await cache.get('categories', async () => {
  const response = await fetch('http://localhost:3000/admin/categories', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}, { ttl: 300 });
```

#### 5. Monitor Ingestion Pipeline

Regularly check the ingestion pipeline status to identify bottlenecks:

```bash
# Check queue status
curl -X GET http://localhost:3000/admin/monitoring/ingestion/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check processing statistics
curl -X GET http://localhost:3000/admin/monitoring/ingestion/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Data Management

#### 1. Organize Knowledge with Categories

Create logical categories before uploading documents:

```bash
# Create categories first
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "product-docs", "description": "Product documentation"}'

# Then upload documents to the category
curl -X POST http://localhost:3000/admin/knowledge/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@product-guide.pdf" \
  -F "category=product-docs"
```

#### 2. Use Descriptive Persona IDs

Use clear, descriptive IDs for personas:

```bash
# Good: Descriptive IDs
"id": "customer-support-agent"
"id": "technical-documentation-assistant"
"id": "sales-inquiry-handler"

# Avoid: Generic or unclear IDs
"id": "persona1"
"id": "agent-a"
"id": "test"
```

#### 3. Test Personas Before Deployment

Always test personas with sample queries before making them available to end users:

```bash
curl -X POST http://localhost:3000/admin/personas/customer-support-agent/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I reset my password?"
  }'
```

Review the response to ensure:
- The answer is accurate and helpful
- Retrieved knowledge chunks are relevant
- The tone and style match expectations

#### 4. Monitor Failed Ingestions

Regularly check for failed document ingestions and retry them:

```bash
# Get failed ingestions
curl -X GET http://localhost:3000/admin/monitoring/ingestion/failed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Retry failed ingestion
curl -X POST http://localhost:3000/admin/monitoring/ingestion/retry/doc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. Use Audit Logs for Troubleshooting

When investigating issues, use audit logs to track changes:

```bash
# Find all persona changes in the last 24 hours
curl -X GET "http://localhost:3000/admin/audit/logs?actionType=PERSONA_UPDATE&startDate=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Find all actions by a specific admin user
curl -X GET "http://localhost:3000/admin/audit/logs?userId=admin-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Development Workflow

#### 1. Use the Swagger UI for Exploration

The interactive Swagger UI is available at http://localhost:3000/admin/api-docs and provides:
- Complete API documentation
- Request/response examples
- Try-it-out functionality
- Schema definitions

#### 2. Validate Input Before Sending

Implement client-side validation to catch errors early:

```typescript
function validatePersonaData(data: CreatePersonaDto): string[] {
  const errors: string[] = [];
  
  if (!data.id || !/^[a-z0-9-]+$/.test(data.id)) {
    errors.push('ID must contain only lowercase letters, numbers, and hyphens');
  }
  
  if (data.temperature < 0 || data.temperature > 1) {
    errors.push('Temperature must be between 0 and 1');
  }
  
  if (data.maxTokens <= 0) {
    errors.push('Max tokens must be a positive integer');
  }
  
  return errors;
}
```

#### 3. Handle Errors Gracefully

Provide clear error messages to users:

```typescript
try {
  await createPersona(personaData);
  showSuccessMessage('Persona created successfully');
} catch (error) {
  if (error instanceof ValidationError) {
    showValidationErrors(error.errors);
  } else if (error instanceof ConflictError) {
    showErrorMessage('A persona with this ID already exists');
  } else {
    showErrorMessage('Failed to create persona. Please try again.');
  }
}
```

#### 4. Implement Optimistic Updates

For better UX, update the UI optimistically and rollback on error:

```typescript
async function deleteDocument(id: string) {
  // Optimistically remove from UI
  removeDocumentFromUI(id);
  
  try {
    await fetch(`http://localhost:3000/admin/knowledge/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    showSuccessMessage('Document deleted');
  } catch (error) {
    // Rollback on error
    addDocumentToUI(id);
    showErrorMessage('Failed to delete document');
  }
}
```

#### 5. Use TypeScript for Type Safety

Define TypeScript interfaces for API requests and responses:

```typescript
interface CreatePersonaDto {
  id: string;
  name: string;
  description: string;
  extraInstructions?: string;
  knowledgeCategory: string;
  temperature: number;
  maxTokens: number;
}

interface Persona extends CreatePersonaDto {
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{ field: string; message: string }>;
}
```

---

## Additional Resources

### Documentation

- **API Usage Examples:** [ADMIN_API_EXAMPLES.md](./ADMIN_API_EXAMPLES.md) - Comprehensive curl examples for all endpoints
- **Error Format Specification:** [docs/RFC7807_ERROR_FORMAT.md](./docs/RFC7807_ERROR_FORMAT.md) - Detailed error response format documentation
- **Security Setup Guide:** [docs/SECURITY_SETUP.md](./docs/SECURITY_SETUP.md) - Authentication, CORS, and secrets management
- **Deployment Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment instructions
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Database migration instructions

### Interactive Tools

- **Swagger UI:** http://localhost:3000/admin/api-docs - Interactive API documentation with try-it-out functionality

### Support

For issues or questions about the Admin API:
- Review the documentation in the `docs/` directory
- Check the project issue tracker
- Contact your system administrator or development team

---

## Changelog

### Version 1.0.0 (2024-01-15)

**Initial Release**

- Persona management endpoints (CRUD operations)
- Knowledge document management endpoints (upload, delete, bulk operations)
- Knowledge category management endpoints
- Ingestion pipeline monitoring endpoints
- Audit log endpoints
- JWT authentication
- RFC 7807 error format
- Swagger UI documentation
- Comprehensive validation
- Audit logging for all administrative actions

---

**Last Updated:** 2024-01-15  
**API Version:** 1.0.0  
**Maintained By:** Purpose-Agnostic Agent Development Team

