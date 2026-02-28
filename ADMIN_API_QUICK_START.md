# Admin API Quick Start Guide

## Step 1: Login to Get JWT Token

```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Save the token** - you'll need it for all subsequent requests!

## Step 2: Use the Token in Requests

Add the token to the `Authorization` header:

```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

## Common Admin API Operations

### List All Personas
```bash
curl -X GET http://localhost:3000/api/admin/personas \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Persona Details
```bash
curl -X GET http://localhost:3000/api/admin/personas/tech-support \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create New Persona
```bash
curl -X POST http://localhost:3000/api/admin/personas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sales-agent",
    "name": "Sales Agent",
    "description": "Helps with sales inquiries",
    "extraInstructions": "Be persuasive and helpful",
    "knowledgeCategory": "sales",
    "temperature": 0.7,
    "maxTokens": 1500
  }'
```

### Upload Knowledge Document
```bash
curl -X POST http://localhost:3000/api/admin/knowledge/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "category=support"
```

### List Knowledge Categories
```bash
curl -X GET http://localhost:3000/api/admin/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Knowledge Category
```bash
curl -X POST http://localhost:3000/api/admin/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sales",
    "description": "Sales and marketing materials"
  }'
```

### Get Ingestion Queue Status
```bash
curl -X GET http://localhost:3000/api/admin/monitoring/ingestion/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Knowledge Base Statistics
```bash
curl -X GET http://localhost:3000/api/admin/monitoring/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Audit Logs
```bash
curl -X GET http://localhost:3000/api/admin/audit/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Using Swagger UI (Easier!)

1. Open http://localhost:3000/admin/api-docs in your browser
2. Click the "Authorize" button at the top
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize"
5. Now you can test all endpoints interactively!

## Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

## Available Endpoints

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Auth | `/api/admin/auth/login` | POST | Get JWT token |
| Personas | `/api/admin/personas` | GET | List all personas |
| Personas | `/api/admin/personas/:id` | GET | Get persona details |
| Personas | `/api/admin/personas` | POST | Create persona |
| Personas | `/api/admin/personas/:id` | PUT | Update persona |
| Personas | `/api/admin/personas/:id` | DELETE | Delete persona |
| Personas | `/api/admin/personas/:id/test` | POST | Test persona |
| Knowledge | `/api/admin/knowledge/documents` | GET | List documents |
| Knowledge | `/api/admin/knowledge/documents/upload` | POST | Upload document |
| Knowledge | `/api/admin/knowledge/documents/:id` | DELETE | Delete document |
| Categories | `/api/admin/categories` | GET | List categories |
| Categories | `/api/admin/categories` | POST | Create category |
| Monitoring | `/api/admin/monitoring/ingestion/status` | GET | Queue status |
| Monitoring | `/api/admin/monitoring/statistics` | GET | KB statistics |
| Audit | `/api/admin/audit/logs` | GET | View audit logs |

## Tips

1. **Token expires in 1 hour** - you'll need to login again after that
2. **Use Swagger UI** for easier testing - it's interactive!
3. **Check audit logs** to see all admin actions
4. **Monitor ingestion** to track document processing

## Next Steps

1. Login and get your token
2. Open Swagger UI: http://localhost:3000/admin/api-docs
3. Click "Authorize" and paste your token
4. Start managing personas and knowledge!
