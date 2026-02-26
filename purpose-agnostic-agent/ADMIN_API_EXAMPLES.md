# Admin API Usage Examples

This document provides comprehensive examples for using the Admin API, including curl commands, request/response examples, and error handling documentation.

## Quick Links

- **Interactive API Documentation (Swagger UI):** http://localhost:3000/admin/api-docs
- **Authentication Guide:** See `docs/SECURITY_SETUP.md`
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md`

## Table of Contents

- [Authentication](#authentication)
- [Persona Management](#persona-management)
- [Knowledge Document Management](#knowledge-document-management)
- [Category Management](#category-management)
- [Monitoring & Statistics](#monitoring--statistics)
- [Audit Logs](#audit-logs)
- [Error Response Format](#error-response-format)

---

## Authentication

All admin API endpoints require authentication via JWT Bearer token.

### Login

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

### Using the Token

Include the token in the `Authorization` header for all subsequent requests:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Persona Management

### List All Personas

**Endpoint:** `GET /admin/personas`

**Request:**
```bash
curl -X GET "http://localhost:3000/admin/personas?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "personas": [
    {
      "id": "tech-support",
      "name": "Technical Support Agent",
      "description": "Helps users with technical issues and troubleshooting",
      "knowledgeCategory": "support",
      "temperature": 0.7,
      "maxTokens": 2000
    },
    {
      "id": "sales-assistant",
      "name": "Sales Assistant",
      "description": "Assists customers with product information",
      "knowledgeCategory": "sales",
      "temperature": 0.8,
      "maxTokens": 1500
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### Get Persona Details

**Endpoint:** `GET /admin/personas/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/personas/tech-support \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "id": "tech-support",
  "name": "Technical Support Agent",
  "description": "Helps users with technical issues and troubleshooting",
  "extraInstructions": "Be concise and technical. Use bullet points when appropriate.",
  "knowledgeCategory": "support",
  "temperature": 0.7,
  "maxTokens": 2000,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Create Persona

**Endpoint:** `POST /admin/personas`

**Request:**
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

**Response (201 Created):**
```json
{
  "id": "tech-support",
  "name": "Technical Support Agent",
  "description": "Helps users with technical issues and troubleshooting",
  "extraInstructions": "Be concise and technical. Use bullet points when appropriate.",
  "knowledgeCategory": "support",
  "temperature": 0.7,
  "maxTokens": 2000,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Response (400 Bad Request - Validation Error):**
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

**Error Response (409 Conflict):**
```json
{
  "type": "https://api.example.com/errors/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "Persona with id 'tech-support' already exists",
  "instance": "/admin/personas"
}
```

### Update Persona

**Endpoint:** `PUT /admin/personas/:id`

**Request:**
```bash
curl -X PUT http://localhost:3000/admin/personas/tech-support \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 0.8,
    "maxTokens": 2500
  }'
```

**Response (200 OK):**
```json
{
  "id": "tech-support",
  "name": "Technical Support Agent",
  "description": "Helps users with technical issues and troubleshooting",
  "extraInstructions": "Be concise and technical. Use bullet points when appropriate.",
  "knowledgeCategory": "support",
  "temperature": 0.8,
  "maxTokens": 2500,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z"
}
```

### Delete Persona

**Endpoint:** `DELETE /admin/personas/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/personas/tech-support \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Persona 'tech-support' deleted successfully",
  "id": "tech-support"
}
```

**Error Response (400 Bad Request - Persona In Use):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Cannot delete persona 'tech-support' as it is currently in use by 3 active chat session(s)",
  "instance": "/admin/personas/tech-support"
}
```

### Test Persona

**Endpoint:** `POST /admin/personas/:id/test`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/personas/tech-support/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I deploy a Kubernetes cluster?"
  }'
```

**Response (200 OK):**
```json
{
  "answer": "To deploy a Kubernetes cluster, you need to follow these steps:\n\n1. Install kubectl and kubeadm\n2. Initialize the control plane with kubeadm init\n3. Configure your network plugin\n4. Join worker nodes to the cluster\n\nFor detailed instructions, refer to the official Kubernetes documentation.",
  "retrievedChunks": [
    {
      "content": "Kubernetes is a container orchestration platform that automates deployment, scaling, and management of containerized applications...",
      "sourcePath": "knowledge/general/kubernetes-guide.txt",
      "category": "general",
      "relevanceScore": 0.89
    },
    {
      "content": "To initialize a Kubernetes cluster, use the kubeadm init command. This will set up the control plane components...",
      "sourcePath": "knowledge/general/kubernetes-setup.txt",
      "category": "general",
      "relevanceScore": 0.85
    }
  ],
  "modelProvider": "openai/gpt-4",
  "tokensUsed": 450,
  "latencyMs": 1250
}
```

---

## Knowledge Document Management

### List Documents

**Endpoint:** `GET /admin/knowledge/documents`

**Request (All Documents):**
```bash
curl -X GET http://localhost:3000/admin/knowledge/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Request (Filter by Category):**
```bash
curl -X GET "http://localhost:3000/admin/knowledge/documents?category=general" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Request (Search):**
```bash
curl -X GET "http://localhost:3000/admin/knowledge/documents?search=kubernetes" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "doc-123",
    "sourcePath": "knowledge/general/kubernetes-guide.txt",
    "category": "general",
    "chunkCount": 25,
    "ingestedAt": "2024-01-15T10:30:00Z",
    "status": "COMPLETED"
  },
  {
    "id": "doc-456",
    "sourcePath": "knowledge/general/troubleshooting.pdf",
    "category": "general",
    "chunkCount": 42,
    "ingestedAt": "2024-01-14T15:20:00Z",
    "status": "COMPLETED"
  }
]
```

### Get Document Details

**Endpoint:** `GET /admin/knowledge/documents/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/knowledge/documents/doc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "id": "doc-123",
  "sourcePath": "knowledge/general/kubernetes-guide.txt",
  "category": "general",
  "chunkCount": 25,
  "ingestedAt": "2024-01-15T10:30:00Z",
  "status": "COMPLETED",
  "metadata": {
    "fileSize": 15360,
    "mimeType": "text/plain"
  }
}
```

### Upload Single Document

**Endpoint:** `POST /admin/knowledge/documents/upload`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "category=general"
```

**Response (201 Created):**
```json
{
  "success": true,
  "jobId": "12345",
  "filePath": "uploads/documents/1234567890_document.pdf"
}
```

**Error Response (400 Bad Request - File Too Large):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "File size exceeds maximum limit of 10MB",
  "instance": "/admin/knowledge/documents/upload"
}
```

### Bulk Upload Documents

**Endpoint:** `POST /admin/knowledge/documents/bulk-upload`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/bulk-upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/doc2.txt" \
  -F "files=@/path/to/doc3.md" \
  -F "category=general"
```

**Response (201 Created):**
```json
{
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "filename": "doc1.pdf",
      "success": true,
      "jobId": "12345"
    },
    {
      "filename": "doc2.txt",
      "success": true,
      "jobId": "12346"
    },
    {
      "filename": "doc3.md",
      "success": false,
      "error": "Invalid file format"
    }
  ]
}
```

### Delete Document

**Endpoint:** `DELETE /admin/knowledge/documents/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/knowledge/documents/doc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Document 'doc-123' deleted successfully",
  "id": "doc-123"
}
```

### Bulk Delete Documents

**Endpoint:** `POST /admin/knowledge/documents/bulk-delete`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/knowledge/documents/bulk-delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": ["doc-123", "doc-456", "doc-789"]
  }'
```

**Response (200 OK):**
```json
{
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "id": "doc-123",
      "success": true
    },
    {
      "id": "doc-456",
      "success": true
    },
    {
      "id": "doc-789",
      "success": false,
      "error": "Document not found"
    }
  ]
}
```

### Bulk Reassign Category

**Endpoint:** `PUT /admin/knowledge/documents/bulk-reassign`

**Request:**
```bash
curl -X PUT http://localhost:3000/admin/knowledge/documents/bulk-reassign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": ["doc-123", "doc-456"],
    "newCategory": "technical"
  }'
```

**Response (200 OK):**
```json
{
  "successCount": 2,
  "failureCount": 0,
  "results": [
    {
      "id": "doc-123",
      "success": true
    },
    {
      "id": "doc-456",
      "success": true
    }
  ]
}
```

### Get Knowledge Statistics

**Endpoint:** `GET /admin/knowledge/statistics`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/knowledge/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "total_documents": 150,
  "total_chunks": 3500,
  "documents_by_category": {
    "general": 80,
    "technical": 50,
    "support": 20
  },
  "chunks_by_category": {
    "general": 1800,
    "technical": 1200,
    "support": 500
  },
  "recent_documents": [
    {
      "id": "doc-150",
      "source_path": "/knowledge/general/latest-guide.pdf",
      "category": "general",
      "ingested_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

## Category Management

### List Categories

**Endpoint:** `GET /admin/categories`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "cat-123",
    "name": "general",
    "description": "General knowledge and documentation",
    "documentCount": 80,
    "createdAt": "2024-01-10T09:00:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "cat-456",
    "name": "technical",
    "description": "Technical documentation and guides",
    "documentCount": 50,
    "createdAt": "2024-01-10T09:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
]
```

### Create Category

**Endpoint:** `POST /admin/categories`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "technical",
    "description": "Technical documentation and guides"
  }'
```

**Response (201 Created):**
```json
{
  "id": "cat-123",
  "name": "technical",
  "description": "Technical documentation and guides",
  "documentCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Response (400 Bad Request - Invalid Name):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Category name must contain only alphanumeric characters and hyphens",
  "instance": "/admin/categories"
}
```

### Delete Category

**Endpoint:** `DELETE /admin/categories/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/categories/cat-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Category 'technical' deleted successfully",
  "id": "cat-123"
}
```

**Error Response (400 Bad Request - Category Has Documents):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Cannot delete category 'general' because it has 5 associated document(s). Please delete or reassign the documents first.",
  "instance": "/admin/categories/cat-123"
}
```

---

## Monitoring & Statistics

### Get Ingestion Queue Status

**Endpoint:** `GET /admin/monitoring/ingestion/status`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/monitoring/ingestion/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
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

### Get Processing Statistics

**Endpoint:** `GET /admin/monitoring/ingestion/statistics`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/monitoring/ingestion/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "total_processed": 150,
  "average_processing_time_ms": 2500,
  "min_processing_time_ms": 500,
  "max_processing_time_ms": 8000,
  "statistics_by_type": {
    "PDF": {
      "count": 80,
      "average_time_ms": 3200
    },
    "Text": {
      "count": 50,
      "average_time_ms": 1500
    },
    "Markdown": {
      "count": 20,
      "average_time_ms": 2000
    }
  }
}
```

### Get Failed Ingestions

**Endpoint:** `GET /admin/monitoring/ingestion/failed`

**Request:**
```bash
curl -X GET http://localhost:3000/admin/monitoring/ingestion/failed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": "doc-123",
    "source_path": "/knowledge/general/corrupted-file.pdf",
    "category": "general",
    "error_message": "Failed to parse PDF: Invalid PDF structure",
    "retry_count": 2,
    "failed_at": "2024-01-15T10:30:00Z"
  }
]
```

### Retry Failed Ingestion

**Endpoint:** `POST /admin/monitoring/ingestion/retry/:id`

**Request:**
```bash
curl -X POST http://localhost:3000/admin/monitoring/ingestion/retry/doc-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Document re-queued for ingestion",
  "jobId": "12345"
}
```

**Error Response (400 Bad Request - Max Retries Reached):**
```json
{
  "success": false,
  "message": "Maximum retry attempts (3) reached for this document"
}
```

---

## Audit Logs

### Get Audit Logs

**Endpoint:** `GET /admin/audit/logs`

**Request (All Logs):**
```bash
curl -X GET http://localhost:3000/admin/audit/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Request (Filtered by Action Type):**
```bash
curl -X GET "http://localhost:3000/admin/audit/logs?actionType=PERSONA_CREATE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Request (Filtered by Date Range):**
```bash
curl -X GET "http://localhost:3000/admin/audit/logs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
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
    },
    {
      "id": "log-124",
      "adminUserId": "admin-456",
      "actionType": "KNOWLEDGE_UPLOAD",
      "entityType": "KNOWLEDGE_DOCUMENT",
      "entityId": "doc-789",
      "details": {
        "filename": "kubernetes-guide.pdf",
        "category": "general"
      },
      "ipAddress": "192.168.1.100",
      "timestamp": "2024-01-15T11:15:00Z"
    }
  ],
  "total": 2
}
```

---

## Error Response Format

All error responses follow the **RFC 7807 Problem Details** standard format.

### Error Response Structure

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

### Error Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | URI reference identifying the error type |
| `title` | string | Yes | Short, human-readable summary of the error |
| `status` | number | Yes | HTTP status code |
| `detail` | string | Yes | Detailed explanation of the error |
| `instance` | string | Yes | URI reference identifying the specific occurrence |
| `errors` | array | No | Array of field-level validation errors (for 400 responses) |

### Common Error Types

#### 400 Bad Request - Validation Error
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
    }
  ]
}
```

#### 401 Unauthorized - Authentication Error
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
```json
{
  "type": "https://api.example.com/errors/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your request",
  "instance": "/admin/personas"
}
```

### Handling Errors in Your Application

When consuming the Admin API, always check the HTTP status code and parse the error response body to provide meaningful feedback to users.

**Example (JavaScript/TypeScript):**
```typescript
try {
  const response = await fetch('http://localhost:3000/admin/personas', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(personaData),
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Handle validation errors
    if (error.status === 400 && error.errors) {
      error.errors.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    } else {
      console.error(`${error.title}: ${error.detail}`);
    }
    
    throw new Error(error.detail);
  }

  const persona = await response.json();
  console.log('Persona created:', persona);
} catch (err) {
  console.error('Failed to create persona:', err);
}
```

---

## Additional Resources

- **Swagger UI:** Access the interactive API documentation at `http://localhost:3000/admin/api-docs`
- **Authentication Guide:** See `docs/SECURITY_SETUP.md` for details on admin user setup
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md` for production deployment instructions

---

## Support

For issues or questions about the Admin API, please refer to:
- Project documentation in the `docs/` directory
- Issue tracker on the project repository
- System administrator or development team
