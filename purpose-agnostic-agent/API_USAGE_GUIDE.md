# API Usage Guide - Chat Endpoint

## Chat API Request Format

### Endpoint
```
POST http://localhost:3000/api/chat
```

### Headers
```json
{
  "x-api-key": "pak_dev_key_12345",
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "agent_id": "general-assistant",
  "question": "How do I reset my password?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Field Descriptions

### Required Fields

#### `agent_id` (string, required)
- **Description**: The unique identifier of the agent persona to query
- **Max Length**: 100 characters
- **Available Options**:
  - `general-assistant` - General purpose assistant
  - `technical-expert` - Technical and programming expert
  - `creative-writer` - Creative writing assistant
  - `tech-support` - Technical support specialist
- **Example**: `"general-assistant"`

#### `question` (string, required)
- **Description**: The question to ask the agent
- **Max Length**: 5000 characters
- **Example**: `"How do I reset my password?"`

### Optional Fields

#### `sessionId` (string, optional)
- **Description**: UUID for conversation continuity (maintains chat history)
- **Format**: Must be a valid UUID v4
- **Example**: `"550e8400-e29b-41d4-a716-446655440000"`

## What is Session ID?

### Purpose
The `sessionId` allows you to maintain conversation context across multiple chat requests. It's like having a continuous conversation with the agent.

### How It Works

**First Request (No Session ID):**
```json
{
  "agent_id": "general-assistant",
  "question": "What is a REST API?"
}
```
**Response includes a new session ID:**
```json
{
  "answer": "...",
  "sessionId": "ca1de179-2009-4a7a-a3e5-3a2a431056ae",
  "modelUsed": "gemini-pro",
  "citations": []
}
```

**Follow-up Request (With Session ID):**
```json
{
  "agent_id": "general-assistant",
  "question": "Can you give me an example?",
  "sessionId": "ca1de179-2009-4a7a-a3e5-3a2a431056ae"
}
```

The agent now has context from the previous conversation and knows you're asking for an example of a REST API.

### When to Use Session ID

✅ **Use Session ID when:**
- You want to maintain conversation context
- You're building a chat interface with multiple messages
- You want the agent to remember previous questions/answers
- You're implementing a multi-turn conversation

❌ **Don't use Session ID when:**
- Each question is independent
- You want a fresh conversation
- You're testing different personas
- You don't need conversation history

### Session ID Behavior

1. **Omit `sessionId`**: System creates a new session automatically
2. **Provide `sessionId`**: System retrieves existing session and adds to conversation history
3. **Invalid `sessionId`**: Returns 404 error "Session not found"

## Complete Examples

### Example 1: Simple Question (No Session)
```powershell
$headers = @{ 
  "x-api-key" = "pak_dev_key_12345"
  "Content-Type" = "application/json" 
}

$body = @{
  agent_id = "general-assistant"
  question = "What is Docker?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -Headers $headers `
  -Body $body `
  -ContentType "application/json"

Write-Host "Answer: $($response.answer)"
Write-Host "Session ID: $($response.sessionId)"
```

### Example 2: Conversation with Session
```powershell
# First message
$body1 = @{
  agent_id = "technical-expert"
  question = "Explain microservices"
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -Headers $headers `
  -Body $body1 `
  -ContentType "application/json"

$sessionId = $response1.sessionId
Write-Host "Session ID: $sessionId"

# Follow-up message (uses same session)
$body2 = @{
  agent_id = "technical-expert"
  question = "What are the benefits?"
  sessionId = $sessionId
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -Headers $headers `
  -Body $body2 `
  -ContentType "application/json"

Write-Host "Answer: $($response2.answer)"
```

### Example 3: Using cURL
```bash
# First request (no session)
curl -X POST http://localhost:3000/api/chat \
  -H "x-api-key: pak_dev_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "What is Kubernetes?"
  }'

# Follow-up request (with session)
curl -X POST http://localhost:3000/api/chat \
  -H "x-api-key: pak_dev_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "general-assistant",
    "question": "How does it differ from Docker?",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

## Response Format

```json
{
  "answer": "The agent's response to your question",
  "sessionId": "ca1de179-2009-4a7a-a3e5-3a2a431056ae",
  "modelUsed": "gemini-pro",
  "citations": [
    {
      "sourcePath": "knowledge/general/document.txt",
      "content": "Relevant excerpt from knowledge base",
      "score": 0.85
    }
  ]
}
```

### Response Fields

- **`answer`**: The agent's response to your question
- **`sessionId`**: UUID for this conversation (use in follow-up requests)
- **`modelUsed`**: Which LLM model generated the response (e.g., "gemini-pro")
- **`citations`**: Array of knowledge base sources used to generate the answer
  - `sourcePath`: File path of the source document
  - `content`: Relevant excerpt from the document
  - `score`: Relevance score (0-1, higher is more relevant)

## Error Responses

### 404 - Persona Not Found
```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Not Found",
  "status": 404,
  "detail": "Persona with agent_id 'invalid-id' not found",
  "instance": "/api/chat"
}
```

### 404 - Session Not Found
```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Not Found",
  "status": 404,
  "detail": "Session '550e8400-e29b-41d4-a716-446655440000' not found",
  "instance": "/api/chat"
}
```

### 400 - Validation Error
```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Bad Request",
  "status": 400,
  "detail": [
    "agent_id should not be empty",
    "question must be shorter than or equal to 5000 characters"
  ],
  "instance": "/api/chat"
}
```

### 401 - Unauthorized
```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid API key",
  "instance": "/api/chat"
}
```

## Best Practices

1. **Store Session IDs**: Save the `sessionId` from responses to maintain conversation context
2. **Handle Errors**: Check for 404 errors when using old session IDs
3. **Validate Input**: Ensure questions are under 5000 characters
4. **Use Appropriate Personas**: Choose the right `agent_id` for your use case
5. **Check Citations**: Review the `citations` array to see which knowledge sources were used
6. **Monitor Model Usage**: Track `modelUsed` to understand which LLM is responding

## Testing Tips

### Test Without Session (Independent Questions)
```powershell
$questions = @(
  "What is Docker?",
  "What is Kubernetes?",
  "What is a REST API?"
)

foreach ($q in $questions) {
  $body = @{ agent_id = "technical-expert"; question = $q } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
    -Method Post -Headers $headers -Body $body -ContentType "application/json"
  Write-Host "Q: $q"
  Write-Host "A: $($response.answer)`n"
}
```

### Test With Session (Conversation Flow)
```powershell
$sessionId = $null

$questions = @(
  "What is Docker?",
  "What are its main benefits?",
  "How do I install it?"
)

foreach ($q in $questions) {
  $body = @{ 
    agent_id = "technical-expert"
    question = $q
  }
  
  if ($sessionId) {
    $body.sessionId = $sessionId
  }
  
  $bodyJson = $body | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
    -Method Post -Headers $headers -Body $bodyJson -ContentType "application/json"
  
  $sessionId = $response.sessionId
  Write-Host "Q: $q"
  Write-Host "A: $($response.answer)"
  Write-Host "Session: $sessionId`n"
}
```

## Summary

- **`agent_id`**: Required - Which persona to use
- **`question`**: Required - Your question (max 5000 chars)
- **`sessionId`**: Optional - UUID for conversation continuity
  - Omit for new conversations
  - Include for follow-up questions
  - System returns it in every response
  - Use it to maintain context across multiple requests


---

## Admin API Documentation

For administrative operations such as managing personas, knowledge documents, categories, and monitoring, see the **Admin API** documentation:

- **[Admin API Examples & Usage Guide](ADMIN_API_EXAMPLES.md)** - Comprehensive curl examples for all admin endpoints
- **[RFC 7807 Error Format](docs/RFC7807_ERROR_FORMAT.md)** - Detailed error response format documentation
- **[Interactive Swagger Documentation](http://localhost:3000/admin/api-docs)** - Try the API directly in your browser

### Admin API Features

The Admin API provides:
- **Persona Management**: Create, update, delete, and test personas
- **Knowledge Document Management**: Upload, delete, and organize knowledge documents
- **Category Management**: Create and manage knowledge categories
- **Monitoring**: Track ingestion pipeline status and statistics
- **Audit Logs**: View all administrative actions with filtering

All admin endpoints require JWT authentication. See the [Admin API Examples](ADMIN_API_EXAMPLES.md) for authentication details.
