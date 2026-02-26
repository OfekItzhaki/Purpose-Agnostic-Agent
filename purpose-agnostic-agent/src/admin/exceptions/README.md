# Admin Exception Classes

This directory contains custom exception classes for the admin module, providing consistent error handling across admin services and controllers.

## Available Exceptions

### AdminAuthenticationException
- **Extends**: `UnauthorizedException` (HTTP 401)
- **Use for**: Authentication failures, invalid credentials, expired tokens, missing authentication
- **Example**:
  ```typescript
  throw new AdminAuthenticationException('Invalid admin credentials');
  ```

### AdminValidationException
- **Extends**: `BadRequestException` (HTTP 400)
- **Use for**: Input validation errors, malformed requests, constraint violations
- **Example**:
  ```typescript
  throw new AdminValidationException('Temperature must be between 0.0 and 1.0');
  ```

### AdminResourceNotFoundException
- **Extends**: `NotFoundException` (HTTP 404)
- **Use for**: Missing personas, knowledge documents, categories, or other entities
- **Example**:
  ```typescript
  throw new AdminResourceNotFoundException(`Persona with id '${id}' not found`);
  ```

### AdminConflictException
- **Extends**: `ConflictException` (HTTP 409)
- **Use for**: Duplicate resources, name conflicts, constraint violations
- **Example**:
  ```typescript
  throw new AdminConflictException(`Category with name '${name}' already exists`);
  ```

## Usage

Import the exceptions from the index file:

```typescript
import {
  AdminAuthenticationException,
  AdminValidationException,
  AdminResourceNotFoundException,
  AdminConflictException,
} from '../exceptions/index.js';
```

## Requirements Mapping

These exceptions support the following requirements:
- **Requirement 1.3**: Authentication error handling
- **Requirement 2.2**: Persona duplicate ID validation
- **Requirement 8.4**: Persona configuration validation
- **Requirement 10.4**: API unauthorized request handling
- **Requirement 10.6**: API validation rules

## Testing

All exception classes are tested in `admin-exceptions.spec.ts` with coverage for:
- Default and custom messages
- Correct HTTP status codes
- Proper inheritance chain
- Exception name properties
