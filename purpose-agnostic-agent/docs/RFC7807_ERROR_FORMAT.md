# RFC 7807 Error Response Format

The Admin API uses the **RFC 7807 Problem Details for HTTP APIs** standard for all error responses.

## Standard Error Response Structure

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

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | URI reference identifying the error type. Used for programmatic error handling. |
| `title` | string | Yes | Short, human-readable summary of the error type. |
| `status` | number | Yes | HTTP status code (same as response status). |
| `detail` | string | Yes | Detailed explanation of this specific error occurrence. |
| `instance` | string | Yes | URI reference identifying the specific request that caused the error. |
| `errors` | array | No | Array of field-level validation errors (only present for 400 validation errors). |

## Error Types by Status Code

### 400 Bad Request
**Type:** `https://api.example.com/errors/validation-error`  
**Title:** `Validation Error`  
**Use Case:** Request validation failed (invalid input, missing required fields, constraint violations)

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

### 401 Unauthorized
**Type:** `https://api.example.com/errors/authentication-error`  
**Title:** `Authentication Error`  
**Use Case:** Missing, invalid, or expired authentication token

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

### 403 Forbidden
**Type:** `https://api.example.com/errors/authorization-error`  
**Title:** `Authorization Error`  
**Use Case:** Authenticated but lacks permission for the requested operation

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

### 404 Not Found
**Type:** `https://api.example.com/errors/not-found`  
**Title:** `Resource Not Found`  
**Use Case:** Requested resource does not exist

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

### 409 Conflict
**Type:** `https://api.example.com/errors/conflict`  
**Title:** `Resource Conflict`  
**Use Case:** Request conflicts with current state (duplicate resource, constraint violation)

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

### 429 Too Many Requests
**Type:** `https://api.example.com/errors/rate-limit-exceeded`  
**Title:** `Rate Limit Exceeded`  
**Use Case:** Client has exceeded rate limits

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

### 500 Internal Server Error
**Type:** `https://api.example.com/errors/internal-server-error`  
**Title:** `Internal Server Error`  
**Use Case:** Unexpected server error

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

## Client Implementation Guidelines

### 1. Always Check HTTP Status Code First

```typescript
if (!response.ok) {
  const error = await response.json();
  // Handle error based on status code
}
```

### 2. Use the `type` Field for Programmatic Error Handling

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

### 3. Display the `detail` Field to Users

The `detail` field contains a human-readable explanation suitable for display to end users.

```typescript
showErrorToast(error.detail);
```

### 4. Log the Full Error for Debugging

```typescript
console.error('API Error:', {
  type: error.type,
  status: error.status,
  detail: error.detail,
  instance: error.instance,
  errors: error.errors,
});
```

### 5. Handle Validation Errors Specially

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

## Complete Example

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

## Benefits of RFC 7807

1. **Standardized Format:** Consistent error structure across all endpoints
2. **Machine-Readable:** The `type` field enables programmatic error handling
3. **Human-Readable:** The `detail` field provides clear error messages
4. **Extensible:** Additional fields can be added without breaking clients
5. **Debuggable:** The `instance` field helps trace errors to specific requests
6. **Field-Level Errors:** Validation errors include field-specific details

## References

- [RFC 7807 Specification](https://tools.ietf.org/html/rfc7807)
- [Admin API Examples](../ADMIN_API_EXAMPLES.md)
- [Swagger Documentation](http://localhost:3000/admin/api-docs)
